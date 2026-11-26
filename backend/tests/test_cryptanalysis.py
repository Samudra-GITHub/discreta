"""Tests for the Caesar and affine statistical key search.

Oracles: the plaintexts come from the independently tested cipher functions, scores are
cross-checked against the chi-squared of the really decrypted text (via ``Counter``), and
sizes and key sets are literals.
"""

import math
from collections import Counter

import pytest

from app.modules.algebra import ciphers
from app.modules.analysis import cryptanalysis as ca
from app.modules.analysis import english, scoring
from tests.passages import LONG_PASSAGE, PANGRAM, SHORT_PASSAGE

VALID_A = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25]


def reference_chi_squared(text: str) -> float:
    """chi-squared of a text, computed from scratch with Counter and the raw table."""
    counts = Counter(c for c in text.upper() if "A" <= c <= "Z")
    n = sum(counts.values())
    total = sum(english.ENGLISH_PERCENT)
    result = 0.0
    for i in range(26):
        e = n * english.ENGLISH_PERCENT[i] / total
        result += (counts.get(chr(65 + i), 0) - e) ** 2 / e
    return result


# --------------------------------------------------------------------------- Caesar


class TestCaesarCrack:
    def test_returns_all_26_keys_exactly_once(self):
        result = ca.crack_caesar(ciphers.caesar_encrypt(LONG_PASSAGE, 5))
        assert sorted(c.key for c in result.candidates) == list(range(26))

    def test_candidates_are_sorted_best_first_with_consecutive_ranks(self):
        result = ca.crack_caesar(ciphers.caesar_encrypt(LONG_PASSAGE, 5))
        scores = [c.chi_squared for c in result.candidates]
        assert scores == sorted(scores)
        assert [c.rank for c in result.candidates] == list(range(1, 27))

    @pytest.mark.parametrize("key", range(26))
    def test_recovers_every_key_from_a_long_text(self, key):
        result = ca.crack_caesar(ciphers.caesar_encrypt(LONG_PASSAGE, key))
        assert result.candidates[0].key == key
        assert result.candidates[0].plaintext == LONG_PASSAGE

    def test_known_example(self):
        # "Khoor, Zruog!" style text is too short to rank reliably, so use a real passage.
        ciphertext = ciphers.caesar_encrypt("Attack the northern gate at dawn with all of the soldiers", 11)
        result = ca.crack_caesar(ciphertext)
        assert result.candidates[0].key == 11
        assert result.candidates[0].plaintext == "Attack the northern gate at dawn with all of the soldiers"

    def test_scores_match_the_chi_squared_of_the_decrypted_text(self):
        ciphertext = ciphers.caesar_encrypt(LONG_PASSAGE, 9)
        for candidate in ca.crack_caesar(ciphertext).candidates:
            decrypted = ciphers.caesar_decrypt(ciphertext, candidate.key)
            assert candidate.plaintext == decrypted
            assert candidate.chi_squared == pytest.approx(reference_chi_squared(decrypted))

    def test_key_zero_scores_the_ciphertext_itself(self):
        ciphertext = "Wkh txlfn eurzq ira"
        by_key = {c.key: c for c in ca.crack_caesar(ciphertext).candidates}
        assert by_key[0].plaintext == ciphertext
        assert by_key[0].chi_squared == pytest.approx(reference_chi_squared(ciphertext))

    def test_case_punctuation_and_spacing_are_preserved_in_candidates(self):
        ciphertext = ciphers.caesar_encrypt("Hello, World! It's 2024.\nNew line.", 4)
        best = ca.crack_caesar(ciphertext).candidates[0]
        for candidate in ca.crack_caesar(ciphertext).candidates:
            assert len(candidate.plaintext) == len(ciphertext)
        assert best.plaintext.count("\n") == 1 and "2024" in best.plaintext

    def test_non_letters_do_not_change_the_ranking(self):
        ciphertext = ciphers.caesar_encrypt(LONG_PASSAGE, 3)
        noisy = ciphertext.replace(" ", " 1234 !!! ")
        clean = [c.key for c in ca.crack_caesar(ciphertext).candidates]
        assert [c.key for c in ca.crack_caesar(noisy).candidates] == clean

    def test_letters_counted(self):
        assert ca.crack_caesar("ab, cd!").letters == 4
        assert ca.crack_caesar(LONG_PASSAGE).letters == 459

    def test_separation_is_runner_up_over_best(self):
        result = ca.crack_caesar(ciphers.caesar_encrypt(LONG_PASSAGE, 12))
        assert result.separation == pytest.approx(
            result.candidates[1].chi_squared / result.candidates[0].chi_squared
        )
        assert result.separation > 1.5

    def test_text_without_letters_is_rejected(self):
        for text in ("", "   ", "123 !?", "你好"):
            with pytest.raises(ca.NoLettersError):
                ca.crack_caesar(text)

    def test_ranking_is_deterministic(self):
        ciphertext = ciphers.caesar_encrypt(LONG_PASSAGE, 8)
        assert ca.crack_caesar(ciphertext) == ca.crack_caesar(ciphertext)

    def test_a_single_letter_still_produces_a_ranking_but_is_flagged(self):
        result = ca.crack_caesar("Q")
        assert len(result.candidates) == 26
        assert result.reliability == "very_low"


