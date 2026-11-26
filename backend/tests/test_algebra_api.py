import pytest
from fastapi.testclient import TestClient

from app import __version__
from app.main import app
from app.modules.algebra.schemas import MAX_KEY_MAGNITUDE, MAX_TEXT_LENGTH

client = TestClient(app)

BASE = "/api/v1/algebra"
VALID_A = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25]
INVALID_A = [a for a in range(26) if a not in VALID_A]


def post(path: str, payload: dict):
    return client.post(f"{BASE}{path}", json=payload)


class TestCaesarEndpoints:
    def test_encrypt(self):
        response = post("/caesar/encrypt", {"text": "Hello, World!", "key": 3})

        assert response.status_code == 200
        assert response.json() == {
            "cipher": "caesar",
            "operation": "encrypt",
            "input": "Hello, World!",
            "output": "Khoor, Zruog!",
            "key": 3,
            "effective_key": 3,
        }

    def test_decrypt(self):
        response = post("/caesar/decrypt", {"text": "Khoor, Zruog!", "key": 3})

        assert response.status_code == 200
        body = response.json()
        assert body["operation"] == "decrypt"
        assert body["output"] == "Hello, World!"

    def test_negative_and_oversized_keys_report_the_effective_key(self):
        negative = post("/caesar/encrypt", {"text": "DEF", "key": -3}).json()
        assert (negative["output"], negative["key"], negative["effective_key"]) == ("ABC", -3, 23)

        big = post("/caesar/encrypt", {"text": "abc", "key": 10**15 + 1}).json()
        assert big["effective_key"] == (10**15 + 1) % 26
        assert big["output"] == post("/caesar/encrypt", {"text": "abc", "key": big["effective_key"]}).json()["output"]

    def test_empty_text(self):
        response = post("/caesar/encrypt", {"text": "", "key": 5})

        assert response.status_code == 200
        assert response.json()["output"] == ""

    def test_non_ascii_text_is_returned_intact(self):
        response = post("/caesar/encrypt", {"text": "café 日本 😀", "key": 1})

        assert response.status_code == 200
        assert response.json()["output"] == "dbgé 日本 😀"

    @pytest.mark.parametrize("key", [-27, -1, 0, 1, 13, 25, 26, 999])
    def test_round_trip_through_the_api(self, key):
        text = "Round trip: The Quick Brown Fox, 123!"
        cipher = post("/caesar/encrypt", {"text": text, "key": key}).json()["output"]

        assert post("/caesar/decrypt", {"text": cipher, "key": key}).json()["output"] == text


class TestAffineEndpoints:
    def test_encrypt(self):
        response = post("/affine/encrypt", {"text": "AFFINE CIPHER", "a": 5, "b": 8})

        assert response.status_code == 200
        assert response.json() == {
            "cipher": "affine",
            "operation": "encrypt",
            "input": "AFFINE CIPHER",
            "output": "IHHWVC SWFRCP",
            "a": 5,
            "b": 8,
            "effective_a": 5,
            "effective_b": 8,
            "a_inverse": 21,
        }

    def test_decrypt(self):
        response = post("/affine/decrypt", {"text": "IHHWVC SWFRCP", "a": 5, "b": 8})

        assert response.status_code == 200
        body = response.json()
        assert body["operation"] == "decrypt"
        assert body["output"] == "AFFINE CIPHER"
        assert body["a_inverse"] == 21

    def test_keys_are_reported_reduced(self):
        body = post("/affine/encrypt", {"text": "abc", "a": -1, "b": -27}).json()

        assert (body["effective_a"], body["effective_b"], body["a_inverse"]) == (25, 25, 25)

    @pytest.mark.parametrize("a", VALID_A)
    def test_round_trip_for_each_valid_multiplier(self, a):
        text = "Mixed Case, punctuation & digits 0-9!"
        cipher = post("/affine/encrypt", {"text": text, "a": a, "b": 11}).json()["output"]

        assert post("/affine/decrypt", {"text": cipher, "a": a, "b": 11}).json()["output"] == text

    @pytest.mark.parametrize("a", INVALID_A)
    @pytest.mark.parametrize("operation", ["encrypt", "decrypt"])
    def test_invalid_multiplier_is_rejected_with_a_mathematical_message(self, a, operation):
        response = post(f"/affine/{operation}", {"text": "hello", "a": a, "b": 3})

        assert response.status_code == 422
        # Uniform error structure: a list with one {loc, msg, type} object naming field `a`.
        detail = response.json()["detail"]
        assert isinstance(detail, list) and len(detail) == 1
        assert detail[0]["loc"] == ["body", "a"]
        assert detail[0]["type"] == "invalid_key"
        message = detail[0]["msg"]
        assert "not coprime" in message
        assert f"gcd({a}, 26)" in message
        assert "1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25" in message

    def test_multiplier_26_is_rejected(self):
        assert post("/affine/encrypt", {"text": "x", "a": 26, "b": 0}).status_code == 422


