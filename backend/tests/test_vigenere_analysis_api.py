"""HTTP tests for /api/v1/analysis/vigenere/* and the IC field of /frequency."""

import json
import re

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.modules.algebra.ciphers import vigenere_encrypt
from app.modules.algebra.schemas import MAX_TEXT_LENGTH
from tests.passages import LONG_PASSAGE, VERY_LONG_PASSAGE

client = TestClient(app)
BASE = "/api/v1/analysis"
CIPHER = vigenere_encrypt(VERY_LONG_PASSAGE, "LEMON")


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


class TestLengthsEndpoint:
    def test_ic_kasiski_and_ranked_lengths(self):
        response = post("/vigenere/lengths", {"text": CIPHER})
        assert response.status_code == 200
        body = response.json()
        assert body["letters"] == 1295
        assert body["suggested_length"] == 5
        assert body["lengths"][0]["length"] == 5 and body["lengths"][0]["plausible"] is True
        assert [r["rank"] for r in body["lengths"]] == list(range(1, 21))
        ic = body["index_of_coincidence"]
        assert ic["reading"] in ("flat", "intermediate") and 0.03 < ic["ic"] < 0.06
        assert ic["english_ic"] == pytest.approx(0.0655, abs=5e-5) and ic["random_ic"] == pytest.approx(1 / 26)
        kas = body["kasiski"]
        assert kas["total_repeats"] > 0 and kas["votes"][0]["repeats"] >= 1
        assert all(v["length"] >= 2 for v in kas["votes"])
        assert "not proof" in body["note"] or "suggestion" in body["note"]

    def test_the_response_is_json_safe(self):
        json.dumps(post("/vigenere/lengths", {"text": CIPHER}).json(), allow_nan=False)

    def test_short_text_still_answers_with_a_reliability_flag(self):
        body = post("/vigenere/lengths", {"text": "Lxfopv ef Rnhr"}).json()
        assert body["reliability"] in ("very_low", "low")
        assert body["kasiski"]["total_repeats"] == 0
        assert body["index_of_coincidence"]["reliability"] == "very_low"

    @pytest.mark.parametrize("text", ["", "A", "1234 !?", "你好"])
    def test_fewer_than_two_letters_is_a_422(self, text):
        body = assert_uniform_error(post("/vigenere/lengths", {"text": text}), 422, "insufficient_text")
        assert body["detail"][0]["loc"] == ["body", "text"]

    def test_the_longest_text_is_accepted(self):
        assert post("/vigenere/lengths", {"text": "ab" * (MAX_TEXT_LENGTH // 2)}).status_code == 200

    def test_text_over_the_limit_is_rejected_without_echo(self):
        body = assert_uniform_error(post("/vigenere/lengths", {"text": "a" * (MAX_TEXT_LENGTH + 1)}), 422)
        assert "aaaa" not in json.dumps(body)

    @pytest.mark.parametrize("payload", [{}, {"text": 5}, {"text": None}, {"text": "ab", "key_length": 3}, [], "x"])
    def test_malformed_bodies(self, payload):
        assert_uniform_error(post("/vigenere/lengths", payload), 422)


class TestCandidatesEndpoint:
    def test_recovers_the_key_and_explains_each_column(self):
        response = post("/vigenere/candidates", {"text": CIPHER, "key_length": 5})
        assert response.status_code == 200
        body = response.json()
        assert body["key_length"] == 5 and body["letters"] == 1295
        top = body["candidates"][0]
        assert top["key"] == "LEMON" and top["plaintext"] == VERY_LONG_PASSAGE
        assert top["shifts"] == [11, 4, 12, 14, 13] and top["rank"] == 1
        assert [c["best"]["letter"] for c in body["columns"]] == list("LEMON")
        assert sum(c["size"] for c in body["columns"]) == 1295
        assert all(re.fullmatch(r"[A-Z]{5}", c["key"]) for c in body["candidates"])
        assert 1 < len(body["candidates"]) <= 10
        json.dumps(body, allow_nan=False)

    def test_a_multiple_of_the_length_reports_the_shortest_equivalent_key(self):
        top = post("/vigenere/candidates", {"text": CIPHER, "key_length": 10}).json()["candidates"][0]
        assert top["key"] == "LEMONLEMON" and top["shortest_equivalent_key"] == "LEMON"

    def test_the_candidate_can_be_checked_with_the_decrypt_endpoint(self):
        top = post("/vigenere/candidates", {"text": CIPHER, "key_length": 5}).json()["candidates"][0]
        decrypted = client.post("/api/v1/algebra/vigenere/decrypt", json={"text": CIPHER, "key": top["key"]}).json()["output"]
        assert decrypted == top["plaintext"]

    def test_short_text_is_flagged(self):
        body = post("/vigenere/candidates", {"text": vigenere_encrypt("Meet me at the old bridge", "LEMON"), "key_length": 5}).json()
        assert body["reliability"] == "very_low"

    @pytest.mark.parametrize("length", [0, -3, 41, 100000])
    def test_key_length_out_of_range_is_a_422(self, length):
        assert_uniform_error(post("/vigenere/candidates", {"text": CIPHER, "key_length": length}), 422)

    @pytest.mark.parametrize("length", [1.5, "5", None, True, [5]])
    def test_key_length_must_be_an_integer(self, length):
        assert_uniform_error(post("/vigenere/candidates", {"text": CIPHER, "key_length": length}), 422)

    def test_key_length_larger_than_the_text_is_an_invalid_key_length(self):
        body = assert_uniform_error(post("/vigenere/candidates", {"text": "abc", "key_length": 4}), 422, "invalid_key_length")
        assert body["detail"][0]["loc"] == ["body", "key_length"]

    @pytest.mark.parametrize("text", ["", "A", "123"])
    def test_too_little_text(self, text):
        assert_uniform_error(post("/vigenere/candidates", {"text": text, "key_length": 1}), 422, "insufficient_text")

    def test_missing_fields_and_extras(self):
        assert_uniform_error(post("/vigenere/candidates", {"text": CIPHER}), 422)
        assert_uniform_error(post("/vigenere/candidates", {"key_length": 3}), 422)
        assert_uniform_error(post("/vigenere/candidates", {"text": CIPHER, "key_length": 3, "extra": 1}), 422)

    def test_oversized_body_is_a_413(self):
        big = json.dumps({"text": "a" * (300 * 1024), "key_length": 3})
        response = client.post(f"{BASE}/vigenere/candidates", content=big, headers={"Content-Type": "application/json"})
        assert_uniform_error(response, 413, "payload_too_large")

    def test_errors_never_echo_the_ciphertext(self):
        body = assert_uniform_error(post("/vigenere/candidates", {"text": "qzxqzxqzx", "key_length": 99}), 422)
        assert "qzx" not in json.dumps(body)

    def test_longest_text_and_longest_key_length_complete(self):
        text = vigenere_encrypt(("meet me at the old bridge " * 500)[:MAX_TEXT_LENGTH], "SECRETKEY")
        assert post("/vigenere/candidates", {"text": text, "key_length": 40}).status_code == 200


class TestFrequencyReportsIc:
    def test_index_of_coincidence_field(self):
        body = post("/frequency", {"text": "AAB"}).json()
        assert body["index_of_coincidence"] == pytest.approx(1 / 3)

    @pytest.mark.parametrize("text", ["", "A", "123 !?"])
    def test_null_below_two_letters(self, text):
        assert post("/frequency", {"text": text}).json()["index_of_coincidence"] is None

    def test_english_text(self):
        assert 0.060 < post("/frequency", {"text": LONG_PASSAGE}).json()["index_of_coincidence"] < 0.075


class TestOpenApi:
    def test_documented_with_error_schemas(self):
        paths = client.get("/openapi.json").json()["paths"]
        for path in ("/vigenere/lengths", "/vigenere/candidates"):
            assert {"200", "413", "422"} <= set(paths[f"{BASE}{path}"]["post"]["responses"])

    def test_the_modules_list_still_has_two_modules(self):
        assert [m["slug"] for m in client.get("/api/v1/modules").json()] == ["algebra", "analysis"]