class TestShortTexts:
    def test_reliability_thresholds(self):
        assert ca.reliability_for(0, ca.CAESAR_THRESHOLDS) == "very_low"
        assert ca.reliability_for(19, ca.CAESAR_THRESHOLDS) == "very_low"
        assert ca.reliability_for(20, ca.CAESAR_THRESHOLDS) == "low"
        assert ca.reliability_for(59, ca.CAESAR_THRESHOLDS) == "low"
        assert ca.reliability_for(60, ca.CAESAR_THRESHOLDS) == "adequate"
        assert ca.reliability_for(49, ca.AFFINE_THRESHOLDS) == "very_low"
        assert ca.reliability_for(149, ca.AFFINE_THRESHOLDS) == "low"
        assert ca.reliability_for(150, ca.AFFINE_THRESHOLDS) == "adequate"

    def test_long_text_is_adequate_and_short_is_not(self):
        assert ca.crack_caesar(ciphers.caesar_encrypt(LONG_PASSAGE, 1)).reliability == "adequate"
        assert ca.crack_caesar(ciphers.caesar_encrypt(SHORT_PASSAGE, 1)).reliability == "low"
        assert ca.crack_caesar("Khoor").reliability == "very_low"

    def test_a_short_text_can_rank_the_true_key_first_but_often_cannot(self):
        # Two letters: the ranking is dominated by chance. This documents the limitation:
        # for every one of the 26 keys the top candidate was NOT the key used for "Go".
        wrong = [
            k
            for k in range(26)
            if ca.crack_caesar(ciphers.caesar_encrypt("Go", k)).candidates[0].key != k
        ]
        assert len(wrong) > 13

    def test_notes_mention_the_text_length_and_never_claim_certainty(self):
        for text, expect in (("Khoor", "5 letters"), (LONG_PASSAGE, "459 letters")):
            note = ca.crack_caesar(text).note
            assert expect in note
            assert "guaranteed" not in note.lower()
        assert "not proof" in ca.crack_caesar(LONG_PASSAGE).note


# --------------------------------------------------------------------------- affine