class TestRequestValidation:
    @pytest.mark.parametrize("path", ["/caesar/encrypt", "/caesar/decrypt"])
    @pytest.mark.parametrize("bad_key", ["3", 3.5, True, None, [3]])
    def test_caesar_rejects_non_integer_keys(self, path, bad_key):
        assert post(path, {"text": "abc", "key": bad_key}).status_code == 422

    @pytest.mark.parametrize("path", ["/affine/encrypt", "/affine/decrypt"])
    @pytest.mark.parametrize("field", ["a", "b"])
    @pytest.mark.parametrize("bad", ["5", 5.5, True, None])
    def test_affine_rejects_non_integer_keys(self, path, field, bad):
        payload = {"text": "abc", "a": 5, "b": 1, field: bad}
        assert post(path, payload).status_code == 422

    @pytest.mark.parametrize(
        ("path", "payload"),
        [
            ("/caesar/encrypt", {"key": 3}),
            ("/caesar/encrypt", {"text": "abc"}),
            ("/caesar/decrypt", {}),
            ("/affine/encrypt", {"text": "abc", "a": 5}),
            ("/affine/decrypt", {"text": "abc", "b": 5}),
            ("/affine/encrypt", {"a": 5, "b": 1}),
        ],
    )
    def test_missing_fields_are_rejected(self, path, payload):
        assert post(path, payload).status_code == 422

    def test_text_must_be_a_string(self):
        assert post("/caesar/encrypt", {"text": 123, "key": 1}).status_code == 422

    def test_unknown_fields_are_rejected(self):
        response = post("/caesar/encrypt", {"text": "abc", "key": 1, "shift": 2})

        assert response.status_code == 422

    def test_text_length_limit(self):
        ok = post("/caesar/encrypt", {"text": "a" * MAX_TEXT_LENGTH, "key": 1})
        too_long = post("/caesar/encrypt", {"text": "a" * (MAX_TEXT_LENGTH + 1), "key": 1})

        assert ok.status_code == 200
        assert too_long.status_code == 422

    def test_key_magnitude_limit(self):
        assert post("/caesar/encrypt", {"text": "a", "key": MAX_KEY_MAGNITUDE}).status_code == 200
        assert post("/caesar/encrypt", {"text": "a", "key": MAX_KEY_MAGNITUDE + 1}).status_code == 422
        assert post("/affine/encrypt", {"text": "a", "a": 1, "b": -MAX_KEY_MAGNITUDE - 1}).status_code == 422

    def test_malformed_json_is_rejected(self):
        response = client.post(
            f"{BASE}/caesar/encrypt", content="{not json", headers={"Content-Type": "application/json"}
        )

        assert response.status_code == 422

    def test_get_is_not_allowed_on_cipher_endpoints(self):
        assert client.get(f"{BASE}/caesar/encrypt").status_code == 405


class TestExistingEndpointsStillWork:
    def test_health(self):
        response = client.get("/api/v1/health")

        assert response.status_code == 200
        assert response.json()["status"] == "ok"
        assert response.json()["version"] == __version__

    def test_root(self):
        assert client.get("/").status_code == 200

    def test_modules_lists_the_cipher_and_analysis_modules(self):
        # v0.4.0 retired the four empty stub modules; only these two remain.
        body = client.get("/api/v1/modules").json()

        statuses = {m["slug"]: m["status"] for m in body}
        assert statuses == {"algebra": "available", "analysis": "available"}

    def test_openapi_documents_the_four_cipher_endpoints(self):
        paths = client.get("/openapi.json").json()["paths"]

        for path in (
            f"{BASE}/caesar/encrypt",
            f"{BASE}/caesar/decrypt",
            f"{BASE}/affine/encrypt",
            f"{BASE}/affine/decrypt",
        ):
            assert "post" in paths[path]

    def test_cors_preflight_allows_post_from_the_vite_origin(self):
        response = client.options(
            f"{BASE}/caesar/encrypt",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )

        assert response.status_code == 200
        assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


