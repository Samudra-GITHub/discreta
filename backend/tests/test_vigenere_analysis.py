"""Tests for the Vigenere investigation: key-length ranking and key-letter estimation.

Oracles: the key is known from construction (the ciphertext is made from English with the independently
tested cipher), the index of coincidence of each column is recomputed from the combinatorial definition,
chi-squared is recomputed from ``collections.Counter`` and the raw reference table, and statistical claims
are checked over many seeded random keys.
"""

import itertools
import json
import math
import random
import re
import string
import time
from collections import Counter
from dataclasses import asdict

import pytest

from app.modules.algebra.ciphers import vigenere_decrypt, vigenere_encrypt
from app.modules.analysis import english
from app.modules.analysis import vigenere_analysis as va
from tests.passages import LONG_PASSAGE, VERY_LONG_PASSAGE


def reference_chi_squared(text: str) -> float:
    counts = Counter(c for c in text.upper() if "A" <= c <= "Z")
    n = sum(counts.values())
    total = sum(english.ENGLISH_PERCENT)
    return sum(
        (counts.get(chr(65 + i), 0) - n * english.ENGLISH_PERCENT[i] / total) ** 2 / (n * english.ENGLISH_PERCENT[i] / total)
        for i in range(26)
    )


def brute_ic(letters: str) -> float | None:
    pairs = list(itertools.permutations(range(len(letters)), 2))
    if not pairs:
        return None
    return sum(letters[i] == letters[j] for i, j in pairs) / len(pairs)


def random_key(rng: random.Random, length: int) -> str:
    return "".join(rng.choice(string.ascii_uppercase) for _ in range(length))


class TestKeyLengthRanking:
    def test_the_true_length_is_suggested_for_many_keys(self):
        rng = random.Random(5)
        trials = hits = 0
        for text in (LONG_PASSAGE, VERY_LONG_PASSAGE):
            for m in range(1, 13):
                for _ in range(12):
                    key = random_key(rng, m)
                    analysis = va.analyse_lengths(vigenere_encrypt(text, key))
                    trials += 1
                    hits += analysis.suggested_length == len(va.shortest_period(key))
        assert trials == 288
        assert hits >= 280  # measured 288 of 288 with this seed; allow a little slack

    def test_a_known_key(self):
        analysis = va.analyse_lengths(vigenere_encrypt(VERY_LONG_PASSAGE, "LEMON"))
        assert analysis.suggested_length == 5
        by_length = {r.length: r for r in analysis.lengths}
        assert by_length[5].plausible and by_length[10].plausible
        assert not any(by_length[m].plausible for m in (1, 2, 3, 4, 6, 7, 8, 9))
        assert by_length[5].mean_ic > 0.062
        assert max(by_length[m].mean_ic for m in (1, 2, 3, 4, 6, 7, 8, 9)) < 0.052

    def test_a_single_alphabet_text_suggests_length_one(self):
        assert va.analyse_lengths(VERY_LONG_PASSAGE).suggested_length == 1

    def test_mean_ic_matches_the_combinatorial_definition(self):
        text = vigenere_encrypt("meet me at the old bridge at midnight tonight", "KEY")
        letters = va.letters_only(text)
        analysis = va.analyse_lengths(text)
        for row in analysis.lengths:
            columns = [letters[j :: row.length] for j in range(row.length)]
            ics = [v for v in (brute_ic(c) for c in columns) if v is not None]
            assert row.mean_ic == pytest.approx(sum(ics) / len(ics))
            assert row.smallest_column == min(len(c) for c in columns)

    def test_table_shape(self):
        analysis = va.analyse_lengths(vigenere_encrypt(VERY_LONG_PASSAGE, "SECRET"))
        assert sorted(r.length for r in analysis.lengths) == list(range(1, 21))
        assert [r.rank for r in analysis.lengths] == list(range(1, 21))
        plausible = [r for r in analysis.lengths if r.plausible]
        # Plausible lengths come first, shortest first; the rest follow by mean IC.
        assert list(analysis.lengths[: len(plausible)]) == sorted(plausible, key=lambda r: r.length)
        rest = analysis.lengths[len(plausible) :]
        assert [r.mean_ic for r in rest] == sorted((r.mean_ic for r in rest), reverse=True)

    def test_the_table_never_exceeds_half_the_letters(self):
        analysis = va.analyse_lengths("abcdefghij")  # 10 letters
        assert max(r.length for r in analysis.lengths) == 5

    def test_kasiski_votes_are_attached_to_each_length(self):
        analysis = va.analyse_lengths(vigenere_encrypt(VERY_LONG_PASSAGE, "LEMON"))
        votes = {v.length: v for v in analysis.kasiski.votes}
        for row in analysis.lengths:
            if row.length == 1:
                assert row.kasiski_repeats == 0
            else:
                expected = votes[row.length].repeats if row.length in votes else 0
                assert row.kasiski_repeats == expected

    def test_a_flat_random_text_gets_no_suggestion(self):
        rng = random.Random(2)
        text = "".join(rng.choice(string.ascii_uppercase) for _ in range(600))
        analysis = va.analyse_lengths(text)
        assert analysis.suggested_length is None
        assert "No length reaches" in analysis.note

    def test_short_text_is_flagged_and_stays_finite(self):
        analysis = va.analyse_lengths(vigenere_encrypt("Meet me at the old bridge", "LEMON"))
        assert analysis.reliability in ("very_low", "low")
        assert all(r.mean_ic is None or math.isfinite(r.mean_ic) for r in analysis.lengths)
        json.dumps(asdict(analysis), allow_nan=False)

    @pytest.mark.parametrize("text", ["", "A", "123 !?", "你好", "a1"])
    def test_fewer_than_two_letters_is_rejected(self, text):
        with pytest.raises(va.InsufficientTextError):
            va.analyse_lengths(text)

    def test_two_letters_are_enough_to_compute_without_error(self):
        analysis = va.analyse_lengths("AB")
        assert analysis.letters == 2 and [r.length for r in analysis.lengths] == [1]

    def test_notes_never_claim_certainty(self):
        for text in (vigenere_encrypt(VERY_LONG_PASSAGE, "LEMON"), "abcdefghijkl"):
            note = va.analyse_lengths(text).note.lower()
            assert "guarantee" not in note and "certain" not in note

    def test_ic_section_is_consistent_with_the_text(self):
        analysis = va.analyse_lengths(vigenere_encrypt(VERY_LONG_PASSAGE, "LEMONADE"))
        assert analysis.ic.letters == analysis.letters
        assert analysis.ic.reading in ("flat", "intermediate")
        assert analysis.ic.ic == pytest.approx(brute_ic_fast(va.letters_only(vigenere_encrypt(VERY_LONG_PASSAGE, "LEMONADE"))))