class TestAffineSearch:
    @pytest.fixture(scope="class")
    def result(self):
        return ca.search_affine(ciphers.affine_encrypt(LONG_PASSAGE, 5, 8), plaintext_limit=312)

    def test_ranks_exactly_312_distinct_valid_keys(self, result):
        keys = [(c.a, c.b) for c in result.candidates]
        assert len(keys) == 312 == len(set(keys))
        assert ca.AFFINE_KEY_SPACE == 312

    def test_the_key_set_is_every_coprime_multiplier_with_every_offset(self, result):
        assert {(c.a, c.b) for c in result.candidates} == {
            (a, b) for a in range(26) if math.gcd(a, 26) == 1 for b in range(26)
        }
        assert sorted({c.a for c in result.candidates}) == VALID_A

    def test_no_invalid_multiplier_is_ever_generated(self, result):
        assert all(math.gcd(c.a, 26) == 1 for c in result.candidates)
        assert not any(c.a % 2 == 0 or c.a == 13 for c in result.candidates)

    def test_each_multiplier_appears_with_all_26_offsets(self, result):
        by_a = Counter(c.a for c in result.candidates)
        assert set(by_a.values()) == {26} and len(by_a) == 12

    def test_inverse_is_correct(self, result):
        assert all((c.a * c.a_inverse) % 26 == 1 for c in result.candidates)
        assert all(c.a_inverse == pow(c.a, -1, 26) for c in result.candidates)

    def test_sorted_best_first_with_consecutive_ranks(self, result):
        scores = [c.chi_squared for c in result.candidates]
        assert scores == sorted(scores)
        assert [c.rank for c in result.candidates] == list(range(1, 313))

    def test_recovers_the_key(self, result):
        best = result.candidates[0]
        assert (best.a, best.b) == (5, 8)
        assert best.plaintext == LONG_PASSAGE

    def test_scores_match_the_chi_squared_of_the_decrypted_text(self, result):
        ciphertext = ciphers.affine_encrypt(LONG_PASSAGE, 5, 8)
        for candidate in result.candidates:
            decrypted = ciphers.affine_decrypt(ciphertext, candidate.a, candidate.b)
            assert candidate.plaintext == decrypted
            assert candidate.chi_squared == pytest.approx(reference_chi_squared(decrypted))

    def test_the_identity_key_is_among_the_candidates(self, result):
        ciphertext = ciphers.affine_encrypt(LONG_PASSAGE, 5, 8)
        identity = next(c for c in result.candidates if (c.a, c.b) == (1, 0))
        assert identity.plaintext == ciphertext

    def test_every_one_of_the_312_keys_is_recovered_from_a_long_text(self):
        wrong = []
        for a in VALID_A:
            for b in range(26):
                best = ca.search_affine(ciphers.affine_encrypt(LONG_PASSAGE, a, b), 0).candidates[0]
                if (best.a, best.b) != (a, b):
                    wrong.append(((a, b), (best.a, best.b)))
        assert wrong == []

    def test_plaintext_limit_controls_which_candidates_carry_text(self):
        ciphertext = ciphers.affine_encrypt(LONG_PASSAGE, 3, 4)
        for limit in (0, 1, 20, 311, 312):
            search = ca.search_affine(ciphertext, limit)
            assert len(search.candidates) == 312
            assert search.plaintexts_included == limit
            assert [c.plaintext is not None for c in search.candidates] == [i < limit for i in range(312)]

    def test_negative_limit_is_rejected(self):
        with pytest.raises(ValueError):
            ca.search_affine("abc", -1)

    def test_no_letters_is_rejected(self):
        with pytest.raises(ca.NoLettersError):
            ca.search_affine("12345")

    def test_reliability_uses_the_stricter_affine_thresholds(self):
        medium = ca.search_affine(ciphers.affine_encrypt(LONG_PASSAGE[:100], 5, 8))
        assert medium.reliability == "low"
        assert ca.search_affine(ciphers.affine_encrypt(LONG_PASSAGE, 5, 8)).reliability == "adequate"
        assert ca.search_affine("Khoor").reliability == "very_low"

    def test_a_pangram_defeats_the_method(self):
        # A pangram uses all letters about equally, so it does not look like English.
        # The true key is not ranked first for any of the 312 keys: the statistic is an
        # estimate, not a proof.
        correct = 0
        for a in VALID_A:
            for b in range(26):
                best = ca.search_affine(ciphers.affine_encrypt(PANGRAM, a, b), 0).candidates[0]
                correct += (best.a, best.b) == (a, b)
        assert correct < 312 // 10

    def test_scores_are_never_nan_or_negative(self, result):
        assert all(c.chi_squared >= 0 and not math.isnan(c.chi_squared) for c in result.candidates)


class TestScoreHelpers:
    def test_caesar_scores_agree_with_scoring_module(self):
        counts = [0] * 26
        counts[0] = 10
        scores = ca.caesar_scores(counts)
        assert scores[0] == pytest.approx(scoring.chi_squared(counts, english.ENGLISH_PROPORTIONS))

    def test_a_ciphertext_made_only_of_e_is_best_decrypted_as_e(self):
        counts = [0] * 26
        counts[10] = 50  # ciphertext is all 'K'; with k = 6 it decrypts to 'E'
        scores = ca.caesar_scores(counts)
        assert min(scores, key=scores.get) == 6