# ---------------------------------------------------------------------------------------
# v0.2.1 additions. All limits below are hard-coded literals on purpose: they are the
# documented contract, independent of the constants in the implementation.
# ---------------------------------------------------------------------------------------

JS_MAX_SAFE_INTEGER = 9007199254740991  # 2**53 - 1
# 9007199254740991 is coprime to 26 and congruent to 5 (mod 26); its negative is congruent to 21.
BOUNDARY_RESIDUE = {JS_MAX_SAFE_INTEGER: 5, -JS_MAX_SAFE_INTEGER: 21}
JSON_HEADERS = {"Content-Type": "application/json"}


class TestJavaScriptSafeKeyBounds:
    @pytest.mark.parametrize("path", ["/caesar/encrypt", "/caesar/decrypt"])
    @pytest.mark.parametrize("key", [JS_MAX_SAFE_INTEGER, -JS_MAX_SAFE_INTEGER])
    def test_caesar_key_exactly_at_each_boundary_is_accepted(self, path, key):
        body = post(path, {"text": "abc", "key": key}).json()

        assert (body["key"], body["effective_key"]) == (key, BOUNDARY_RESIDUE[key])

    @pytest.mark.parametrize("path", ["/caesar/encrypt", "/caesar/decrypt"])
    @pytest.mark.parametrize("key", [JS_MAX_SAFE_INTEGER + 1, -JS_MAX_SAFE_INTEGER - 1])
    def test_caesar_key_one_beyond_each_boundary_is_rejected(self, path, key):
        response = post(path, {"text": "abc", "key": key})

        assert response.status_code == 422
        item = response.json()["detail"][0]
        assert item["loc"] == ["body", "key"]
        assert "9007199254740991" in item["msg"]

    @pytest.mark.parametrize("path", ["/affine/encrypt", "/affine/decrypt"])
    @pytest.mark.parametrize("a", [JS_MAX_SAFE_INTEGER, -JS_MAX_SAFE_INTEGER])
    def test_affine_a_exactly_at_each_boundary_is_accepted(self, path, a):
        body = post(path, {"text": "abc", "a": a, "b": 1}).json()

        residue = BOUNDARY_RESIDUE[a]
        assert (body["a"], body["effective_a"]) == (a, residue)
        assert (residue * body["a_inverse"]) % 26 == 1

    @pytest.mark.parametrize("path", ["/affine/encrypt", "/affine/decrypt"])
    @pytest.mark.parametrize("b", [JS_MAX_SAFE_INTEGER, -JS_MAX_SAFE_INTEGER])
    def test_affine_b_exactly_at_each_boundary_is_accepted(self, path, b):
        body = post(path, {"text": "abc", "a": 5, "b": b}).json()

        assert (body["b"], body["effective_b"]) == (b, BOUNDARY_RESIDUE[b])

    @pytest.mark.parametrize("path", ["/affine/encrypt", "/affine/decrypt"])
    @pytest.mark.parametrize("field", ["a", "b"])
    @pytest.mark.parametrize("value", [JS_MAX_SAFE_INTEGER + 1, -JS_MAX_SAFE_INTEGER - 1])
    def test_affine_values_one_beyond_each_boundary_are_rejected(self, path, field, value):
        payload = {"text": "abc", "a": 5, "b": 1, field: value}

        response = post(path, payload)

        assert response.status_code == 422
        item = response.json()["detail"][0]
        assert item["loc"] == ["body", field]
        assert "9007199254740991" in item["msg"]

    def test_the_old_ten_to_the_eighteenth_limit_is_gone(self):
        assert post("/caesar/encrypt", {"text": "a", "key": 10**18}).status_code == 422
        assert post("/affine/encrypt", {"text": "a", "a": 5, "b": 10**18}).status_code == 422

    def test_the_boundary_is_exactly_the_javascript_safe_integer_limit(self):
        """Why the limit exists: from 2**53 upward doubles can no longer hold every integer."""
        assert JS_MAX_SAFE_INTEGER == 2**53 - 1
        assert int(float(JS_MAX_SAFE_INTEGER)) == JS_MAX_SAFE_INTEGER
        assert int(float(2**53 + 1)) != 2**53 + 1  # rounded: 2**53 + 1 is not representable


