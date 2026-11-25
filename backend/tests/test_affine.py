import math
import string

import pytest
import sympy
from sympy.crypto.crypto import decipher_affine, encipher_affine

from app.modules.algebra.ciphers import (
    VALID_AFFINE_A,
    InvalidKeyError,
    affine_decrypt,
    affine_encrypt,
    caesar_encrypt,
    validate_affine_key,
)
from app.modules.algebra.number_theory import mod_inverse

UPPER = string.ascii_uppercase
LOWER = string.ascii_lowercase
PANGRAM = "The quick brown fox jumps over the lazy dog."
EXPECTED_VALID_A = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25]
INVALID_A_RESIDUES = [a for a in range(26) if a not in EXPECTED_VALID_A]


class TestValidMultipliers:
    def test_there_are_exactly_twelve_valid_multipliers(self):
        assert list(VALID_AFFINE_A) == EXPECTED_VALID_A
        assert len(VALID_AFFINE_A) == 12

    def test_count_equals_eulers_totient_of_26(self):
        assert len(VALID_AFFINE_A) == int(sympy.totient(26)) == 12

    def test_valid_multipliers_are_exactly_the_units_of_z26(self):
        assert list(VALID_AFFINE_A) == [a for a in range(26) if math.gcd(a, 26) == 1]

    def test_total_key_count_is_312(self):
        assert len(VALID_AFFINE_A) * 26 == 312


class TestKnownExamples:
    def test_classic_example_encrypt(self):
        assert affine_encrypt("AFFINE CIPHER", 5, 8) == "IHHWVC SWFRCP"

    def test_classic_example_decrypt(self):
        assert affine_decrypt("IHHWVC SWFRCP", 5, 8) == "AFFINE CIPHER"

    def test_single_letter_by_hand(self):
        # x = 'C' = 2:  (5*2 + 8) mod 26 = 18 = 'S'
        assert affine_encrypt("C", 5, 8) == "S"
        # y = 'S' = 18: 21 * (18 - 8) mod 26 = 210 mod 26 = 2 = 'C'
        assert affine_decrypt("S", 5, 8) == "C"

    def test_a_equals_one_is_the_caesar_cipher(self):
        for b in range(-30, 31):
            assert affine_encrypt(PANGRAM, 1, b) == caesar_encrypt(PANGRAM, b)

    def test_a_equals_25_is_the_atbash_reflection_when_b_is_25(self):
        assert affine_encrypt(UPPER, 25, 25) == UPPER[::-1]


class TestAllTwelveValidMultipliers:
    @pytest.mark.parametrize("a", EXPECTED_VALID_A)
    def test_round_trip_for_every_b(self, a):
        for b in range(26):
            assert affine_decrypt(affine_encrypt(PANGRAM, a, b), a, b) == PANGRAM
            assert affine_encrypt(affine_decrypt(PANGRAM, a, b), a, b) == PANGRAM

    @pytest.mark.parametrize("a", EXPECTED_VALID_A)
    def test_encryption_is_a_permutation_of_the_alphabet(self, a):
        for b in (0, 1, 7, 25):
            assert sorted(affine_encrypt(UPPER, a, b)) == list(UPPER)
            assert sorted(affine_encrypt(LOWER, a, b)) == list(LOWER)

    @pytest.mark.parametrize("a", EXPECTED_VALID_A)
    def test_decryption_uses_the_modular_inverse(self, a):
        inverse = mod_inverse(a, 26)
        assert (a * inverse) % 26 == 1
        # decrypting with (a, b) is the same map as encrypting with (a^-1, -a^-1 * b)
        for b in (0, 3, 20):
            assert affine_decrypt(PANGRAM, a, b) == affine_encrypt(PANGRAM, inverse, -inverse * b)

    @pytest.mark.parametrize("a", EXPECTED_VALID_A)
    def test_matches_sympy_for_every_key_with_this_a(self, a):
        plain = "THEQUICKBROWNFOXJUMPSOVERTHELAZYDOG"
        for b in range(26):
            cipher = affine_encrypt(plain, a, b)
            assert cipher == encipher_affine(plain, (a, b))
            assert affine_decrypt(cipher, a, b) == decipher_affine(cipher, (a, b)) == plain

    @pytest.mark.parametrize("a", EXPECTED_VALID_A)
    def test_sympy_modular_inverse_agrees(self, a):
        assert mod_inverse(a, 26) == int(sympy.mod_inverse(a, 26))


