"""Tests for the Vigenere cipher.

Expected values are textbook vectors written out as literals, a separately written reference
implementation (plain ``ord``/``chr`` arithmetic, no shared code), and relations to the Caesar
cipher, which has its own independent tests.
"""

import random
import string

import pytest

from app.modules.algebra.ciphers import (
    InvalidKeyError,
    caesar_encrypt,
    vigenere_decrypt,
    vigenere_encrypt,
    vigenere_shifts,
)


def reference_encrypt(text: str, key: str, sign: int = 1) -> str:
    """A deliberately naive Vigenere: walk the text, advance the key only on letters."""
    out = []
    j = 0
    for ch in text:
        if ch in string.ascii_uppercase:
            base = "A"
        elif ch in string.ascii_lowercase:
            base = "a"
        else:
            out.append(ch)
            continue
        k = string.ascii_uppercase.index(key[j % len(key)].upper())
        out.append(chr((ord(ch) - ord(base) + sign * k) % 26 + ord(base)))
        j += 1
    return "".join(out)


class TestKnownVectors:
    def test_attack_at_dawn_with_lemon(self):
        # The classic textbook example.
        assert vigenere_encrypt("ATTACKATDAWN", "LEMON") == "LXFOPVEFRNHR"
        assert vigenere_decrypt("LXFOPVEFRNHR", "LEMON") == "ATTACKATDAWN"

    def test_wikipedia_example_with_abcd(self):
        assert vigenere_encrypt("CRYPTOISSHORTFORCRYPTOGRAPHY", "ABCD") == "CSASTPKVSIQUTGQUCSASTPIUAQJB"

    def test_hand_computed_letters(self):
        # A + B = B, Z + B = A (wrap), B + Z = A (wrap the other way).
        assert vigenere_encrypt("AZ", "BB") == "BA"
        assert vigenere_encrypt("B", "Z") == "A"
        assert vigenere_decrypt("A", "Z") == "B"
        assert vigenere_decrypt("A", "B") == "Z"

    def test_decryption_formula_with_plus_26(self):
        # P = (C - K + 26) mod 26 for every pair of letters.
        for c in range(26):
            for k in range(26):
                plain = vigenere_decrypt(chr(65 + c), chr(65 + k))
                assert ord(plain) - 65 == (c - k + 26) % 26


class TestTreatmentOfOtherCharacters:
    def test_case_is_preserved(self):
        assert vigenere_encrypt("Attack at Dawn", "Lemon") == "Lxfopv ef Rnhr"

    def test_key_advances_on_letters_only(self):
        # Spaces and punctuation do not consume key letters, so this equals the unpunctuated text.
        plain = "Attack at Dawn!"
        stripped = "".join(c for c in plain if c.isalpha())
        enc_letters = vigenere_encrypt(stripped, "LEMON")
        it = iter(enc_letters)
        expected = "".join(next(it) if c.isalpha() else c for c in plain)
        assert vigenere_encrypt(plain, "LEMON") == expected == "Lxfopv ef Rnhr!"

    def test_digits_punctuation_whitespace_and_unicode_pass_through(self):
        text = "a1 b2\t!c\né你\U0001f600 d"
        out = vigenere_encrypt(text, "KEY")
        assert [c for c in out if not c.isascii() or not c.isalpha()] == [c for c in text if not c.isascii() or not c.isalpha()]
        assert len(out) == len(text)

    def test_non_ascii_letters_do_not_consume_key_letters(self):
        assert vigenere_encrypt("aéb", "BC") == "béd"  # a+B, b+C

    def test_empty_text(self):
        assert vigenere_encrypt("", "KEY") == ""
        assert vigenere_decrypt("", "KEY") == ""

    def test_text_without_letters_is_unchanged(self):
        assert vigenere_encrypt("123 !?", "KEY") == "123 !?"

    def test_key_case_is_irrelevant(self):
        assert vigenere_encrypt("Hello", "lemon") == vigenere_encrypt("Hello", "LEMON") == vigenere_encrypt("Hello", "LeMoN")


class TestRelations:
    @pytest.mark.parametrize("shift", range(26))
    def test_a_single_letter_key_is_a_caesar_cipher(self, shift):
        text = "The Quick Brown Fox, 123!"
        assert vigenere_encrypt(text, chr(65 + shift)) == caesar_encrypt(text, shift)

    def test_the_key_a_repeated_is_the_identity(self):
        assert vigenere_encrypt("Hello, World", "AAAA") == "Hello, World"

    @pytest.mark.parametrize("repeat", [2, 3, 5])
    def test_repeating_the_keyword_changes_nothing(self, repeat):
        text = "Meet me at the old bridge at midnight"
        assert vigenere_encrypt(text, "LEMON" * repeat) == vigenere_encrypt(text, "LEMON")

    def test_a_key_as_long_as_the_text_is_a_one_time_pad_shape(self):
        # With a key as long as the letters every letter uses its own shift.
        assert vigenere_encrypt("AAAA", "BCDE") == "BCDE"


class TestRoundTripAndReference:
    def test_round_trip_for_many_random_texts_and_keys(self):
        rng = random.Random(1618)
        alphabet = string.ascii_letters + string.digits + " .,;!?\né"
        for _ in range(400):
            text = "".join(rng.choice(alphabet) for _ in range(rng.randint(0, 80)))
            key = "".join(rng.choice(string.ascii_letters) for _ in range(rng.randint(1, 12)))
            assert vigenere_decrypt(vigenere_encrypt(text, key), key) == text
            assert vigenere_encrypt(vigenere_decrypt(text, key), key) == text

    def test_matches_an_independent_reference_implementation(self):
        rng = random.Random(2718)
        alphabet = string.ascii_letters + string.digits + " .,;!?\né"
        for _ in range(400):
            text = "".join(rng.choice(alphabet) for _ in range(rng.randint(0, 80)))
            key = "".join(rng.choice(string.ascii_letters) for _ in range(rng.randint(1, 12)))
            assert vigenere_encrypt(text, key) == reference_encrypt(text, key)
            assert vigenere_decrypt(text, key) == reference_encrypt(text, key, sign=-1)

    def test_encryption_changes_exactly_the_letters_with_a_non_a_shift(self):
        out = vigenere_encrypt("abcdef", "AB")
        assert out == "acceeg"
        assert [ord(o) - ord(i) for i, o in zip("abcdef", out)] == [0, 1, 0, 1, 0, 1]


class TestKeyValidation:
    def test_shifts(self):
        assert vigenere_shifts("LEMON") == (11, 4, 12, 14, 13)
        assert vigenere_shifts("az") == (0, 25)

    @pytest.mark.parametrize("bad", ["", "KEY1", "KEY WORD", "KEY!", "kéy", "你", "key\n", " "])
    def test_invalid_keys_raise_without_echoing_the_key(self, bad):
        with pytest.raises(InvalidKeyError) as info:
            vigenere_encrypt("text", bad)
        assert info.value.field == "key"
        assert bad.strip() == "" or bad not in str(info.value)

    @pytest.mark.parametrize("bad", [None, 5, 3.5, ["K"], b"KEY", True])
    def test_non_string_keys_raise(self, bad):
        with pytest.raises(InvalidKeyError):
            vigenere_shifts(bad)

    def test_decrypt_validates_too(self):
        with pytest.raises(InvalidKeyError):
            vigenere_decrypt("text", "")

    def test_a_very_long_keyword_is_fine_in_the_pure_function(self):
        assert vigenere_encrypt("abc", "B" * 10_000) == "bcd"
