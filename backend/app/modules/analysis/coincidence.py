"""The index of coincidence (IC), and what it can and cannot say.

For a text of ``N`` letters in which letter ``i`` occurs ``f_i`` times,

    IC = sum_i f_i (f_i - 1) / (N (N - 1))

This is the probability that two letters drawn at random *without replacement* from the text are the
same letter: ``f_i (f_i - 1)`` counts the ordered pairs of distinct positions that both hold letter
``i``, and ``N (N - 1)`` counts all ordered pairs of distinct positions.

Reference values (``p_i`` are the normalised English letter probabilities of ``english.py``):

* ordinary English: ``sum p_i^2`` = about 0.0655
* uniformly random letters: ``26 * (1/26)^2 = 1/26`` = about 0.0385

A substitution cipher such as Caesar or affine only relabels letters, so it leaves the IC of the text
unchanged. A polyalphabetic cipher such as Vigenere mixes several relabelings and pushes the IC towards
the random value. The IC is therefore a hint about the *kind* of cipher, never a proof: a short text, or
text that is not ordinary English, can land anywhere.

Only ASCII letters count (case-insensitive), as everywhere in the analysis package.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Literal

from app.modules.analysis.english import ENGLISH_PROPORTIONS

#: IC of English text, from the reference table (about 0.0655).
ENGLISH_IC: float = sum(p * p for p in ENGLISH_PROPORTIONS)

#: IC of uniformly random letters.
RANDOM_IC: float = 1 / 26

#: Heuristic reading thresholds, midway-ish between the two reference values. They are rules of thumb
#: for teaching, not statistical constants.
ENGLISH_LIKE_AT_LEAST = 0.060
FLAT_AT_MOST = 0.045

#: Letter counts below which the IC is too noisy to read (very low / low).
IC_THRESHOLDS = (30, 100)

IcReading = Literal["insufficient", "english_like", "intermediate", "flat"]
IcReliability = Literal["very_low", "low", "adequate"]


def index_of_coincidence(counts: Sequence[int]) -> float | None:
    """``sum f(f-1) / (N(N-1))``, or ``None`` when fewer than two letters make it undefined.

    Never returns NaN or infinity.
    """
    if any(c < 0 for c in counts):
        raise ValueError("Letter counts cannot be negative.")
    n = sum(counts)
    if n < 2:
        return None
    return sum(f * (f - 1) for f in counts) / (n * (n - 1))


def ic_reliability(letters: int) -> IcReliability:
    very_low_below, low_below = IC_THRESHOLDS
    if letters < very_low_below:
        return "very_low"
    if letters < low_below:
        return "low"
    return "adequate"


def read_ic(ic: float | None) -> IcReading:
    """Classify an IC value against the English and random reference values."""
    if ic is None:
        return "insufficient"
    if ic >= ENGLISH_LIKE_AT_LEAST:
        return "english_like"
    if ic <= FLAT_AT_MOST:
        return "flat"
    return "intermediate"


def friedman_key_length(ic: float | None, letters: int) -> float | None:
    """Friedman's estimate of a repeating-key length from the IC of the whole ciphertext.

        m = (kp - kr) N / ((N - 1) IC - kr N + kp)       kp = English IC,  kr = 1/26

    It assumes English plaintext and a repeating key, and it is very rough: it can be undefined (denominator
    not positive) or far off for short texts. Returns ``None`` when it is undefined.
    """
    if ic is None or letters < 2:
        return None
    denominator = (letters - 1) * ic - RANDOM_IC * letters + ENGLISH_IC
    if denominator <= 0:
        return None
    return (ENGLISH_IC - RANDOM_IC) * letters / denominator


def ic_note(reading: IcReading, reliability: IcReliability, letters: int) -> str:
    """A cautious sentence about what an IC value suggests."""
    if reading == "insufficient":
        return (
            f"Only {letters} letter{'' if letters == 1 else 's'}: the index of coincidence needs at "
            "least two letters to be defined."
        )
    if reading == "english_like":
        meaning = (
            "close to ordinary English. That fits plain text, a monoalphabetic substitution such as "
            "Caesar or affine, or a transposition, because those keep the letter distribution."
        )
    elif reading == "flat":
        meaning = (
            "close to random letters. That fits a polyalphabetic cipher such as Vigenere with a "
            "reasonably long key, but it also fits genuinely random text."
        )
    else:
        meaning = (
            "between the English and random values. That fits a polyalphabetic cipher with a short key, "
            "a short or unusual text, or a mix; it does not settle the question."
        )
    caution = {
        "very_low": f" With only {letters} letters this is far too noisy to rely on.",
        "low": f" {letters} letters is a small sample, so treat the value as rough.",
        "adequate": "",
    }[reliability]
    return f"The IC is {meaning}{caution} The IC is evidence, not proof."
