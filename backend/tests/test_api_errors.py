"""Error handling, request-size limit and OpenAPI error schema.

Expected values here are hard-coded on purpose (limits, status codes, messages) so that a
wrong constant in the implementation cannot silently move the test with it.
"""

import asyncio
import json

import pytest
from fastapi.testclient import TestClient
from starlette.exceptions import HTTPException

from app.core.config import Settings
from app.core.errors import ClientError, ErrorDetail, ErrorResponse, error_response
from app.core.limits import BodySizeLimitMiddleware
from app.main import app, create_app

client = TestClient(app)
JSON = {"Content-Type": "application/json"}
BASE = "/api/v1/algebra"
BS = "\\"  # one backslash, used to spell JSON \uXXXX escapes without Python interpreting them

ENDPOINTS = [
    f"{BASE}/caesar/encrypt",
    f"{BASE}/caesar/decrypt",
    f"{BASE}/affine/encrypt",
    f"{BASE}/affine/decrypt",
]
MAX_BODY = 262_144  # 256 KiB, the documented request-body limit


def _forbid_constant(name):
    raise AssertionError(f"response contains non-JSON constant {name}")


def uniform_error(response, status, *, loc=None, error_type=None):
    """Assert the one error shape every client error must have; return its detail list."""
    assert response.status_code == status, response.text
    assert response.headers["content-type"].startswith("application/json")
    response.content.decode("ascii")  # the body is always plain ASCII, so always writable
    body = json.loads(response.content, parse_constant=_forbid_constant)
    assert list(body) == ["detail"]
    detail = body["detail"]
    assert isinstance(detail, list) and detail
    for item in detail:
        assert set(item) == {"loc", "msg", "type"}
        assert isinstance(item["loc"], list)
        assert all(isinstance(part, (str, int)) for part in item["loc"])
        assert isinstance(item["msg"], str) and item["msg"]
        assert isinstance(item["type"], str) and item["type"]
    if loc is not None:
        assert detail[0]["loc"] == loc
    if error_type is not None:
        assert detail[0]["type"] == error_type
    return detail


def post_raw(path, body, headers=JSON, c=client):
    if isinstance(body, str):
        body = body.encode("utf-8")
    return c.post(path, content=body, headers=headers)


class TestNanAndInfinity:
    @pytest.mark.parametrize("constant", ["NaN", "Infinity", "-Infinity"])
    def test_caesar_key(self, constant):
        response = post_raw(f"{BASE}/caesar/encrypt", '{"text":"a","key":%s}' % constant)

        detail = uniform_error(response, 422, loc=["body", "key"], error_type="int_type")
        assert constant.lstrip("-") not in response.text  # the value is not echoed

    @pytest.mark.parametrize("field", ["a", "b"])
    @pytest.mark.parametrize("constant", ["NaN", "Infinity", "-Infinity"])
    @pytest.mark.parametrize("op", ["encrypt", "decrypt"])
    def test_affine_keys(self, field, constant, op):
        payload = '{"text":"a","a":5,"b":1,"%s":%s}' % (field, constant)
        response = post_raw(f"{BASE}/affine/{op}", payload)

        uniform_error(response, 422, loc=["body", field], error_type="int_type")

    @pytest.mark.parametrize("constant", ["NaN", "Infinity"])
    def test_text(self, constant):
        response = post_raw(f"{BASE}/caesar/encrypt", '{"text":%s,"key":1}' % constant)

        uniform_error(response, 422, loc=["body", "text"], error_type="string_type")

    def test_nan_in_an_unknown_field(self):
        response = post_raw(f"{BASE}/caesar/encrypt", '{"text":"a","key":1,"x":NaN}')

        uniform_error(response, 422, loc=["body", "x"], error_type="extra_forbidden")


class TestLoneSurrogates:
    HIGH = BS + "ud800"
    LOW = BS + "udc00"

    @pytest.mark.parametrize("escape", [HIGH, LOW])
    @pytest.mark.parametrize("path", ENDPOINTS)
    def test_unpaired_surrogate_in_text_is_a_422_not_a_500(self, path, escape):
        key = '"key":1' if "caesar" in path else '"a":5,"b":1'
        response = post_raw(path, '{"text":"ab%sc",%s}' % (escape, key))

        uniform_error(response, 422, loc=["body", "text"])
        assert "ud800" not in response.text and "udc00" not in response.text

    @pytest.mark.parametrize("escape", [HIGH, LOW])
    def test_unpaired_surrogate_in_an_unknown_field_name(self, escape):
        response = post_raw(f"{BASE}/caesar/encrypt", '{"text":"a","key":1,"%s":1}' % escape)

        # Pydantic reports the unpaired surrogate itself (the exact error type is its choice);
        # what matters is a clean 422 in the uniform shape rather than a crash.
        detail = uniform_error(response, 422)
        assert detail[0]["loc"][0] == "body"
        assert "ud800" not in response.text and "udc00" not in response.text

    def test_a_valid_surrogate_pair_is_accepted(self):
        response = post_raw(f"{BASE}/caesar/encrypt", '{"text":"%sud83d%sude00a","key":1}' % (BS, BS))

        assert response.status_code == 200
        assert response.json()["output"] == "\U0001f600b"

    def test_non_ascii_field_names_do_not_break_the_response(self):
        body = json.dumps({"text": "a", "key": 1, "\U0001f600日": 1}, ensure_ascii=False)
        response = post_raw(f"{BASE}/caesar/encrypt", body)

        uniform_error(response, 422, error_type="extra_forbidden")


