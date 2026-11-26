"""Statistical investigation of a Vigenere ciphertext.

The workflow, each step using only measured or calculated evidence:

1. **Key length.** For each candidate length ``m`` split the letters into ``m`` columns (letter ``i``
   goes to column ``i mod m``) and average the index of coincidence of the columns. If ``m`` is the
   real key length every column was enciphered with one Caesar shift, so each column looks like English
   (IC about 0.0655); for a wrong ``m`` the columns mix several shifts and drift towards 0.0385. A
   length is called *plausible* when its mean IC reaches ``PLAUSIBLE_MEAN_IC`` *and* lies within
   ``NEAR_BEST`` of the best mean IC in the table (a divisor of the true length is better than random
   but clearly below it). Multiples of the true length are plausible too, so plausible lengths are
   listed shortest first. Kasiski votes are shown
   beside the IC for comparison; they are not combined into one score.
2. **Key letters.** For a chosen length, each column is a Caesar cipher. Its key letter is the shift
   with the smallest chi-squared against English (``cryptanalysis.caesar_scores``).
3. **Candidate keys.** The columns are independent, so candidate keys are ranked by the *sum* of the
   chosen shifts' column chi-squared values, taking the best few shifts per column. Each candidate is
   also decrypted, and the chi-squared of the whole decrypted text is reported as an independent check.

Everything is an estimate. Short columns give unreliable letters; the result is flagged by the size of
the smallest column.
"""

from __future__ import annotations

import heapq
from dataclasses import dataclass

from app.modules.algebra.ciphers import vigenere_decrypt
from app.modules.analysis import coincidence
from app.modules.analysis.cryptanalysis import Reliability, caesar_scores
from app.modules.analysis.english import ENGLISH_PROPORTIONS
from app.modules.analysis.frequency import letter_counts
from app.modules.analysis.kasiski import MAX_KEY_LENGTH, KasiskiResult, kasiski, letters_only
from app.modules.analysis.scoring import chi_squared

#: The length table covers 1..LENGTH_TABLE_MAX (and never more than half the letters).
LENGTH_TABLE_MAX = 20
#: Mean column IC at or above which a length can be called plausible (between 0.0385 and 0.0655) ...
PLAUSIBLE_MEAN_IC = 0.055
#: ... provided it is also within this distance of the best mean IC in the table.
NEAR_BEST = 0.005
#: Column sizes below which a key letter is not trustworthy (very low / low).
COLUMN_THRESHOLDS = (10, 25)
#: Shifts kept per column when assembling candidate keys, and candidate keys returned.
OPTIONS_PER_COLUMN = 3
MAX_CANDIDATES = 10


class InsufficientTextError(ValueError):
    """The text has too few letters for this analysis (fewer than two)."""


class KeyLengthError(ValueError):
    """The requested key length is not usable for this text."""


def _column_counts(letters: str, length: int) -> list[list[int]]:
    columns = [[0] * 26 for _ in range(length)]
    for i, ch in enumerate(letters):
        columns[i % length][ord(ch) - 65] += 1
    return columns


@dataclass(frozen=True)
class IcResult:
    letters: int
    ic: float | None
    english_ic: float
    random_ic: float
    reading: coincidence.IcReading
    reliability: coincidence.IcReliability
    note: str
    friedman_key_length: float | None


def analyse_ic(text: str) -> IcResult:
    counts = letter_counts(text)
    n = sum(counts)
    ic = coincidence.index_of_coincidence(counts)
    reading = coincidence.read_ic(ic)
    reliability = coincidence.ic_reliability(n)
    return IcResult(
        letters=n,
        ic=ic,
        english_ic=coincidence.ENGLISH_IC,
        random_ic=coincidence.RANDOM_IC,
        reading=reading,
        reliability=reliability,
        note=coincidence.ic_note(reading, reliability, n),
        friedman_key_length=coincidence.friedman_key_length(ic, n),
    )