class TestInvalidMultipliers:
    @pytest.mark.parametrize("a", INVALID_A_RESIDUES)
    def test_every_non_coprime_residue_is_rejected(self, a):
        for operation in (affine_encrypt, affine_decrypt):
            with pytest.raises(InvalidKeyError) as info:
                operation("hello", a, 3)
            message = str(info.value)
            assert f"gcd({a}, 26) = {math.gcd(a, 26)}" in message
            assert "not coprime" in message
            assert "1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25" in message

    @pytest.mark.parametrize("a", [0, 26, 52, -26, 13 * 26, 2, -2, 13, -13])
    def test_zero_even_and_thirteen_multiples_are_rejected(self, a):
        with pytest.raises(InvalidKeyError):
            affine_encrypt("hello", a, 0)

    def test_message_names_the_actual_gcd(self):
        with pytest.raises(InvalidKeyError, match=r"gcd\(13, 26\) = 13"):
            affine_encrypt("x", 13, 0)
        with pytest.raises(InvalidKeyError, match=r"gcd\(4, 26\) = 2"):
            affine_encrypt("x", 4, 0)

    def test_invalid_multipliers_really_are_not_injective(self):
        """The validation rule is not arbitrary: a non-unit a makes x -> a*x + b collide."""
        for a in INVALID_A_RESIDUES:
            images = [(a * x + 5) % 26 for x in range(26)]
            assert len(set(images)) < 26

    def test_valid_multipliers_really_are_injective(self):
        for a in EXPECTED_VALID_A:
            images = [(a * x + 5) % 26 for x in range(26)]
            assert len(set(images)) == 26

    def test_validation_happens_even_for_empty_text(self):
        with pytest.raises(InvalidKeyError):
            affine_encrypt("", 2, 0)

    @pytest.mark.parametrize("bad", ["5", 5.0, 5.5, None, True, False, [5]])
    def test_non_integer_a_or_b_is_rejected(self, bad):
        with pytest.raises(InvalidKeyError, match="integer"):
            affine_encrypt("abc", bad, 1)
        with pytest.raises(InvalidKeyError, match="integer"):
            affine_encrypt("abc", 5, bad)
        with pytest.raises(InvalidKeyError):
            affine_decrypt("abc", bad, 1)

    def test_error_is_a_value_error(self):
        assert issubclass(InvalidKeyError, ValueError)


class TestKeyReduction:
    def test_validate_returns_residues(self):
        assert validate_affine_key(5, 8) == (5, 8)
        assert validate_affine_key(31, -1) == (5, 25)
        assert validate_affine_key(-1, 26) == (25, 0)

    def test_a_congruent_to_a_valid_residue_is_accepted_and_equivalent(self):
        assert affine_encrypt(PANGRAM, 5 + 26, 8) == affine_encrypt(PANGRAM, 5, 8)
        assert affine_encrypt(PANGRAM, 5 - 26, 8) == affine_encrypt(PANGRAM, 5, 8)
        assert affine_encrypt(PANGRAM, -1, 3) == affine_encrypt(PANGRAM, 25, 3)

    @pytest.mark.parametrize("b", [-1, -27, 26, 27, 1000, 10**18 + 5, -(10**30)])
    def test_negative_and_oversized_b_reduce_mod_26(self, b):
        assert affine_encrypt(PANGRAM, 5, b) == affine_encrypt(PANGRAM, 5, b % 26)
        assert affine_decrypt(PANGRAM, 5, b) == affine_decrypt(PANGRAM, 5, b % 26)

    def test_huge_valid_a(self):
        a = 10**30 + 1  # 10**30 + 1 is odd and not a multiple of 13
        assert math.gcd(a, 26) == 1
        assert affine_encrypt("abc", a, 0) == affine_encrypt("abc", a % 26, 0)


class TestEdgeInputs:
    def test_empty_string(self):
        assert affine_encrypt("", 5, 8) == ""
        assert affine_decrypt("", 5, 8) == ""

    @pytest.mark.parametrize(
        ("char", "expected"), [("A", "I"), ("a", "i"), ("Z", "D"), ("z", "d"), ("1", "1"), (" ", " "), ("!", "!")]
    )
    def test_single_characters(self, char, expected):
        assert affine_encrypt(char, 5, 8) == expected

    def test_mixed_case_is_preserved(self):
        encrypted = affine_encrypt("Affine Cipher", 5, 8)
        assert encrypted == "Ihhwvc Swfrcp"
        assert affine_decrypt(encrypted, 5, 8) == "Affine Cipher"

    def test_spaces_punctuation_and_digits_are_preserved(self):
        text = "Hello, World! 2026 -- (a*x+b) #1?\n\tEnd."
        encrypted = affine_encrypt(text, 7, 3)
        for original, new in zip(text, encrypted, strict=True):
            if not (original.isascii() and original.isalpha()):
                assert original == new
        assert affine_decrypt(encrypted, 7, 3) == text

    def test_non_ascii_characters_are_left_alone(self):
        text = "naïve café 日本語 😀 ÀÉ"
        assert affine_decrypt(affine_encrypt(text, 9, 4), 9, 4) == text
        for ch in "ïé日本語😀ÀÉ":
            assert ch in affine_encrypt(text, 9, 4)

    def test_length_is_preserved(self):
        assert len(affine_encrypt(PANGRAM, 11, 2)) == len(PANGRAM)


