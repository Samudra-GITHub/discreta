"""Tests for the index of coincidence.

Oracles: hand-computed fractions, the combinatorial definition by brute force over pairs of positions
(``itertools.permutations``), and exact arithmetic with ``fractions``.
"""

import itertools
import json
import math
import random
import string
from collections import Counter
from fractions import Fraction

import pytest

from app.modules.analysis import coincidence as co
from app.modules.analysis import english, frequency
from app.modules.analysis.vigenere_analysis import analyse_ic
from tests.passages import LONG_PASSAGE


def brute_force_ic(text: str) -> Fraction | None:
    """The definition: the chance that two distinct random positions hold the same letter."""
    letters = [c for c in text.upper() if "A" <= c <= "Z"]
    pairs = list(itertools.permutations(range(len(letters)), 2))
    if not pairs:
        return None
    return Fraction(sum(letters[i] == letters[j] for i, j in pairs), len(pairs))


class TestIndexOfCoincidence:
    def test_hand_computed_examples(self):
        # AAB: (2*1 + 1*0) / (3*2) = 1/3
        assert co.index_of_coincidence([2, 1] + [0] * 24) == pytest.approx(1 / 3)
        # AABB: (2 + 2) / (4*3) = 1/3
        assert co.index_of_coincidence([2, 2] + [0] * 24) == pytest.approx(1 / 3)
        # All letters distinct: no pair matches.
        assert co.index_of_coincidence([1] * 26) == 0.0
        # One letter repeated: every pair matches.
        assert co.index_of_coincidence([5] + [0] * 25) == 1.0

    def test_matches_the_combinatorial_definition_on_random_texts(self):
        rng = random.Random(31)
        for _ in range(60):
            text = "".join(rng.choice("ABCDEFG") for _ in range(rng.randint(2, 14)))
            counts = frequency.letter_counts(text)
            assert co.index_of_coincidence(counts) == pytest.approx(float(brute_force_ic(text)))

    def test_matches_exact_fractions_on_a_long_text(self):
        counts = Counter(c for c in LONG_PASSAGE.upper() if "A" <= c <= "Z")
        n = sum(counts.values())
        exact = Fraction(sum(f * (f - 1) for f in counts.values()), n * (n - 1))
        assert co.index_of_coincidence(frequency.letter_counts(LONG_PASSAGE)) == pytest.approx(float(exact))

    def test_english_text_is_near_the_english_reference(self):
        ic = co.index_of_coincidence(frequency.letter_counts(LONG_PASSAGE))
        assert 0.060 < ic < 0.075

    def test_random_letters_are_near_one_twenty_sixth(self):
        rng = random.Random(7)
        text = "".join(rng.choice(string.ascii_uppercase) for _ in range(20_000))
        assert co.index_of_coincidence(frequency.letter_counts(text)) == pytest.approx(1 / 26, abs=0.002)

    def test_a_caesar_shift_does_not_change_it(self):
        from app.modules.algebra.ciphers import caesar_encrypt

        base = co.index_of_coincidence(frequency.letter_counts(LONG_PASSAGE))
        for k in (1, 7, 25):
            shifted = caesar_encrypt(LONG_PASSAGE, k)
            assert co.index_of_coincidence(frequency.letter_counts(shifted)) == pytest.approx(base)

    def test_vigenere_pulls_it_towards_random(self):
        from app.modules.algebra.ciphers import vigenere_encrypt

        plain = co.index_of_coincidence(frequency.letter_counts(LONG_PASSAGE))
        poly = co.index_of_coincidence(frequency.letter_counts(vigenere_encrypt(LONG_PASSAGE, "LEMONADE")))
        assert poly < plain - 0.015

    @pytest.mark.parametrize("counts", [[0] * 26, [1] + [0] * 25])
    def test_undefined_below_two_letters(self, counts):
        assert co.index_of_coincidence(counts) is None

    def test_never_nan_or_infinite(self):
        for counts in ([0] * 26, [1] + [0] * 25, [2] + [0] * 25, [1000] + [0] * 25, [1] * 26):
            value = co.index_of_coincidence(counts)
            assert value is None or math.isfinite(value)

    def test_negative_counts_are_rejected(self):
        with pytest.raises(ValueError):
            co.index_of_coincidence([1, -1] + [0] * 24)

    def test_text_edge_cases_through_the_analysis(self):
        for text in ("", "!!! 123", "你好", "A", "a1"):
            result = analyse_ic(text)
            assert result.ic is None and result.reading == "insufficient"
            assert result.friedman_key_length is None
            assert "at least two letters" in result.note
        two = analyse_ic("aa")
        assert two.ic == 1.0

    def test_frequency_analysis_reports_it(self):
        assert frequency.analyse("AAB").index_of_coincidence == pytest.approx(1 / 3)
        assert frequency.analyse("").index_of_coincidence is None
        assert frequency.analyse("a").index_of_coincidence is None


