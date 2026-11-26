"""HTTP tests for the Vigenere endpoints."""

import json

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.modules.algebra.schemas import MAX_KEYWORD_LENGTH, MAX_TEXT_LENGTH

client = TestClient(app)
BASE = "/api/v1/algebra/vigenere"


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


class TestEncryptDecrypt:
    def test_encrypt(self):
        response = post("/encrypt", {"text": "ATTACK AT DAWN", "key": "LEMON"})
        assert response.status_code == 200
        assert response.json() == {
            "cipher": "vigenere",
            "operation": "encrypt",
            "input": "ATTACK AT DAWN",
            "output": "LXFOPV EF RNHR",
            "key": "LEMON",
            "key_shifts": [11, 4, 12, 14, 13],
            "key_length": 5,
        }

    def test_decrypt(self):
        body = post("/decrypt", {"text": "LXFOPV EF RNHR", "key": "lemon"}).json()
        assert body["operation"] == "decrypt"
        assert body["output"] == "ATTACK AT DAWN"
        assert body["key"] == "lemon"
        assert body["key_shifts"] == [11, 4, 12, 14, 13]

    def test_case_punctuation_digits_preserved(self):
        body = post("/encrypt", {"text": "Attack at Dawn! 2024", "key": "Lemon"}).json()
        assert body["output"] == "Lxfopv ef Rnhr! 2024"

    def test_empty_text_is_valid(self):
        assert post("/encrypt", {"text": "", "key": "K"}).json()["output"] == ""

    def test_longest_text_and_keyword_are_accepted(self):
        assert post("/encrypt", {"text": "a" * MAX_TEXT_LENGTH, "key": "k" * MAX_KEYWORD_LENGTH}).status_code == 200

    def test_unicode_text_round_trips(self):
        text = "café \U0001f600 你好"
        enc = post("/encrypt", {"text": text, "key": "KEY"}).json()["output"]
        assert post("/decrypt", {"text": enc, "key": "KEY"}).json()["output"] == text


class TestValidation:
    @pytest.mark.parametrize("key", ["", "KEY1", "KEY WORD", "kéy", "!"])
    def test_invalid_keywords_are_422_invalid_key_without_echo(self, key):
        body = assert_uniform_error(post("/encrypt", {"text": "hello", "key": key}), 422, "invalid_key")
        assert body["detail"][0]["loc"] == ["body", "key"]
        assert key == "" or key not in json.dumps(body)
        assert "hello" not in json.dumps(body)

    def test_keyword_over_the_limit_is_rejected(self):
        assert_uniform_error(post("/encrypt", {"text": "a", "key": "k" * (MAX_KEYWORD_LENGTH + 1)}), 422)

    def test_text_over_the_limit_is_rejected(self):
        body = assert_uniform_error(post("/decrypt", {"text": "a" * (MAX_TEXT_LENGTH + 1), "key": "K"}), 422)
        assert "aaaa" not in json.dumps(body)

    @pytest.mark.parametrize(
        "payload",
        [{}, {"text": "a"}, {"key": "K"}, {"text": 1, "key": "K"}, {"text": "a", "key": 5}, {"text": "a", "key": None},
         {"text": "a", "key": ["K"]}, {"text": "a", "key": "K", "extra": 1}, [], "x"],
    )
    def test_malformed_bodies_get_a_uniform_422(self, payload):
        assert_uniform_error(post("/encrypt", payload), 422)

    def test_oversized_body_is_a_413(self):
        big = json.dumps({"text": "a" * (300 * 1024), "key": "K"})
        response = client.post(f"{BASE}/encrypt", content=big, headers={"Content-Type": "application/json"})
        assert_uniform_error(response, 413, "payload_too_large")

    def test_nan_never_causes_a_500(self):
        response = client.post(f"{BASE}/encrypt", content='{"text": NaN, "key": "K"}', headers={"Content-Type": "application/json"})
        assert response.status_code == 422

    def test_get_is_not_allowed(self):
        assert_uniform_error(client.get(f"{BASE}/encrypt"), 405)


class TestOpenApi:
    def test_documented_with_error_schemas(self):
        paths = client.get("/openapi.json").json()["paths"]
        for op in ("encrypt", "decrypt"):
            responses = paths[f"{BASE}/{op}"]["post"]["responses"]
            assert {"200", "413", "422"} <= set(responses)