ASCII_TABLE = "".join(chr(code) for code in range(128))
ASCII_LETTERS = frozenset(string.ascii_letters)
ASCII_KEYS = [(5, 8), (3, 0), (25, 25), (7, -3), (11, 79), (1, 1), (9, 26), (17, -(10**15))]


def affine_tables(a, b):
    """Independent oracle: build the substitution by formula, and invert it by swapping the
    dictionary, so decryption never uses a modular inverse."""
    forward = {}
    for i in range(26):
        j = (a * i + b) % 26
        forward[ord(UPPER[i])] = ord(UPPER[j])
        forward[ord(LOWER[i])] = ord(LOWER[j])
    backward = {v: k for k, v in forward.items()}
    return forward, backward


class TestAsciiBoundaries:
    """Only ASCII A-Z and a-z may change; see the matching class in test_caesar.py."""

    def test_neighbours_of_the_letter_ranges_are_never_transformed(self):
        # A->I, Z->D, a->i, z->d under (5, 8)
        assert affine_encrypt("@AZ[`az{", 5, 8) == "@ID[`id{"
        assert affine_decrypt("@ID[`id{", 5, 8) == "@AZ[`az{"

    @pytest.mark.parametrize("char", ["@", "[", "`", "{"])
    @pytest.mark.parametrize(("a", "b"), ASCII_KEYS)
    def test_each_boundary_character_is_unchanged(self, char, a, b):
        assert affine_encrypt(char, a, b) == char
        assert affine_decrypt(char, a, b) == char

    @pytest.mark.parametrize(("a", "b"), ASCII_KEYS)
    def test_all_128_ascii_characters(self, a, b):
        forward, backward = affine_tables(a, b)

        encrypted = affine_encrypt(ASCII_TABLE, a, b)

        assert len(encrypted) == 128
        assert encrypted == ASCII_TABLE.translate(forward)
        for original, new in zip(ASCII_TABLE, encrypted, strict=True):
            if original in ASCII_LETTERS:
                assert new in ASCII_LETTERS
                assert new.isupper() == original.isupper()
            else:
                assert new == original
        assert affine_decrypt(encrypted, a, b) == ASCII_TABLE
        assert affine_decrypt(encrypted, a, b) == encrypted.translate(backward)

    @pytest.mark.parametrize(("a", "b"), ASCII_KEYS)
    def test_the_52_letters_are_permuted_among_themselves(self, a, b):
        encrypted = affine_encrypt(UPPER + LOWER, a, b)

        assert sorted(encrypted[:26]) == list(UPPER)
        assert sorted(encrypted[26:]) == list(LOWER)

    def test_exactly_the_52_ascii_letters_change_under_a_derangement(self):
        # Under (3, 1) no letter maps to itself (3x + 1 = x has no solution mod 26), so every
        # letter changes and nothing else does.
        encrypted = affine_encrypt(ASCII_TABLE, 3, 1)

        changed = {o for o, n in zip(ASCII_TABLE, encrypted, strict=True) if o != n}
        assert changed == set(UPPER + LOWER)


class TestInvalidMultipliersWhateverBIs:
    """Validation must depend on a alone: vary b widely, including negative and huge values."""

    B_VALUES = [-(10**30), -(10**15), -27, -26, -1, 0, 1, 7, 13, 25, 26, 27, 10**15, 10**30]
    INVALID = INVALID_A_RESIDUES + [-2, -13, -26, 26, 28, 52, 13 * 26 * 10**6, 2 * 10**15]

    @pytest.mark.parametrize("a", INVALID)
    def test_rejected_for_every_b_in_both_directions(self, a):
        for b in self.B_VALUES:
            for operation in (affine_encrypt, affine_decrypt):
                with pytest.raises(InvalidKeyError, match="not coprime"):
                    operation("Hello", a, b)

    @pytest.mark.parametrize("a", EXPECTED_VALID_A + [-1, 27, 51, -25, 10**15 + 3])
    def test_accepted_for_every_b(self, a):
        assert math.gcd(a, 26) == 1
        for b in self.B_VALUES:
            assert affine_decrypt(affine_encrypt("Hello", a, b), a, b) == "Hello"

    def test_the_error_names_the_field(self):
        with pytest.raises(InvalidKeyError) as info:
            affine_encrypt("x", 2, 0)
        assert info.value.field == "a"
        with pytest.raises(InvalidKeyError) as info:
            affine_encrypt("x", 5, "0")
        assert info.value.field == "b"
