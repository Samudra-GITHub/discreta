"""Statistical cryptanalysis of the Caesar and affine ciphers.

Both ciphers map each letter to exactly one other letter, so they leave the *shape* of the
letter distribution intact and only relabel it. Trying every key and asking which decryption
has letter counts closest to English (smallest chi-squared, see ``scoring.py``) therefore
recovers the key for most texts of reasonable length.

* Caesar: 26 keys ``k``; the candidate plaintext is ``D(y) = (y - k) mod 26``.
* Affine: 312 keys ``(a, b)`` with ``gcd(a, 26) = 1`` (12 multipliers x 26 offsets); the
  candidate plaintext is ``D(y) = a^-1 (y - b) mod 26``.

A *candidate key* here is the key that would be used to **decrypt**; it equals the key that
was used to encrypt, so ``caesar_decrypt(ciphertext, k)`` gives the candidate text.

The ranking is a statistical estimate. It cannot prove that the top candidate is the real
plaintext, and it is unreliable for short ciphertexts (see ``reliability``).

Scores are computed from letter counts alone. They are cross-checked in the tests against
the chi-squared of the actually decrypted text.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from app.modules.algebra import ciphers
from app.modules.algebra.number_theory import mod_inverse
from app.modules.analysis.english import ENGLISH_PROPORTIONS
from app.modules.analysis.frequency import letter_counts
from app.modules.analysis.scoring import chi_squared

Reliability = Literal["very_low", "low", "adequate"]

#: Heuristic letter-count thresholds below which a ranking is not trustworthy. They are
#: rules of thumb chosen for teaching, not statistical constants: the affine search must tell
#: 312 keys apart, so it needs more text than the 26-key Caesar search.
CAESAR_THRESHOLDS = (20, 60)
AFFINE_THRESHOLDS = (50, 150)

#: Number of valid affine keys: phi(26) multipliers times 26 offsets.
AFFINE_KEY_SPACE = len(ciphers.VALID_AFFINE_A) * ciphers.MODULUS


def reliability_for(letters: int, thresholds: tuple[int, int]) -> Reliability:
    """Classify how much a ranking can be trusted, from the number of letters analysed."""
    very_low_below, low_below = thresholds
    if letters < very_low_below:
        return "very_low"
    if letters < low_below:
        return "low"
    return "adequate"


def reliability_note(level: Reliability, letters: int, method: str) -> str:
    if level == "very_low":
        return (
            f"Only {letters} letters: far too short for a reliable {method} ranking. "
            "Several keys can score similarly well, so treat the order as a guess."
        )
    if level == "low":
        return (
            f"{letters} letters is short for a {method} ranking. The best candidate may well "
            "be wrong; compare the top few before trusting any of them."
        )
    return (
        f"{letters} letters is enough for a usable {method} ranking, but the result is still a "
        "statistical estimate, not proof."
    )


@dataclass(frozen=True)
class CaesarCandidate:
    rank: int
    key: int
    chi_squared: float
    plaintext: str


@dataclass(frozen=True)
class CaesarCrack:
    letters: int
    reliability: Reliability
    note: str
    candidates: tuple[CaesarCandidate, ...]  # best first; always all 26 keys
    separation: float | None  # runner-up chi-squared divided by best chi-squared


@dataclass(frozen=True)
class AffineCandidate:
    rank: int
    a: int
    b: int
    a_inverse: int
    chi_squared: float
    plaintext: str | None  # only for the best `plaintext_limit` candidates


@dataclass(frozen=True)
class AffineSearch:
    letters: int
    reliability: Reliability
    note: str
    candidates: tuple[AffineCandidate, ...]  # best first; always all 312 keys
    plaintexts_included: int
    separation: float | None


class NoLettersError(ValueError):
    """The text has no ASCII letters, so there is nothing to score."""


def _separation(scores: list[float]) -> float | None:
    """Runner-up score over best score (>= 1); None if the best score is zero."""
    if len(scores) < 2 or scores[0] == 0:
        return None
    return scores[1] / scores[0]


def caesar_scores(counts: list[int]) -> dict[int, float]:
    """Chi-squared of the plaintext for every Caesar decryption key ``k = 0..25``.

    Decrypting with ``k`` sends ciphertext letter ``y`` to ``x = (y - k) mod 26``, so the
    plaintext count of letter ``x`` is the ciphertext count of letter ``(x + k) mod 26``.
    """
    return {
        k: chi_squared([counts[(x + k) % 26] for x in range(26)], ENGLISH_PROPORTIONS)
        for k in range(26)
    }


def crack_caesar(ciphertext: str) -> CaesarCrack:
    """Rank all 26 Caesar keys by how English the decrypted text looks."""
    counts = letter_counts(ciphertext)
    letters = sum(counts)
    if letters == 0:
        raise NoLettersError("The text contains no ASCII letters.")

    scores = caesar_scores(counts)
    order = sorted(scores, key=lambda k: (scores[k], k))
    candidates = tuple(
        CaesarCandidate(
            rank=position + 1,
            key=k,
            chi_squared=scores[k],
            plaintext=ciphers.caesar_decrypt(ciphertext, k),
        )
        for position, k in enumerate(order)
    )
    level = reliability_for(letters, CAESAR_THRESHOLDS)
    return CaesarCrack(
        letters=letters,
        reliability=level,
        note=reliability_note(level, letters, "Caesar"),
        candidates=candidates,
        separation=_separation([c.chi_squared for c in candidates]),
    )


def affine_scores(counts: list[int]) -> dict[tuple[int, int], float]:
    """Chi-squared of the plaintext for every valid affine key ``(a, b)``.

    Decrypting sends ``y`` to ``x = a^-1 (y - b) mod 26``; the ciphertext count of ``y`` is
    added to the plaintext count of ``x``.
    """
    scores: dict[tuple[int, int], float] = {}
    for a in ciphers.VALID_AFFINE_A:
        inverse = mod_inverse(a, ciphers.MODULUS)
        for b in range(ciphers.MODULUS):
            plain = [0] * 26
            for y in range(26):
                plain[(inverse * (y - b)) % 26] += counts[y]
            scores[(a, b)] = chi_squared(plain, ENGLISH_PROPORTIONS)
    return scores


def search_affine(ciphertext: str, plaintext_limit: int = 20) -> AffineSearch:
    """Rank all 312 affine keys; include decrypted text for the best ``plaintext_limit``.

    Every valid key is ranked. Plaintexts are limited only to keep responses small; any
    other candidate can be decrypted with the ordinary affine decryption.
    """
    if plaintext_limit < 0:
        raise ValueError("plaintext_limit cannot be negative.")
    counts = letter_counts(ciphertext)
    letters = sum(counts)
    if letters == 0:
        raise NoLettersError("The text contains no ASCII letters.")

    scores = affine_scores(counts)
    order = sorted(scores, key=lambda key: (scores[key], key))
    candidates = tuple(
        AffineCandidate(
            rank=position + 1,
            a=a,
            b=b,
            a_inverse=mod_inverse(a, ciphers.MODULUS),
            chi_squared=scores[(a, b)],
            plaintext=ciphers.affine_decrypt(ciphertext, a, b) if position < plaintext_limit else None,
        )
        for position, (a, b) in enumerate(order)
    )
    level = reliability_for(letters, AFFINE_THRESHOLDS)
    return AffineSearch(
        letters=letters,
        reliability=level,
        note=reliability_note(level, letters, "affine"),
        candidates=candidates,
        plaintexts_included=min(plaintext_limit, len(candidates)),
        separation=_separation([c.chi_squared for c in candidates]),
    )
