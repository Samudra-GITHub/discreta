"""HTTP tests for /api/v1/analysis/*."""

import json
import math

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.modules.algebra import ciphers
from app.modules.algebra.schemas import MAX_TEXT_LENGTH
from tests.passages import LONG_PASSAGE

client = TestClient(app)
BASE = "/api/v1/analysis"


def post(path: str, payload):
    return client.post(f"{BASE}{path}", json=payload)


def assert_uniform_error(response, status: int, error_type: str | None = None):
    assert response.status_code == status
    body = response.json()
    assert set(body) == {"detail"}
    assert all(set(item) == {"loc", "msg", "type"} for item in body["detail"])
    if error_type:
        assert body["detail"][0]["type"] == error_type
    return body


class TestFrequencyEndpoint:
    def test_hello_world(self):
        response = post("/frequency", {"text": "Hello, World!"})
        assert response.status_code == 200
        body = response.json()
        assert body["letters"] == 10 and body["total_characters"] == 13
        rows = {row["letter"]: row for row in body["rows"]}
        assert rows["L"]["count"] == 3 and rows["L"]["percent"] == pytest.approx(30.0)
        assert rows["L"]["rank"] == 1
        assert body["most_frequent"] == ["L", "O", "D"]
        assert body["breakdown"] == {
            "letters": 10,
            "whitespace": 1,
            "digits": 0,
            "other_ascii": 2,
            "non_ascii": 0,
        }
        assert len(body["rows"]) == 26
        assert "Lewand" in body["reference"]

    def test_values_come_from_the_text_not_a_sample(self):
        a = post("/frequency", {"text": "aaaa"}).json()
        b = post("/frequency", {"text": "zzzz"}).json()
        assert a["rows"][0]["count"] == 4 and b["rows"][25]["count"] == 4
        assert a["rows"] != b["rows"]

    def test_empty_text_is_valid(self):
        response = post("/frequency", {"text": ""})
        assert response.status_code == 200
        body = response.json()
        assert body["letters"] == 0 and body["chi_squared"] is None
        assert all(row["percent"] == 0 for row in body["rows"])

    def test_punctuation_only(self):
        body = post("/frequency", {"text": "!!! ??? 123"}).json()
        assert body["letters"] == 0 and body["breakdown"]["digits"] == 3

    def test_unicode_text(self):
        body = post("/frequency", {"text": "naïve café — 你好 \U0001f600"}).json()
        assert body["letters"] == 7  # n a v e c a f
        assert body["breakdown"]["non_ascii"] > 0

    def test_response_is_json_safe_for_every_row(self):
        body = post("/frequency", {"text": LONG_PASSAGE}).json()
        for row in body["rows"]:
            assert all(math.isfinite(v) for v in row.values() if isinstance(v, float))
        json.dumps(body, allow_nan=False)

    def test_exactly_the_maximum_length_is_accepted(self):
        assert post("/frequency", {"text": "a" * MAX_TEXT_LENGTH}).status_code == 200

    def test_one_over_the_maximum_length_is_rejected(self):
        body = assert_uniform_error(post("/frequency", {"text": "a" * (MAX_TEXT_LENGTH + 1)}), 422)
        assert "aaaa" not in json.dumps(body)

    @pytest.mark.parametrize(
        "payload",
        [{}, {"text": 5}, {"text": None}, {"text": "a", "extra": 1}, [], "text"],
    )
    def test_invalid_bodies_get_a_uniform_422(self, payload):
        assert_uniform_error(post("/frequency", payload), 422)

    def test_get_is_not_allowed(self):
        assert_uniform_error(client.get(f"{BASE}/frequency"), 405)


class TestCaesarCrackEndpoint:
    def test_ranks_all_26_and_finds_the_key(self):
        ciphertext = ciphers.caesar_encrypt(LONG_PASSAGE, 13)
        response = post("/caesar/crack", {"text": ciphertext})
        assert response.status_code == 200
        body = response.json()
        assert len(body["candidates"]) == 26
        assert body["candidates"][0]["key"] == 13
        assert body["candidates"][0]["plaintext"] == LONG_PASSAGE
        assert body["candidates"][0]["rank"] == 1
        assert body["reliability"] == "adequate"
        assert "estimate" in body["reliability_note"]
        scores = [c["chi_squared"] for c in body["candidates"]]
        assert scores == sorted(scores)

    def test_short_text_is_flagged(self):
        body = post("/caesar/crack", {"text": "Khoor"}).json()
        assert body["reliability"] == "very_low"
        assert body["letters"] == 5

    @pytest.mark.parametrize("text", ["", "   ", "1234 !?", "你好"])
    def test_text_without_letters_is_a_422_no_letters(self, text):
        body = assert_uniform_error(post("/caesar/crack", {"text": text}), 422, "no_letters")
        assert body["detail"][0]["loc"] == ["body", "text"]

    def test_oversized_text_rejected(self):
        assert_uniform_error(post("/caesar/crack", {"text": "a" * (MAX_TEXT_LENGTH + 1)}), 422)

    def test_unknown_field_rejected(self):
        assert_uniform_error(post("/caesar/crack", {"text": "abc", "key": 1}), 422)


