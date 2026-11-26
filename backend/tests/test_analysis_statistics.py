"""Tests for the English reference table, chi-squared and letter-frequency analysis.

Expected values are hand-computed literals or come from the standard library
(``collections.Counter``, ``fractions``), never from the code under test.
"""

import math
from collections import Counter
from fractions import Fraction

import pytest

from app.modules.analysis import english, frequency, scoring

# --------------------------------------------------------------------------- reference table


class TestEnglishReference:
    def test_table_has_26_positive_entries(self):
        assert len(english.ENGLISH_PERCENT) == 26
        assert all(p > 0 for p in english.ENGLISH_PERCENT)

    def test_known_values_as_literals(self):
        assert english.ENGLISH_PERCENT[4] == 12.702  # E
        assert english.ENGLISH_PERCENT[19] == 9.056  # T
        assert english.ENGLISH_PERCENT[25] == 0.074  # Z

    def test_e_is_the_most_common_and_z_the_rarest_letter(self):
        assert max(range(26), key=lambda i: english.ENGLISH_PERCENT[i]) == 4
        assert min(range(26), key=lambda i: english.ENGLISH_PERCENT[i]) == 25

    def test_published_table_sums_to_99_point_999(self):
        assert sum(english.ENGLISH_PERCENT) == pytest.approx(99.999, abs=1e-9)

    def test_proportions_are_normalised_to_one(self):
        assert sum(english.ENGLISH_PROPORTIONS) == pytest.approx(1.0, abs=1e-12)
        assert sum(english.ENGLISH_PERCENT_NORMALISED) == pytest.approx(100.0, abs=1e-9)

    def test_letters_are_the_alphabet(self):
        assert english.LETTERS == "".join(chr(c) for c in range(ord("A"), ord("Z") + 1))


# --------------------------------------------------------------------------- chi-squared


class TestChiSquared:
    def test_hand_computed_two_cell_example(self):
        # N = 30, E = (15, 15): (10-15)^2/15 + (20-15)^2/15 = 50/15
        assert scoring.chi_squared([10, 20], [0.5, 0.5]) == pytest.approx(50 / 15)

    def test_hand_computed_unequal_probabilities(self):
        # N = 100, p = (0.2, 0.3, 0.5) -> E = (20, 30, 50); O = (30, 30, 40)
        # 100/20 + 0 + 100/50 = 5 + 2 = 7
        assert scoring.chi_squared([30, 30, 40], [0.2, 0.3, 0.5]) == pytest.approx(7.0)

    def test_exact_agreement_scores_zero(self):
        assert scoring.chi_squared([25, 25, 50], [0.25, 0.25, 0.5]) == pytest.approx(0.0, abs=1e-12)

    def test_matches_exact_rational_arithmetic(self):
        observed = [7, 0, 13, 2, 9, 1]
        proportions = [Fraction(1, 4), Fraction(1, 8), Fraction(1, 8), Fraction(1, 8), Fraction(1, 4), Fraction(1, 8)]
        total = sum(observed)
        exact = sum((Fraction(o) - total * p) ** 2 / (total * p) for o, p in zip(observed, proportions))
        assert scoring.chi_squared(observed, [float(p) for p in proportions]) == pytest.approx(float(exact))

    def test_uses_counts_not_percentages(self):
        # Doubling every observed count doubles chi-squared (E doubles, squared gap quadruples).
        small = scoring.chi_squared([3, 7], [0.5, 0.5])
        double = scoring.chi_squared([6, 14], [0.5, 0.5])
        assert double == pytest.approx(2 * small)

    def test_contributions_sum_to_the_statistic(self):
        observed = [5, 1, 9, 0]
        proportions = [0.4, 0.1, 0.3, 0.2]
        assert sum(scoring.chi_contributions(observed, proportions)) == pytest.approx(
            scoring.chi_squared(observed, proportions)
        )

    def test_contributions_are_zero_without_letters(self):
        assert scoring.chi_contributions([0, 0, 0], [0.2, 0.3, 0.5]) == [0.0, 0.0, 0.0]

    @pytest.mark.parametrize(
        "observed, proportions",
        [
            ([1, 2], [0.5]),  # length mismatch
            ([1, -2], [0.5, 0.5]),  # negative count
            ([1, 2], [0.5, 0.0]),  # zero probability
            ([1, 2], [0.5, -0.5]),  # negative probability
            ([0, 0], [0.5, 0.5]),  # no letters at all
        ],
    )
    def test_invalid_input_is_rejected(self, observed, proportions):
        with pytest.raises(ValueError):
            scoring.chi_squared(observed, proportions)

    def test_expected_counts(self):
        assert scoring.expected_counts(10, [0.25, 0.75]) == [2.5, 7.5]
        with pytest.raises(ValueError):
            scoring.expected_counts(-1, [1.0])