class TestMoreApiValidation:
    @pytest.mark.parametrize("path", ["/caesar/encrypt", "/caesar/decrypt"])
    @pytest.mark.parametrize("raw_key", ["3.0", "1e2", "1E2", "-0.0", "2.5e0", "1.0e15"])
    def test_json_float_keys_are_rejected_even_when_integral(self, path, raw_key):
        response = client.post(
            f"{BASE}{path}", content='{"text":"a","key":%s}' % raw_key, headers=JSON_HEADERS
        )

        assert response.status_code == 422
        assert response.json()["detail"][0]["loc"] == ["body", "key"]

    @pytest.mark.parametrize("field", ["a", "b"])
    @pytest.mark.parametrize("raw", ["3.0", "1e2", "-0.0"])
    def test_json_float_affine_keys_are_rejected(self, field, raw):
        payload = '{"text":"a","a":5,"b":1,"%s":%s}' % (field, raw)

        response = client.post(f"{BASE}/affine/encrypt", content=payload, headers=JSON_HEADERS)

        assert response.status_code == 422
        assert response.json()["detail"][0]["loc"] == ["body", field]

    @pytest.mark.parametrize("path", ["/affine/encrypt", "/affine/decrypt"])
    def test_affine_unknown_fields_are_rejected(self, path):
        response = post(path, {"text": "abc", "a": 5, "b": 8, "c": 1})

        assert response.status_code == 422
        item = response.json()["detail"][0]
        assert item["loc"] == ["body", "c"] and item["type"] == "extra_forbidden"

    @pytest.mark.parametrize("path", ["/affine/encrypt", "/affine/decrypt"])
    def test_a_misspelled_affine_field_is_reported_not_ignored(self, path):
        response = post(path, {"text": "abc", "a": 5, "beta": 8})

        types = {item["type"] for item in response.json()["detail"]}
        assert response.status_code == 422
        assert {"missing", "extra_forbidden"} <= types

    @pytest.mark.parametrize("op", ["encrypt", "decrypt"])
    @pytest.mark.parametrize("a", INVALID_A)
    @pytest.mark.parametrize(
        "b",
        [-JS_MAX_SAFE_INTEGER, -(10**15), -27, -1, 0, 1, 7, 13, 25, 26, 10**15, JS_MAX_SAFE_INTEGER],
    )
    def test_invalid_multipliers_are_rejected_whatever_b_is(self, op, a, b):
        response = post(f"/affine/{op}", {"text": "Hello", "a": a, "b": b})

        assert response.status_code == 422
        item = response.json()["detail"][0]
        assert item["type"] == "invalid_key" and item["loc"] == ["body", "a"]

    @pytest.mark.parametrize("key", [-1, -3, -26, -27, -100, -(10**15)])
    def test_negative_caesar_decrypt_key_through_the_api(self, key):
        cipher = "Khoor, Zruog!"
        # Decrypting with k is encrypting with -k, whatever the sign of k.
        expected = post("/caesar/encrypt", {"text": cipher, "key": -key}).json()["output"]

        body = post("/caesar/decrypt", {"text": cipher, "key": key}).json()

        assert body["operation"] == "decrypt"
        assert body["output"] == expected
        assert body["key"] == key
        assert body["effective_key"] == key % 26

    def test_negative_caesar_decrypt_with_a_known_answer(self):
        # Key -3 decrypts by shifting forward 3: E->H, b->e, i->l, i->l, l->o.
        body = post("/caesar/decrypt", {"text": "Ebiil", "key": -3}).json()

        assert body["output"] == "Hello"
        assert body["effective_key"] == 23

    def test_text_limit_is_ten_thousand_characters_not_bytes(self):
        ok_ascii = post("/caesar/encrypt", {"text": "a" * 10000, "key": 1})
        over_ascii = post("/caesar/encrypt", {"text": "a" * 10001, "key": 1})
        ok_astral = post("/caesar/encrypt", {"text": "\U0001f600" * 10000, "key": 1})
        over_astral = post("/caesar/encrypt", {"text": "\U0001f600" * 10001, "key": 1})

        assert (ok_ascii.status_code, over_ascii.status_code) == (200, 422)
        assert (ok_astral.status_code, over_astral.status_code) == (200, 422)
        assert over_ascii.json()["detail"][0]["loc"] == ["body", "text"]