class TestInputIsNeverEchoed:
    def test_oversized_text_is_not_reflected(self):
        marker = "ZXQ-SECRET-MARKER"
        text = marker * 800  # 13,600 characters, over the 10,000 limit
        response = client.post(f"{BASE}/caesar/encrypt", json={"text": text, "key": 1})

        detail = uniform_error(response, 422, loc=["body", "text"], error_type="string_too_long")
        assert marker not in response.text
        assert len(response.content) < 1_000
        assert "10000" in detail[0]["msg"]  # useful, constraint-only message is kept

    def test_wrong_typed_values_are_not_reflected(self):
        response = client.post(f"{BASE}/caesar/encrypt", json={"text": "a", "key": "top-secret-value"})

        uniform_error(response, 422, loc=["body", "key"])
        assert "top-secret-value" not in response.text

    def test_malformed_json_is_not_reflected(self):
        response = post_raw(f"{BASE}/caesar/encrypt", '{"text": "visible-token", oops')

        uniform_error(response, 422, error_type="json_invalid")
        assert "visible-token" not in response.text

    def test_many_unknown_fields_cannot_amplify_the_response(self):
        extras = ",".join('"f%d":1' % i for i in range(5_000))
        response = post_raw(f"{BASE}/caesar/encrypt", '{"text":"a","key":1,%s}' % extras)

        detail = uniform_error(response, 422)
        assert len(detail) == 21  # 20 reported problems plus one "truncated" note
        assert detail[-1]["type"] == "truncated"
        assert "4980 more problems" in detail[-1]["msg"]
        assert len(response.content) < 5_000


class TestRequestBodySizeLimit:
    @staticmethod
    def body_of_exact_size(size):
        prefix, suffix = '{"text":"', '","key":1}'
        padding = size - len(prefix) - len(suffix)
        body = prefix + "a" * padding + suffix
        assert len(body.encode()) == size
        return body

    def test_body_just_over_the_limit_is_rejected_with_413(self):
        response = post_raw(f"{BASE}/caesar/encrypt", self.body_of_exact_size(MAX_BODY + 1))

        detail = uniform_error(response, 413, loc=[], error_type="payload_too_large")
        assert "262144" in detail[0]["msg"]
        assert len(response.content) < 1_000

    def test_body_exactly_at_the_limit_gets_past_the_size_check(self):
        # Not too big for the size limit, but its text is far over the 10,000-character rule.
        response = post_raw(f"{BASE}/caesar/encrypt", self.body_of_exact_size(MAX_BODY))

        uniform_error(response, 422, loc=["body", "text"], error_type="string_too_long")

    def test_a_maximal_valid_request_fits_comfortably(self):
        # 10,000 astral characters written as escaped surrogate pairs: the worst case, 12 bytes each.
        pair = BS + "ud83d" + BS + "ude00"
        body = '{"text":"%s","key":1}' % (pair * 10_000)
        assert 120_000 < len(body) < MAX_BODY

        response = post_raw(f"{BASE}/caesar/encrypt", body)

        assert response.status_code == 200

    def test_chunked_body_without_content_length_is_limited_while_streaming(self):
        def chunks():
            for _ in range(300):
                yield b"a" * 1_000  # 300,000 bytes in total

        response = client.post(f"{BASE}/caesar/encrypt", content=chunks(), headers=JSON)

        uniform_error(response, 413, error_type="payload_too_large")

    def test_huge_request_is_refused_not_parsed(self):
        response = post_raw(f"{BASE}/caesar/encrypt", '{"text":"' + "a" * 5_000_000 + '","key":1}')

        uniform_error(response, 413, error_type="payload_too_large")
        assert len(response.content) < 1_000

    def test_413_responses_carry_cors_headers_for_allowed_origins(self):
        response = client.post(
            f"{BASE}/caesar/encrypt",
            content=self.body_of_exact_size(MAX_BODY + 1),
            headers={**JSON, "Origin": "http://localhost:5173"},
        )

        assert response.status_code == 413
        assert response.headers["access-control-allow-origin"] == "http://localhost:5173"

    def test_limit_comes_from_settings(self):
        small = TestClient(create_app(Settings(max_request_body_bytes=64)))

        ok = small.post(f"{BASE}/caesar/encrypt", json={"text": "hi", "key": 1})
        too_big = small.post(f"{BASE}/caesar/encrypt", json={"text": "x" * 100, "key": 1})

        assert ok.status_code == 200
        uniform_error(too_big, 413, error_type="payload_too_large")

    def test_other_endpoints_are_unaffected_by_the_limit(self):
        assert client.get("/api/v1/health").status_code == 200
        assert client.get("/api/v1/modules").status_code == 200


