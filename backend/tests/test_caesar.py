import string

import pytest
from sympy.crypto.crypto import decipher_shift, encipher_shift

from app.modules.algebra.ciphers import (
    InvalidKeyError,
    caesar_decrypt,
    caesar_encrypt,
    validate_caesar_key,
)

UPPER = string.ascii_uppercase
LOWER = string.ascii_lowercase
PANGRAM = "The quick brown fox jumps over the lazy dog."


class TestEncryptDecrypt:
    def test_classic_example(self):
        assert caesar_encrypt("HELLO", 3) == "KHOOR"
        assert caesar_decrypt("KHOOR", 3) == "HELLO"

    def test_full_alphabet_shifted_by_one(self):
        assert caesar_encrypt(UPPER, 1) == UPPER[1:] + "A"
        assert caesar_encrypt(LOWER, 1) == LOWER[1:] + "a"

    def test_wraps_around_the_end_of_the_alphabet(self):
        assert caesar_encrypt("XYZ", 3) == "ABC"
        assert caesar_decrypt("ABC", 3) == "XYZ"

    def test_key_zero_is_identity(self):
        assert caesar_encrypt(PANGRAM, 0) == PANGRAM
        assert caesar_decrypt(PANGRAM, 0) == PANGRAM

    def test_rot13_is_its_own_inverse(self):
        once = caesar_encrypt(PANGRAM, 13)
        assert once != PANGRAM
        assert caesar_encrypt(once, 13) == PANGRAM


class TestEdgeInputs:
    def test_empty_string(self):
        assert caesar_encrypt("", 5) == ""
        assert caesar_decrypt("", 5) == ""

    @pytest.mark.parametrize(
        ("char", "key", "expected"),
        [("A", 1, "B"), ("Z", 1, "A"), ("a", 25, "z"), ("z", 1, "a"), ("M", 13, "Z"), ("5", 7, "5"), (" ", 7, " ")],
    )
    def test_single_characters(self, char, key, expected):
        assert caesar_encrypt(char, key) == expected

    def test_case_is_preserved(self):
        assert caesar_encrypt("Hello World", 3) == "Khoor Zruog"
        assert caesar_encrypt("aBcXyZ", 2) == "cDeZaB"

    def test_spaces_punctuation_and_digits_are_preserved(self):
        text = "Hello, World! 123 -- (test) #42?\n\tdone."
        encrypted = caesar_encrypt(text, 5)
        assert encrypted == "Mjqqt, Btwqi! 123 -- (yjxy) #42?\n\titsj."
        for original, new in zip(text, encrypted, strict=True):
            if not original.isascii() or not original.isalpha():
                assert original == new

    def test_non_ascii_characters_are_left_alone(self):
        text = "café Ünïcödé 日本語 😀"
        # Only the plain ASCII letters change.
        assert caesar_encrypt(text, 1) == "dbgé Üoïdöeé 日本語 😀"
        assert caesar_decrypt(caesar_encrypt(text, 1), 1) == text


class TestKeyHandling:
    def test_negative_key_shifts_backwards(self):
        assert caesar_encrypt("DEF", -3) == "ABC"
        assert caesar_encrypt("ABC", -1) == "ZAB"

    def test_negative_key_equals_its_residue(self):
        for key in range(-80, 0):
            assert caesar_encrypt(PANGRAM, key) == caesar_encrypt(PANGRAM, key % 26)

    def test_negative_key_encrypts_like_decrypting_with_the_opposite_key(self):
        for key in range(-60, 61):
            assert caesar_encrypt(PANGRAM, -key) == caesar_decrypt(PANGRAM, key)

    @pytest.mark.parametrize("key", [26, 52, -26, 26 * 10**6])
    def test_multiples_of_26_are_identity(self, key):
        assert caesar_encrypt(PANGRAM, key) == PANGRAM

    @pytest.mark.parametrize(
        ("key", "residue"),
        [(27, 1), (1000, 12), (-27, 25), (10**18 + 3, (10**18 + 3) % 26), (-(10**30), (-(10**30)) % 26)],
    )
    def test_oversized_keys_reduce_mod_26(self, key, residue):
        assert caesar_encrypt(PANGRAM, key) == caesar_encrypt(PANGRAM, residue)
        assert validate_caesar_key(key) == residue

    @pytest.mark.parametrize("bad", ["3", 3.0, 3.5, None, True, False, [3], (3,)])
    def test_non_integer_keys_are_rejected(self, bad):
        with pytest.raises(InvalidKeyError, match="integer"):
            caesar_encrypt("abc", bad)
        with pytest.raises(InvalidKeyError):
            caesar_decrypt("abc", bad)

    def test_invalid_key_error_is_a_value_error(self):
        assert issubclass(InvalidKeyError, ValueError)


