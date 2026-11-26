"""Kasiski examination: repeated sequences in a ciphertext and what their spacing suggests.

With a repeating key of length ``m``, the same plaintext fragment encrypts to the same ciphertext
fragment whenever the fragment starts at two positions that differ by a multiple of ``m``. So the
distance between two occurrences of a repeated ciphertext sequence is *often* a multiple of the key
length, and the factors shared by many such distances point at ``m``.

Details of this implementation (all documented in ``docs/mathematics/polyalphabetic-analysis.md``):

* Positions count **letters only** (ASCII ``A-Z``/``a-z``, case-insensitive), starting at 0, because the
  Vigenere key advances only on letters.
* A repeat is a sequence of at least 3 letters occurring at two positions. Each *left-maximal* repeat
  (one that does not also match a letter further to the left) is recorded once, as a pair of positions;
  its length is measured up to ``MAX_SEQUENCE`` letters. Overlapping repeats are allowed. To keep the
  work linear, a trigram is paired only with its ``MAX_PARTNERS`` most recent earlier occurrences.
* A distance ``d`` votes for every candidate key length ``f`` in ``2..MAX_KEY_LENGTH`` that divides it.
* Chance also produces repeated trigrams, and every multiple of the true key length collects the same
  votes as the true length, so the votes are *evidence*, not a verdict.
* Work is linear in the text length times ``MAX_SEQUENCE``.
"""

from __future__ import annotations

from dataclasses import dataclass
from math import gcd

MIN_SEQUENCE = 3
MAX_SEQUENCE = 20
MAX_PARTNERS = 8
MAX_KEY_LENGTH = 40
#: How many repeats are returned in detail (all of them are counted and used).
MAX_REPEATS_LISTED = 100
EXAMPLES_PER_LENGTH = 3


def letters_only(text: str) -> str:
    """The ASCII letters of ``text``, upper-cased, in order."""
    return "".join(
        chr(ord(c) - 32) if "a" <= c <= "z" else c for c in text if "a" <= c <= "z" or "A" <= c <= "Z"
    )


@dataclass(frozen=True)
class Repeat:
    sequence: str
    length: int
    first: int  # position (among letters, 0-based) of the earlier occurrence
    second: int  # position of the later occurrence
    distance: int  # second - first


@dataclass(frozen=True)
class KeyLengthVote:
    length: int
    repeats: int  # how many repeat distances this length divides
    fraction: float  # repeats / total repeats
    examples: tuple[Repeat, ...]


@dataclass(frozen=True)
class KasiskiResult:
    letters: int
    total_repeats: int
    repeats: tuple[Repeat, ...]  # longest first, at most MAX_REPEATS_LISTED
    votes: tuple[KeyLengthVote, ...]  # ranked: most repeats first, then shorter length
    distance_gcd: int | None  # gcd of all distances; None without repeats
    note: str


def find_repeats(letters: str) -> list[Repeat]:
    """Every left-maximal repeat of at least ``MIN_SEQUENCE`` letters, once, as a pair of positions.

    A trigram at position ``i`` is paired with each of its ``MAX_PARTNERS`` most recent earlier
    occurrences ``e``; the pair is kept only if it does not match one letter further to the left
    (otherwise it is the tail of a repeat recorded from its start), and is then extended to the right
    up to ``MAX_SEQUENCE`` letters.
    """
    n = len(letters)
    seen: dict[str, list[int]] = {}
    repeats: list[Repeat] = []
    for i in range(n - MIN_SEQUENCE + 1):
        gram = letters[i : i + MIN_SEQUENCE]
        earlier = seen.setdefault(gram, [])
        for e in reversed(earlier[-MAX_PARTNERS:]):
            if e > 0 and letters[e - 1] == letters[i - 1]:
                continue
            length = MIN_SEQUENCE
            while length < MAX_SEQUENCE and i + length < n and letters[e + length] == letters[i + length]:
                length += 1
            repeats.append(Repeat(letters[e : e + length], length, e, i, i - e))
        earlier.append(i)
    return repeats


def kasiski(text: str) -> KasiskiResult:
    """Examine ``text`` for repeated sequences and rank the key lengths their distances suggest."""
    letters = letters_only(text)
    repeats = find_repeats(letters)
    total = len(repeats)
    ordered = sorted(repeats, key=lambda r: (-r.length, r.first, r.second))

    votes: list[KeyLengthVote] = []
    for length in range(2, MAX_KEY_LENGTH + 1):
        matching = [r for r in ordered if r.distance % length == 0]
        if matching:
            votes.append(
                KeyLengthVote(
                    length=length,
                    repeats=len(matching),
                    fraction=len(matching) / total,
                    examples=tuple(matching[:EXAMPLES_PER_LENGTH]),
                )
            )
    votes.sort(key=lambda v: (-v.repeats, v.length))

    distance_gcd: int | None = None
    for r in repeats:
        distance_gcd = r.distance if distance_gcd is None else gcd(distance_gcd, r.distance)

    if len(letters) < 2 * MIN_SEQUENCE:
        note = f"Only {len(letters)} letters: too short to contain a meaningful repeated sequence."
    elif total == 0:
        note = (
            "No sequence of three or more letters repeats, so Kasiski examination has no evidence. "
            "That is normal for a short text or a long key; it does not rule out a repeating key."
        )
    else:
        note = (
            f"{total} repeated sequence{'' if total == 1 else 's'} found. A distance is often a multiple "
            "of the key length, but chance also repeats short sequences and every multiple of the true "
            "length gets the same votes, so these counts are evidence, not proof."
        )
    return KasiskiResult(
        letters=len(letters),
        total_repeats=total,
        repeats=tuple(ordered[:MAX_REPEATS_LISTED]),
        votes=tuple(votes),
        distance_gcd=distance_gcd,
        note=note,
    )