def brute_ic_fast(letters: str) -> float:
    counts = Counter(letters)
    n = len(letters)
    return sum(f * (f - 1) for f in counts.values()) / (n * (n - 1))


class TestKeyLetterEstimation:
    def test_the_true_key_is_ranked_first_when_the_length_is_right(self):
        rng = random.Random(11)
        for text in (LONG_PASSAGE, VERY_LONG_PASSAGE):
            for m in range(1, 13):
                for _ in range(8):
                    key = random_key(rng, m)
                    result = va.analyse_key_length(vigenere_encrypt(text, key), len(va.shortest_period(key)))
                    assert result.candidates[0].key == va.shortest_period(key), (text[:10], key)

    def test_columns_cover_every_letter_once(self):
        result = va.analyse_key_length(vigenere_encrypt(VERY_LONG_PASSAGE, "LEMON"), 5)
        assert [c.position for c in result.columns] == [0, 1, 2, 3, 4]
        assert sum(c.size for c in result.columns) == result.letters

    def test_each_column_estimate_is_the_lowest_chi_squared_shift(self):
        key = "LEMON"
        cipher = vigenere_encrypt(VERY_LONG_PASSAGE, key)
        letters = va.letters_only(cipher)
        result = va.analyse_key_length(cipher, 5)
        for j, column in enumerate(result.columns):
            group = letters[j::5]
            scores = {k: reference_chi_squared("".join(chr((ord(c) - 65 - k) % 26 + 65) for c in group)) for k in range(26)}
            assert column.best.shift == min(scores, key=scores.get) == ord(key[j]) - 65
            assert column.best.chi_squared == pytest.approx(scores[column.best.shift])
            assert [o.chi_squared for o in column.options] == sorted(o.chi_squared for o in column.options)
            assert column.options[0] == column.best
            assert column.separation == pytest.approx(column.options[1].chi_squared / column.options[0].chi_squared)

    def test_candidates_are_valid_ranked_and_decrypt_correctly(self):
        key = "CRYPTO"
        cipher = vigenere_encrypt(VERY_LONG_PASSAGE, key)
        result = va.analyse_key_length(cipher, 6)
        assert 1 < len(result.candidates) <= va.MAX_CANDIDATES
        assert [c.rank for c in result.candidates] == list(range(1, len(result.candidates) + 1))
        sums = [c.column_chi_sum for c in result.candidates]
        assert sums == sorted(sums)
        assert len({c.key for c in result.candidates}) == len(result.candidates)
        for c in result.candidates:
            assert re.fullmatch(r"[A-Z]{6}", c.key)
            assert c.shifts == tuple(ord(ch) - 65 for ch in c.key)
            assert c.plaintext == vigenere_decrypt(cipher, c.key)
            assert c.text_chi_squared == pytest.approx(reference_chi_squared(c.plaintext))
            assert c.column_chi_sum == pytest.approx(
                sum(result.columns[j].options[[o.shift for o in result.columns[j].options].index(s)].chi_squared for j, s in enumerate(c.shifts))
            )
        assert result.candidates[0].key == key
        assert result.candidates[0].plaintext == VERY_LONG_PASSAGE

    def test_the_best_candidate_also_has_the_lowest_text_chi_squared_here(self):
        result = va.analyse_key_length(vigenere_encrypt(VERY_LONG_PASSAGE, "LEMON"), 5)
        best = min(result.candidates, key=lambda c: c.text_chi_squared)
        assert best.key == result.candidates[0].key == "LEMON"

    def test_a_multiple_of_the_true_length_reveals_a_repeated_key(self):
        result = va.analyse_key_length(vigenere_encrypt(VERY_LONG_PASSAGE, "LEMON"), 10)
        assert result.candidates[0].key == "LEMONLEMON"
        assert result.candidates[0].shortest_equivalent_key == "LEMON"

    def test_a_wrong_length_gives_honest_but_wrong_candidates(self):
        result = va.analyse_key_length(vigenere_encrypt(VERY_LONG_PASSAGE, "LEMON"), 3)
        assert result.candidates[0].key != "LEMON"
        assert result.candidates[0].text_chi_squared > 5 * reference_chi_squared(VERY_LONG_PASSAGE)

    def test_a_short_text_is_flagged_not_trusted(self):
        result = va.analyse_key_length(vigenere_encrypt("Meet me at the old bridge", "LEMON"), 5)
        assert result.reliability == "very_low"
        assert all(c.reliability == "very_low" for c in result.columns)
        assert "guess" in result.note

    def test_reliability_follows_the_smallest_column(self):
        long_result = va.analyse_key_length(vigenere_encrypt(VERY_LONG_PASSAGE, "LEMON"), 5)
        assert long_result.reliability == "adequate"
        assert "not proof" in long_result.note

    def test_candidate_keys_are_always_valid_keywords(self):
        rng = random.Random(8)
        for _ in range(20):
            key = random_key(rng, rng.randint(1, 9))
            result = va.analyse_key_length(vigenere_encrypt(LONG_PASSAGE, key), rng.randint(1, 12))
            for c in result.candidates:
                assert re.fullmatch(r"[A-Z]+", c.key)

    def test_non_letters_in_the_ciphertext_are_handled(self):
        text = vigenere_encrypt("Meet me at the old bridge, at midnight! " * 12, "KEY")
        result = va.analyse_key_length(text, 3)
        assert result.letters == sum(c.isalpha() for c in text)

    def test_one_column_is_just_a_caesar_analysis(self):
        from app.modules.algebra.ciphers import caesar_encrypt
        from app.modules.analysis.cryptanalysis import crack_caesar

        cipher = caesar_encrypt(VERY_LONG_PASSAGE, 9)
        result = va.analyse_key_length(cipher, 1)
        assert result.candidates[0].shifts == (crack_caesar(cipher).candidates[0].key,) == (9,)

    @pytest.mark.parametrize("text", ["", "A", "123"])
    def test_too_little_text(self, text):
        with pytest.raises(va.InsufficientTextError):
            va.analyse_key_length(text, 1)

    @pytest.mark.parametrize("length", [0, -1, 41, 1000])
    def test_invalid_key_lengths(self, length):
        with pytest.raises(va.KeyLengthError):
            va.analyse_key_length(LONG_PASSAGE, length)

    def test_key_length_cannot_exceed_the_letters(self):
        with pytest.raises(va.KeyLengthError):
            va.analyse_key_length("abc", 4)
        assert va.analyse_key_length("abc", 3).key_length == 3

    def test_deterministic(self):
        cipher = vigenere_encrypt(LONG_PASSAGE, "LEMON")
        assert va.analyse_key_length(cipher, 5) == va.analyse_key_length(cipher, 5)


class TestShortestPeriod:
    @pytest.mark.parametrize(
        "key, expected",
        [("LEMON", "LEMON"), ("LEMONLEMON", "LEMON"), ("ABAB", "AB"), ("AAAA", "A"), ("ABCAB", "ABCAB"), ("A", "A"), ("ABABAB", "AB")],
    )
    def test_cases(self, key, expected):
        assert va.shortest_period(key) == expected
        assert vigenere_encrypt("Hello world", key) == vigenere_encrypt("Hello world", expected)


class TestLimits:
    def test_the_longest_text_and_longest_key_length_are_fast(self):
        rng = random.Random(1)
        text = vigenere_encrypt("".join(rng.choice(string.ascii_lowercase) for _ in range(10_000)), "SECRETKEY")
        start = time.perf_counter()
        va.analyse_lengths(text)
        va.analyse_key_length(text, 40)
        assert time.perf_counter() - start < 5.0

    def test_results_serialise_without_nan(self):
        cipher = vigenere_encrypt(LONG_PASSAGE, "LEMON")
        json.dumps(asdict(va.analyse_lengths(cipher)), allow_nan=False)
        json.dumps(asdict(va.analyse_key_length(cipher, 5)), allow_nan=False)