# --------------------------------------------------------------------------- counting


class TestLetterCounts:
    def test_hello_world_literal(self):
        counts = frequency.letter_counts("Hello, World!")
        expected = {"H": 1, "E": 1, "L": 3, "O": 2, "W": 1, "R": 1, "D": 1}
        assert counts == [expected.get(chr(65 + i), 0) for i in range(26)]
        assert sum(counts) == 10

    def test_case_is_ignored(self):
        assert frequency.letter_counts("aAaA") == [4] + [0] * 25

    def test_agrees_with_counter_on_a_long_text(self):
        from tests.passages import LONG_PASSAGE

        reference = Counter(c for c in LONG_PASSAGE.upper() if "A" <= c <= "Z")
        counts = frequency.letter_counts(LONG_PASSAGE)
        assert counts == [reference.get(chr(65 + i), 0) for i in range(26)]

    def test_empty_text(self):
        assert frequency.letter_counts("") == [0] * 26

    def test_punctuation_digits_and_whitespace_are_ignored(self):
        assert frequency.letter_counts("1234 !?.,;:'\"-_ \t\n") == [0] * 26

    def test_non_ascii_letters_are_ignored(self):
        assert frequency.letter_counts("é ü ß ñ Ω Ж 你好") == [0] * 26

    def test_ascii_letters_next_to_unicode_still_count(self):
        assert sum(frequency.letter_counts("café")) == 3  # c, a, f

    def test_look_alike_characters_do_not_count(self):
        # KELVIN SIGN (U+212A) lowercases to "k"; LONG S (U+017F) uppercases to "S";
        # DOTLESS I (U+0131) uppercases to "I". None of them is an ASCII letter.
        assert frequency.letter_counts("Kſı") == [0] * 26

    def test_fullwidth_letters_do_not_count(self):
        assert frequency.letter_counts("ＡＢＣ") == [0] * 26

    def test_only_the_boundary_ascii_characters_are_letters(self):
        # '@' (64) and '[' (91) sit just outside A-Z; '`' (96) and '{' (123) outside a-z.
        assert frequency.letter_counts("@[`{") == [0] * 26
        assert sum(frequency.letter_counts("AZaz")) == 4

    def test_surrogate_free_emoji_text(self):
        assert sum(frequency.letter_counts("hi \U0001f600 there")) == 7


class TestCharacterBreakdown:
    def test_groups_add_up_to_the_length(self):
        text = "Ab 12, ünï\n !"
        b = frequency.character_breakdown(text)
        assert b.letters + b.whitespace + b.digits + b.other_ascii + b.non_ascii == len(text)

    def test_literal_classification(self):
        b = frequency.character_breakdown("Ab 12,ü\n")
        assert (b.letters, b.whitespace, b.digits, b.other_ascii, b.non_ascii) == (2, 2, 2, 1, 1)

    def test_no_break_space_is_not_ascii_whitespace(self):
        assert frequency.character_breakdown(" ").non_ascii == 1

    def test_control_characters_are_other_ascii(self):
        assert frequency.character_breakdown("\x00\x07").other_ascii == 2

    def test_empty(self):
        assert frequency.character_breakdown("") == frequency.CharacterBreakdown(0, 0, 0, 0, 0)


# --------------------------------------------------------------------------- analysis


