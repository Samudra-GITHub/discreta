"""Reference letter frequencies of English text.

The percentages are the widely quoted table from Robert Lewand, *Cryptological
Mathematics* (2000). They are an average over many English texts, so a particular passage
(a short one above all) can differ from them noticeably. They are rounded to three decimals
and add up to 99.999, so the proportions used for scoring are *normalised* to sum to
exactly 1.
"""

from __future__ import annotations

LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

#: Percentage of English text made up by each letter, in alphabetical order (A..Z).
ENGLISH_PERCENT: tuple[float, ...] = (
    8.167,  # A
    1.492,  # B
    2.782,  # C
    4.253,  # D
    12.702,  # E
    2.228,  # F
    2.015,  # G
    6.094,  # H
    6.966,  # I
    0.153,  # J
    0.772,  # K
    4.025,  # L
    2.406,  # M
    6.749,  # N
    7.507,  # O
    1.929,  # P
    0.095,  # Q
    5.987,  # R
    6.327,  # S
    9.056,  # T
    2.758,  # U
    0.978,  # V
    2.360,  # W
    0.150,  # X
    1.974,  # Y
    0.074,  # Z
)

_TOTAL = sum(ENGLISH_PERCENT)

#: The same distribution as probabilities (all positive, summing to 1).
ENGLISH_PROPORTIONS: tuple[float, ...] = tuple(p / _TOTAL for p in ENGLISH_PERCENT)

#: The same distribution as normalised percentages (summing to 100).
ENGLISH_PERCENT_NORMALISED: tuple[float, ...] = tuple(100.0 * p for p in ENGLISH_PROPORTIONS)