class TestReferenceValues:
    def test_english_ic_from_the_reference_table(self):
        exact = sum(Fraction(p).limit_denominator(10**9) ** 2 for p in english.ENGLISH_PROPORTIONS)
        assert co.ENGLISH_IC == pytest.approx(float(exact), abs=1e-9)
        assert co.ENGLISH_IC == pytest.approx(0.0655, abs=5e-5)

    def test_random_ic(self):
        assert co.RANDOM_IC == pytest.approx(0.0384615, abs=1e-6)
        assert co.RANDOM_IC == 1 / 26

    def test_thresholds_sit_between_the_references(self):
        assert co.RANDOM_IC < co.FLAT_AT_MOST < co.ENGLISH_LIKE_AT_LEAST < co.ENGLISH_IC


class TestReading:
    @pytest.mark.parametrize(
        "ic, expected",
        [
            (None, "insufficient"),
            (0.0655, "english_like"),
            (0.060, "english_like"),
            (0.0599, "intermediate"),
            (0.052, "intermediate"),
            (0.0451, "intermediate"),
            (0.045, "flat"),
            (0.0385, "flat"),
            (0.0, "flat"),
        ],
    )
    def test_classification(self, ic, expected):
        assert co.read_ic(ic) == expected

    @pytest.mark.parametrize("letters, level", [(0, "very_low"), (29, "very_low"), (30, "low"), (99, "low"), (100, "adequate")])
    def test_reliability(self, letters, level):
        assert co.ic_reliability(letters) == level

    def test_notes_never_claim_certainty(self):
        for reading in ("english_like", "intermediate", "flat"):
            for reliability in ("very_low", "low", "adequate"):
                note = co.ic_note(reading, reliability, 50)
                assert "not proof" in note
                assert "definitely" not in note.lower() and "certainly" not in note.lower()

    def test_note_describes_each_reading(self):
        assert "monoalphabetic" in co.ic_note("english_like", "adequate", 200)
        assert "polyalphabetic" in co.ic_note("flat", "adequate", 200)
        assert "too noisy" in co.ic_note("flat", "very_low", 5)


class TestFriedman:
    def test_an_english_ic_means_key_length_one(self):
        assert co.friedman_key_length(co.ENGLISH_IC, 500) == pytest.approx(1.0)

    def test_a_random_ic_means_key_length_equal_to_n(self):
        assert co.friedman_key_length(co.RANDOM_IC, 500) == pytest.approx(500.0)

    def test_hand_computed_value(self):
        kp, kr, n, ic = co.ENGLISH_IC, 1 / 26, 400, 0.045
        expected = (kp - kr) * n / ((n - 1) * ic - kr * n + kp)
        assert co.friedman_key_length(ic, n) == pytest.approx(expected)
        assert 3 < expected < 12

    def test_undefined_cases_return_none(self):
        assert co.friedman_key_length(None, 100) is None
        assert co.friedman_key_length(0.05, 1) is None
        assert co.friedman_key_length(0.0, 500) is None  # denominator not positive

    def test_values_are_finite(self):
        for ic in (0.0, 0.03, 0.0385, 0.04, 0.05, 0.065, 0.07, 1.0):
            value = co.friedman_key_length(ic, 300)
            assert value is None or math.isfinite(value)

    def test_roughly_estimates_a_real_key_length(self):
        from tests.passages import VERY_LONG_PASSAGE
        from app.modules.algebra.ciphers import vigenere_encrypt

        ct = vigenere_encrypt(VERY_LONG_PASSAGE, "LEMON")
        n = sum(frequency.letter_counts(ct))
        estimate = co.friedman_key_length(co.index_of_coincidence(frequency.letter_counts(ct)), n)
        assert estimate is not None and 2.5 < estimate < 9  # rough by design

    def test_result_serialises(self):
        json.dumps(analyse_ic(LONG_PASSAGE).__dict__, allow_nan=False)