class TestBodySizeLimitMiddlewareUnit:
    """Drive the ASGI middleware directly to cover the streaming paths exactly."""

    @staticmethod
    def run(max_bytes, headers, chunks, scope_type="http"):
        called = {"inner": False}
        sent = []

        async def inner(scope, receive, send):
            called["inner"] = True
            if scope["type"] != "http":
                return
            total = 0
            while True:
                message = await receive()
                total += len(message.get("body", b""))
                if not message.get("more_body", False):
                    break
            await send({"type": "http.response.start", "status": 200, "headers": []})
            await send({"type": "http.response.body", "body": str(total).encode()})

        stream = iter(chunks)

        async def receive():
            try:
                body = next(stream)
            except StopIteration:
                return {"type": "http.disconnect"}
            return {"type": "http.request", "body": body, "more_body": body is not chunks[-1]}

        async def send(message):
            sent.append(message)

        middleware = BodySizeLimitMiddleware(inner, max_body_bytes=max_bytes)
        scope = {"type": scope_type, "headers": headers}
        asyncio.run(middleware(scope, receive, send))
        return called["inner"], sent

    def test_body_within_limit_passes_through(self):
        called, sent = self.run(100, [], [b"a" * 60, b"b" * 40])

        assert called is True
        assert sent[0]["status"] == 200 and sent[1]["body"] == b"100"

    def test_declared_length_over_limit_is_refused_without_reading(self):
        called, sent = self.run(100, [(b"content-length", b"101")], [b"x" * 101])

        assert called is False
        assert sent[0]["status"] == 413

    def test_streamed_bytes_over_limit_raise_413(self):
        with pytest.raises(HTTPException) as info:
            self.run(100, [], [b"a" * 60, b"b" * 41])

        assert info.value.status_code == 413

    def test_a_lying_content_length_cannot_bypass_the_limit(self):
        with pytest.raises(HTTPException) as info:
            self.run(100, [(b"content-length", b"10")], [b"a" * 60, b"b" * 60])

        assert info.value.status_code == 413

    def test_malformed_content_length_falls_back_to_counting(self):
        with pytest.raises(HTTPException):
            self.run(100, [(b"content-length", b"abc")], [b"a" * 200])

        called, sent = self.run(100, [(b"content-length", b"abc")], [b"a" * 50])
        assert called is True and sent[0]["status"] == 200

    def test_exactly_at_the_limit_is_allowed(self):
        called, sent = self.run(100, [], [b"a" * 100])

        assert called is True and sent[1]["body"] == b"100"

    def test_non_http_scopes_pass_straight_through(self):
        called, sent = self.run(1, [], [], scope_type="lifespan")

        assert called is True and sent == []


class TestUniformErrorsEverywhere:
    @pytest.mark.parametrize("path", ENDPOINTS)
    @pytest.mark.parametrize(
        ("payload", "error_type"),
        [
            ({"text": "a"}, "missing"),
            ({"text": "a", "key": 1, "a": 5, "b": 1, "zzz": 1}, "extra_forbidden"),
            ({"text": 5, "key": 1, "a": 5, "b": 1}, "string_type"),
        ],
    )
    def test_all_four_endpoints_report_problems_in_one_shape(self, path, payload, error_type):
        if "caesar" in path:
            payload = {k: v for k, v in payload.items() if k not in ("a", "b")} | (
                {"key": 1} if "key" not in payload and error_type != "missing" else {}
            )
        response = client.post(path, json=payload)

        detail = uniform_error(response, 422)
        assert error_type in {item["type"] for item in detail}

    def test_unknown_route_uses_the_same_shape(self):
        uniform_error(client.get("/api/v1/nope"), 404, loc=[], error_type="not_found")

    def test_wrong_method_uses_the_same_shape_and_keeps_the_allow_header(self):
        response = client.get(f"{BASE}/caesar/encrypt")

        uniform_error(response, 405, loc=[], error_type="method_not_allowed")
        assert response.headers["allow"] == "POST"

    def test_integer_too_large_to_parse_is_a_structured_400(self):
        # Python refuses to parse integers of 4,301+ digits, before validation can run.
        body = '{"text":"a","key":' + "9" * 4_301 + "}"
        response = post_raw(f"{BASE}/caesar/encrypt", body)

        uniform_error(response, 400, loc=[], error_type="bad_request")

    def test_trailing_slash_redirects_with_307(self):
        response = client.post(
            f"{BASE}/caesar/encrypt/", json={"text": "a", "key": 1}, follow_redirects=False
        )

        assert response.status_code == 307
        assert response.headers["location"].endswith(f"{BASE}/caesar/encrypt")