class TestRoundTripAndProperties:
    def test_round_trip_for_a_wide_range_of_keys(self):
        for key in range(-130, 131):
            assert caesar_decrypt(caesar_encrypt(PANGRAM, key), key) == PANGRAM
            assert caesar_encrypt(caesar_decrypt(PANGRAM, key), key) == PANGRAM

    def test_round_trip_with_mixed_content(self):
        text = "Mixed CASE, digits 0123456789, and symbols !@#$%^&*() é日"
        for key in (0, 1, 13, 25, 26, -7, 1000):
            assert caesar_decrypt(caesar_encrypt(text, key), key) == text

    def test_composition_adds_the_keys(self):
        for k1 in range(-30, 31, 3):
            for k2 in range(-30, 31, 5):
                assert caesar_encrypt(caesar_encrypt(PANGRAM, k1), k2) == caesar_encrypt(PANGRAM, k1 + k2)

    def test_each_of_the_26_keys_gives_a_distinct_ciphertext(self):
        assert len({caesar_encrypt(UPPER, k) for k in range(26)}) == 26

    def test_brute_force_over_all_26_keys_recovers_the_plaintext(self):
        ciphertext = caesar_encrypt("ATTACK AT DAWN", 11)
        assert "ATTACK AT DAWN" in {caesar_decrypt(ciphertext, k) for k in range(26)}

    def test_length_is_preserved(self):
        assert len(caesar_encrypt(PANGRAM, 9)) == len(PANGRAM)


class TestAgainstSymPy:
    """SymPy's ``encipher_shift`` works on upper-case letters only, so compare on those."""

    @pytest.mark.parametrize("key", range(0, 26))
    def test_encryption_matches_sympy(self, key):
        plain = "THEQUICKBROWNFOXJUMPSOVERTHELAZYDOG"
        assert caesar_encrypt(plain, key) == encipher_shift(plain, key)

    @pytest.mark.parametrize("key", range(0, 26))
    def test_decryption_matches_sympy(self, key):
        cipher = "WKHTXLFNEURZQIRAMXPSVRYHUWKHODCBGRJ"
        assert caesar_decrypt(cipher, key) == decipher_shift(cipher, key)

    @pytest.mark.parametrize("key", [-1, -13, -26, -27, 27, 52, 100])
    def test_out_of_range_keys_match_sympy_on_their_residue(self, key):
        plain = "ABCXYZ"
        assert caesar_encrypt(plain, key) == encipher_shift(plain, key % 26)


ASCII_TABLE = "".join(chr(code) for code in range(128))
ASCII_LETTERS = frozenset(string.ascii_letters)


def rotation_table(shift):
    """Independent oracle: rotate the literal alphabets with str.translate (no modular formula)."""
    k = shift % 26
    return str.maketrans(UPPER + LOWER, UPPER[k:] + UPPER[:k] + LOWER[k:] + LOWER[:k])


class TestAsciiBoundaries:
    """Only ASCII A-Z and a-z may change. The characters next to the letter ranges are the
    classic off-by-one victims: '@' (before A), '[' (after Z), backtick (before a), '{' (after z)."""

    def test_neighbours_of_the_letter_ranges_are_never_transformed(self):
        assert caesar_encrypt("@AZ[`az{", 5) == "@FE[`fe{"
        assert caesar_decrypt("@FE[`fe{", 5) == "@AZ[`az{"

    @pytest.mark.parametrize("char", ["@", "[", "`", "{"])
    @pytest.mark.parametrize("key", [1, 5, 13, 25, -1, -27, 1000])
    def test_each_boundary_character_is_unchanged(self, char, key):
        assert caesar_encrypt(char, key) == char
        assert caesar_decrypt(char, key) == char
        assert caesar_encrypt(char * 3 + "a" + char, key) == char * 3 + caesar_encrypt("a", key) + char

    @pytest.mark.parametrize("key", [1, 5, 13, 25, -1, -27, 1000])
    def test_all_128_ascii_characters(self, key):
        encrypted = caesar_encrypt(ASCII_TABLE, key)

        assert len(encrypted) == 128
        assert encrypted == ASCII_TABLE.translate(rotation_table(key))
        for original, new in zip(ASCII_TABLE, encrypted, strict=True):
            if original in ASCII_LETTERS:
                assert new in ASCII_LETTERS and new != original  # none of these keys is a multiple of 26
                assert new.isupper() == original.isupper()  # case is kept
            else:
                assert new == original  # every non-letter, control characters included
        assert caesar_decrypt(encrypted, key) == ASCII_TABLE

    def test_exactly_the_52_ascii_letters_change(self):
        encrypted = caesar_encrypt(ASCII_TABLE, 1)

        changed = {o for o, n in zip(ASCII_TABLE, encrypted, strict=True) if o != n}
        assert changed == set(UPPER + LOWER)
        assert len(changed) == 52

    def test_key_zero_changes_no_character_at_all(self):
        assert caesar_encrypt(ASCII_TABLE, 0) == ASCII_TABLE
        assert caesar_decrypt(ASCII_TABLE, 26) == ASCII_TABLE

    def test_carriage_return_nul_and_del_are_preserved(self):
        text = "a\r\nb\x00c\x7fd"
        assert caesar_encrypt(text, 1) == "b\r\nc\x00d\x7fe"
