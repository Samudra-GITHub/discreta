"""Letter-frequency analysis of a text.

Treatment of characters (a design decision, documented here and in the docs):

* Only the 52 ASCII letters ``A-Z`` and ``a-z`` are counted, and case is ignored
  (``a`` and ``A`` are the same letter).
* Spaces and other whitespace, digits, punctuation and symbols are ignored.
* Non-ASCII characters are ignored, including accented or non-Latin letters such as ``é``
  and look-alikes such as the Kelvin sign: they are never enciphered by the Caesar or
  affine ciphers either, so they carry no information about the key.
* The text itself is never altered; it is only read.

Characters are classified by explicit code-point ranges, not by ``str.lower()`` or
``str.isalpha()``, because those treat some non-ASCII characters as ASCII letters.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.modules.analysis.english import ENGLISH_PERCENT_NORMALISED, ENGLISH_PROPORTIONS, LETTERS
from app.modules.analysis.scoring import chi_contributions, chi_squared, expected_counts

_ASCII_WHITESPACE = frozenset(" \t\n\r\x0b\x0c")


def letter_counts(text: str) -> list[int]:
    """Occurrences of each letter ``A..Z`` (case-insensitive), as 26 counts."""
    counts = [0] * 26
    for char in text:
        code = ord(char)
        if 65 <= code <= 90:  # A-Z
            counts[code - 65] += 1
        elif 97 <= code <= 122:  # a-z
            counts[code - 97] += 1
    return counts


@dataclass(frozen=True)
class CharacterBreakdown:
    """How the characters of a text were treated. The five groups add up to its length."""

    letters: int
    whitespace: int
    digits: int
    other_ascii: int
    non_ascii: int


def character_breakdown(text: str) -> CharacterBreakdown:
    letters = whitespace = digits = other_ascii = non_ascii = 0
    for char in text:
        code = ord(char)
        if 65 <= code <= 90 or 97 <= code <= 122:
            letters += 1
        elif char in _ASCII_WHITESPACE:
            whitespace += 1
        elif 48 <= code <= 57:
            digits += 1
        elif code < 128:
            other_ascii += 1
        else:
            non_ascii += 1
    return CharacterBreakdown(letters, whitespace, digits, other_ascii, non_ascii)


@dataclass(frozen=True)
class LetterRow:
    letter: str
    count: int
    relative: float  # fraction of all letters, 0..1
    percent: float  # relative * 100
    english_percent: float  # normalised reference
    difference: float  # percent - english_percent (percentage points)
    expected_count: float  # N * english proportion
    chi_contribution: float  # (O - E)^2 / E
    rank: int  # 1 = most frequent; ties are broken alphabetically


@dataclass(frozen=True)
class FrequencyAnalysis:
    total_characters: int
    letters: int
    breakdown: CharacterBreakdown
    rows: tuple[LetterRow, ...]  # A..Z
    ranking: tuple[str, ...]  # letters, most to least frequent
    most_frequent: tuple[str, ...]  # up to 3 letters that occur
    least_frequent: tuple[str, ...]  # up to 3 occurring letters with the smallest counts
    absent: tuple[str, ...]  # letters that never occur
    chi_squared: float | None  # versus English; None when there are no letters


def rank_order(counts: list[int]) -> list[int]:
    """Letter indices from most to least frequent; equal counts keep alphabetical order."""
    return sorted(range(26), key=lambda i: (-counts[i], i))


def analyse(text: str) -> FrequencyAnalysis:
    counts = letter_counts(text)
    total = sum(counts)
    breakdown = character_breakdown(text)

    order = rank_order(counts)
    rank_of = {index: position + 1 for position, index in enumerate(order)}
    expected = expected_counts(total, ENGLISH_PROPORTIONS)
    contributions = chi_contributions(counts, ENGLISH_PROPORTIONS)

    rows = []
    for i in range(26):
        percent = 100.0 * counts[i] / total if total else 0.0
        rows.append(
            LetterRow(
                letter=LETTERS[i],
                count=counts[i],
                relative=counts[i] / total if total else 0.0,
                percent=percent,
                english_percent=ENGLISH_PERCENT_NORMALISED[i],
                difference=percent - ENGLISH_PERCENT_NORMALISED[i],
                expected_count=expected[i],
                chi_contribution=contributions[i],
                rank=rank_of[i],
            )
        )

    occurring = [i for i in order if counts[i] > 0]
    rarest_first = sorted(occurring, key=lambda i: (counts[i], i))
    return FrequencyAnalysis(
        total_characters=len(text),
        letters=total,
        breakdown=breakdown,
        rows=tuple(rows),
        ranking=tuple(LETTERS[i] for i in order),
        most_frequent=tuple(LETTERS[i] for i in occurring[:3]),
        least_frequent=tuple(LETTERS[i] for i in rarest_first[:3]),
        absent=tuple(LETTERS[i] for i in range(26) if counts[i] == 0),
        chi_squared=chi_squared(counts, ENGLISH_PROPORTIONS) if total else None,
    )