class TestUnexpectedErrorsStayInternalErrors:
    @pytest.mark.parametrize("exception", [RuntimeError, ValueError, KeyError, ZeroDivisionError])
    def test_unexpected_exception_is_a_generic_500_that_leaks_nothing(self, exception):
        crashing = create_app()

        @crashing.get("/boom")
        def boom():
            raise exception("secret-internal-detail /etc/passwd")

        response = TestClient(crashing, raise_server_exceptions=False).get("/boom")

        detail = uniform_error(response, 500, loc=[], error_type="internal_error")
        assert detail[0]["msg"] == "Internal server error."
        for leak in ("secret-internal-detail", "Traceback", exception.__name__, "passwd"):
            assert leak not in response.text

    def test_a_client_error_exception_keeps_its_status(self):
        custom = create_app()

        @custom.get("/teapot")
        def teapot():
            raise ClientError(418, "teapot", "I am a teapot.", ("query", "brew"))

        response = TestClient(custom).get("/teapot")

        uniform_error(response, 418, loc=["query", "brew"], error_type="teapot")


class TestErrorResponseBuilder:
    def test_hostile_locations_and_text_still_serialise(self):
        response = error_response(
            422,
            [
                {
                    "loc": ["body", "\ud800", True, 7, "x" * 500, None],
                    "msg": "m" * 1_000,
                    "type": "t",
                }
            ],
        )

        body = json.loads(response.body, parse_constant=_forbid_constant)
        loc = body["detail"][0]["loc"]
        assert loc[:2] == ["body", "\ud800"]
        assert loc[2] == "True" and loc[3] == 7 and loc[5] == "None"
        assert len(loc[4]) == 80 and loc[4].endswith("…")
        assert len(body["detail"][0]["msg"]) == 300
        response.body.decode("ascii")

    def test_never_reports_more_than_twenty_problems(self):
        response = error_response(422, [{"loc": ["x", i], "msg": "m", "type": "t"} for i in range(50)])

        detail = json.loads(response.body)["detail"]
        assert len(detail) == 21
        assert detail[-1] == {"loc": [], "msg": "30 more problems not shown.", "type": "truncated"}

    def test_custom_headers_are_kept(self):
        response = error_response(405, [{"loc": [], "msg": "m", "type": "t"}], headers={"Allow": "POST"})

        assert response.headers["allow"] == "POST"


class TestOpenApiDocumentsTheErrorSchema:
    spec = client.get("/openapi.json").json()

    @pytest.mark.parametrize("path", ENDPOINTS)
    def test_each_cipher_endpoint_documents_413_and_422_with_the_real_schema(self, path):
        responses = self.spec["paths"][path]["post"]["responses"]

        assert set(responses) == {"200", "413", "422"}
        for code in ("413", "422"):
            ref = responses[code]["content"]["application/json"]["schema"]["$ref"]
            assert ref == "#/components/schemas/ErrorResponse"

    def test_error_response_schema_matches_what_the_api_returns(self):
        schemas = self.spec["components"]["schemas"]

        assert schemas["ErrorResponse"]["required"] == ["detail"]
        assert schemas["ErrorResponse"]["properties"]["detail"]["items"]["$ref"].endswith("/ErrorDetail")
        assert set(schemas["ErrorDetail"]["properties"]) == {"loc", "msg", "type"}
        assert set(schemas["ErrorDetail"]["required"]) == {"loc", "msg", "type"}

    def test_the_default_framework_error_schema_is_not_used_by_the_cipher_endpoints(self):
        for path in ENDPOINTS:
            assert "HTTPValidationError" not in json.dumps(self.spec["paths"][path])

    def test_models_validate_a_real_error_body(self):
        body = client.post(f"{BASE}/caesar/encrypt", json={"text": "a"}).json()

        parsed = ErrorResponse.model_validate(body)
        assert isinstance(parsed.detail[0], ErrorDetail)