class TestAnalyse:
    def test_hello_world(self):
        result = frequency.analyse("Hello, World!")
        by_letter = {row.letter: row for row in result.rows}

        assert result.letters == 10
        assert result.total_characters == 13
        assert by_letter["L"].count == 3
        assert by_letter["L"].relative == pytest.approx(0.3)
        assert by_letter["L"].percent == pytest.approx(30.0)
        assert by_letter["L"].rank == 1
        assert by_letter["O"].rank == 2
        assert result.most_frequent == ("L", "O", "D")
        assert result.least_frequent == ("D", "E", "H")
        assert result.ranking[:3] == ("L", "O", "D")
        assert "L" not in result.absent and "Z" in result.absent
        assert len(result.absent) == 26 - 7

    def test_rows_are_a_to_z(self):
        result = frequency.analyse("abc")
        assert "".join(row.letter for row in result.rows) == english.LETTERS

    def test_relative_frequencies_sum_to_one(self):
        result = frequency.analyse("The quick brown fox")
        assert sum(row.relative for row in result.rows) == pytest.approx(1.0)
        assert sum(row.percent for row in result.rows) == pytest.approx(100.0)

    def test_ranks_are_a_permutation_of_1_to_26(self):
        result = frequency.analyse("Hello, World!")
        assert sorted(row.rank for row in result.rows) == list(range(1, 27))

    def test_ties_break_alphabetically(self):
        result = frequency.analyse("zzbbaa")
        assert result.ranking[:3] == ("A", "B", "Z")

    def test_difference_is_percent_minus_english(self):
        result = frequency.analyse("eee")
        row = result.rows[4]
        assert row.percent == pytest.approx(100.0)
        assert row.difference == pytest.approx(100.0 - row.english_percent)
        assert row.english_percent == pytest.approx(100 * 12.702 / 99.999)

    def test_expected_count_is_n_times_the_english_proportion(self):
        result = frequency.analyse("a" * 200)
        assert result.rows[4].expected_count == pytest.approx(200 * 12.702 / 99.999)

    def test_chi_squared_matches_a_direct_calculation(self):
        text = "Hello, World!"
        n = 10
        counts = Counter(c for c in text.upper() if "A" <= c <= "Z")
        total_pct = sum(english.ENGLISH_PERCENT)
        expected = sum(
            (counts.get(chr(65 + i), 0) - n * english.ENGLISH_PERCENT[i] / total_pct) ** 2
            / (n * english.ENGLISH_PERCENT[i] / total_pct)
            for i in range(26)
        )
        assert frequency.analyse(text).chi_squared == pytest.approx(expected)

    def test_contributions_sum_to_the_statistic(self):
        result = frequency.analyse("Some ordinary English words")
        assert sum(row.chi_contribution for row in result.rows) == pytest.approx(result.chi_squared)

    def test_english_scores_far_lower_than_a_shifted_text(self):
        from app.modules.algebra.ciphers import caesar_encrypt
        from tests.passages import LONG_PASSAGE

        plain = frequency.analyse(LONG_PASSAGE).chi_squared
        shifted = frequency.analyse(caesar_encrypt(LONG_PASSAGE, 7)).chi_squared
        assert plain < 60 and shifted > 5 * plain

    def test_empty_text(self):
        result = frequency.analyse("")
        assert result.letters == 0 and result.total_characters == 0
        assert result.chi_squared is None
        assert result.most_frequent == () and result.least_frequent == ()
        assert len(result.absent) == 26
        assert all(row.count == 0 and row.percent == 0.0 for row in result.rows)
        assert all(not math.isnan(row.difference) for row in result.rows)

    def test_punctuation_only_text(self):
        result = frequency.analyse("?!... --- 123")
        assert result.letters == 0
        assert result.chi_squared is None
        assert result.total_characters == 13

    def test_unicode_only_text(self):
        result = frequency.analyse("你好 мир")
        assert result.letters == 0 and result.breakdown.non_ascii == 5

    def test_the_text_is_not_modified(self):
        text = "Keep ME exactly 123!"
        frequency.analyse(text)
        assert text == "Keep ME exactly 123!"

    def test_least_frequent_only_lists_letters_that_occur(self):
        result = frequency.analyse("aaabbc")
        assert result.least_frequent == ("C", "B", "A")
        assert "D" not in result.least_frequent