class TestAffineSearchEndpoint:
    def test_ranks_all_312_keys_and_finds_the_key(self):
        ciphertext = ciphers.affine_encrypt(LONG_PASSAGE, 7, 19)
        response = post("/affine/search", {"text": ciphertext})
        assert response.status_code == 200
        body = response.json()
        assert body["key_space"] == 312 and len(body["candidates"]) == 312
        best = body["candidates"][0]
        assert (best["a"], best["b"]) == (7, 19)
        assert best["plaintext"] == LONG_PASSAGE
        assert best["a_inverse"] == 15
        assert body["plaintexts_included"] == 20
        assert sum(c["plaintext"] is not None for c in body["candidates"]) == 20

    def test_every_candidate_key_is_valid(self):
        body = post("/affine/search", {"text": LONG_PASSAGE, "plaintext_limit": 0}).json()
        assert {c["a"] for c in body["candidates"]} == {1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25}
        assert all(math.gcd(c["a"], 26) == 1 for c in body["candidates"])
        assert all(c["plaintext"] is None for c in body["candidates"])

    def test_plaintext_limit_bounds(self):
        assert post("/affine/search", {"text": "abc", "plaintext_limit": 312}).status_code == 200
        assert post("/affine/search", {"text": "abc", "plaintext_limit": 0}).status_code == 200
        assert_uniform_error(post("/affine/search", {"text": "abc", "plaintext_limit": 313}), 422)
        assert_uniform_error(post("/affine/search", {"text": "abc", "plaintext_limit": -1}), 422)
        assert_uniform_error(post("/affine/search", {"text": "abc", "plaintext_limit": 1.5}), 422)
        assert_uniform_error(post("/affine/search", {"text": "abc", "plaintext_limit": "5"}), 422)
        assert_uniform_error(post("/affine/search", {"text": "abc", "plaintext_limit": True}), 422)

    def test_any_candidate_can_be_decrypted_with_the_normal_endpoint(self):
        ciphertext = ciphers.affine_encrypt(LONG_PASSAGE, 7, 19)
        search = post("/affine/search", {"text": ciphertext, "plaintext_limit": 1}).json()
        last = search["candidates"][-1]
        assert last["plaintext"] is None
        decrypted = client.post(
            "/api/v1/algebra/affine/decrypt", json={"text": ciphertext, "a": last["a"], "b": last["b"]}
        ).json()["output"]
        assert decrypted == ciphers.affine_decrypt(ciphertext, last["a"], last["b"])

    def test_no_letters_is_a_422(self):
        assert_uniform_error(post("/affine/search", {"text": "12345"}), 422, "no_letters")

    def test_short_text_is_flagged(self):
        assert post("/affine/search", {"text": "Khoor"}).json()["reliability"] == "very_low"


class TestRequestLimitsAndErrors:
    def test_oversized_body_is_a_413_with_the_uniform_body(self):
        big = json.dumps({"text": "a" * (300 * 1024)})
        response = client.post(f"{BASE}/frequency", content=big, headers={"Content-Type": "application/json"})
        assert_uniform_error(response, 413, "payload_too_large")

    def test_invalid_json_is_a_uniform_error(self):
        response = client.post(
            f"{BASE}/caesar/crack", content="{not json", headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422
        assert set(response.json()) == {"detail"}

    def test_nan_and_infinity_never_cause_a_500(self):
        for raw in ('{"text": NaN}', '{"text": "a", "plaintext_limit": Infinity}'):
            response = client.post(
                f"{BASE}/affine/search", content=raw, headers={"Content-Type": "application/json"}
            )
            assert response.status_code == 422

    def test_unknown_analysis_route_is_a_uniform_404(self):
        assert_uniform_error(post("/nope", {"text": "abc"}), 404, "not_found")


class TestOpenApi:
    def test_the_three_endpoints_are_documented_with_error_schemas(self):
        schema = client.get("/openapi.json").json()
        for path in ("/frequency", "/caesar/crack", "/affine/search"):
            operation = schema["paths"][f"/api/v1/analysis{path}"]["post"]
            assert {"200", "413", "422"} <= set(operation["responses"])