@dataclass(frozen=True)
class LengthRow:
    rank: int
    length: int
    smallest_column: int  # letters in the smallest column
    mean_ic: float | None
    plausible: bool
    kasiski_repeats: int  # repeat distances this length divides (0 for length 1)
    kasiski_fraction: float


@dataclass(frozen=True)
class LengthAnalysis:
    letters: int
    ic: IcResult
    kasiski: KasiskiResult
    lengths: tuple[LengthRow, ...]  # ranked
    suggested_length: int | None  # shortest plausible length, if any
    reliability: Reliability
    note: str


def analyse_lengths(text: str) -> LengthAnalysis:
    """IC, Kasiski examination and a ranked table of candidate key lengths 1..20."""
    letters = letters_only(text)
    n = len(letters)
    if n < 2:
        raise InsufficientTextError("At least two letters are needed to investigate a key length.")

    ic_result = analyse_ic(text)
    kas = kasiski(text)
    votes = {v.length: v for v in kas.votes}

    raw: list[tuple[int, int, float | None, int, float]] = []
    for length in range(1, min(LENGTH_TABLE_MAX, max(1, n // 2)) + 1):
        columns = _column_counts(letters, length)
        ics = [v for v in (coincidence.index_of_coincidence(c) for c in columns) if v is not None]
        mean_ic = sum(ics) / len(ics) if ics else None
        vote = votes.get(length)
        raw.append(
            (length, min(sum(c) for c in columns), mean_ic, vote.repeats if vote else 0, vote.fraction if vote else 0.0)
        )

    best_ic = max((r[2] for r in raw if r[2] is not None), default=0.0)
    cutoff = max(PLAUSIBLE_MEAN_IC, best_ic - NEAR_BEST)
    rows = [(r[0], r[1], r[2], r[2] is not None and r[2] >= cutoff, r[3], r[4]) for r in raw]

    plausible = sorted((r for r in rows if r[3]), key=lambda r: r[0])
    others = sorted((r for r in rows if not r[3]), key=lambda r: (-(r[2] if r[2] is not None else -1.0), r[0]))
    ranked = tuple(
        LengthRow(rank=i + 1, length=r[0], smallest_column=r[1], mean_ic=r[2], plausible=r[3], kasiski_repeats=r[4], kasiski_fraction=r[5])
        for i, r in enumerate(plausible + others)
    )
    suggested = plausible[0][0] if plausible else None

    # Reliability follows the average column size at the suggested (or best) length.
    reference = ranked[0]
    column_size = n / reference.length
    reliability = _column_reliability(column_size)
    if suggested is None:
        note = (
            "No length reaches the plausibility threshold, so no key length is suggested. The ranking "
            "below is by mean IC only; the text may be too short, may not be English, or may not use a "
            "repeating key."
        )
    else:
        note = (
            f"Length {suggested} is the shortest whose columns look like English (mean IC at least "
            f"{PLAUSIBLE_MEAN_IC} and within {NEAR_BEST} of the best). Multiples of the true length look "
            "plausible too, which is why the shortest is listed first. This is a suggestion, not proof."
        )
    return LengthAnalysis(n, ic_result, kas, ranked, suggested, reliability, note)


def _column_reliability(size: float) -> Reliability:
    very_low_below, low_below = COLUMN_THRESHOLDS
    if size < very_low_below:
        return "very_low"
    if size < low_below:
        return "low"
    return "adequate"


@dataclass(frozen=True)
class ColumnOption:
    shift: int
    letter: str
    chi_squared: float


@dataclass(frozen=True)
class ColumnAnalysis:
    position: int  # 0-based index within the key
    size: int  # letters in this column
    best: ColumnOption
    options: tuple[ColumnOption, ...]  # best first
    separation: float | None  # runner-up chi-squared / best chi-squared
    reliability: Reliability


@dataclass(frozen=True)
class KeyCandidate:
    rank: int
    key: str
    shortest_equivalent_key: str  # the key with any whole repetition removed
    shifts: tuple[int, ...]
    column_chi_sum: float
    text_chi_squared: float
    plaintext: str


@dataclass(frozen=True)
class CandidateAnalysis:
    letters: int
    key_length: int
    columns: tuple[ColumnAnalysis, ...]
    candidates: tuple[KeyCandidate, ...]  # best first
    reliability: Reliability
    note: str


def shortest_period(key: str) -> str:
    """The shortest keyword that, repeated, gives ``key`` (``LEMONLEMON`` -> ``LEMON``)."""
    for period in range(1, len(key) + 1):
        if len(key) % period == 0 and key[:period] * (len(key) // period) == key:
            return key[:period]
    return key


def analyse_key_length(text: str, key_length: int) -> CandidateAnalysis:
    """Estimate each key letter for a chosen key length and rank candidate keys."""
    letters = letters_only(text)
    n = len(letters)
    if n < 2:
        raise InsufficientTextError("At least two letters are needed to estimate a key.")
    if not 1 <= key_length <= MAX_KEY_LENGTH:
        raise KeyLengthError(f"The key length must be between 1 and {MAX_KEY_LENGTH}.")
    if key_length > n:
        raise KeyLengthError("The key length cannot be larger than the number of letters.")

    columns: list[ColumnAnalysis] = []
    for position, counts in enumerate(_column_counts(letters, key_length)):
        size = sum(counts)
        scores = caesar_scores(counts)
        ordered = sorted(scores, key=lambda k: (scores[k], k))
        options = tuple(ColumnOption(k, chr(65 + k), scores[k]) for k in ordered[:OPTIONS_PER_COLUMN])
        best, runner = scores[ordered[0]], scores[ordered[1]]
        columns.append(
            ColumnAnalysis(
                position=position,
                size=size,
                best=options[0],
                options=options,
                separation=runner / best if best > 0 else None,
                reliability=_column_reliability(size),
            )
        )

    # Best-first enumeration of the lowest sums of column chi-squared values.
    start = (0,) * key_length
    total = lambda picks: sum(columns[j].options[p].chi_squared for j, p in enumerate(picks))  # noqa: E731
    heap = [(total(start), start)]
    seen = {start}
    ranked_picks: list[tuple[float, tuple[int, ...]]] = []
    while heap and len(ranked_picks) < MAX_CANDIDATES:
        cost, picks = heapq.heappop(heap)
        ranked_picks.append((cost, picks))
        for j in range(key_length):
            if picks[j] + 1 < OPTIONS_PER_COLUMN:
                nxt = picks[:j] + (picks[j] + 1,) + picks[j + 1 :]
                if nxt not in seen:
                    seen.add(nxt)
                    heapq.heappush(heap, (total(nxt), nxt))

    candidates: list[KeyCandidate] = []
    for rank, (cost, picks) in enumerate(ranked_picks, start=1):
        shifts = tuple(columns[j].options[p].shift for j, p in enumerate(picks))
        key = "".join(chr(65 + s) for s in shifts)
        plaintext = vigenere_decrypt(text, key)
        candidates.append(
            KeyCandidate(
                rank=rank,
                key=key,
                shortest_equivalent_key=shortest_period(key),
                shifts=shifts,
                column_chi_sum=cost,
                text_chi_squared=chi_squared(letter_counts(plaintext), ENGLISH_PROPORTIONS),
                plaintext=plaintext,
            )
        )

    smallest = min(c.size for c in columns)
    reliability = _column_reliability(smallest)
    note = (
        f"Each key letter is estimated from a column of {smallest} to {max(c.size for c in columns)} letters. "
        + {
            "very_low": "Columns this small cannot identify a shift reliably: treat every letter as a guess.",
            "low": "Columns this small give uncertain letters: compare the alternatives before trusting any.",
            "adequate": "That is enough for usable estimates, but the key is still a statistical suggestion, not proof.",
        }[reliability]
    )
    return CandidateAnalysis(n, key_length, tuple(columns), tuple(candidates), reliability, note)
