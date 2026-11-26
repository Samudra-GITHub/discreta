"""Request and response schemas for the analysis endpoints."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.modules.algebra.schemas import MAX_TEXT_LENGTH

Reliability = Literal["very_low", "low", "adequate"]

_TEXT = Field(
    max_length=MAX_TEXT_LENGTH,
    description="Text to analyse. Only ASCII letters are counted; case is ignored.",
)


class TextRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={"examples": [{"text": "WKH TXLFN EURZQ IRA"}]},
    )

    text: str = _TEXT


class AffineSearchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = _TEXT
    plaintext_limit: int = Field(
        default=20,
        ge=0,
        le=312,
        strict=True,
        description=(
            "How many of the best-ranked candidates include their decrypted text (all 312 keys "
            "are always ranked). Other candidates can be decrypted with /algebra/affine/decrypt."
        ),
    )


class CharacterBreakdown(BaseModel):
    letters: int = Field(description="ASCII letters (counted).")
    whitespace: int = Field(description="ASCII whitespace (ignored).")
    digits: int = Field(description="ASCII digits (ignored).")
    other_ascii: int = Field(description="Other ASCII characters, such as punctuation (ignored).")
    non_ascii: int = Field(description="Non-ASCII characters of any kind (ignored).")


class LetterRow(BaseModel):
    letter: str
    count: int
    relative: float = Field(description="Share of all letters, from 0 to 1.")
    percent: float = Field(description="Share of all letters, in percent.")
    english_percent: float = Field(description="Reference English percentage (normalised).")
    difference: float = Field(description="percent minus english_percent, in percentage points.")
    expected_count: float = Field(description="Expected count in English text of the same length.")
    chi_contribution: float = Field(description="This letter's term (O - E)^2 / E.")
    rank: int = Field(description="1 is the most frequent letter; ties are broken alphabetically.")


class FrequencyResponse(BaseModel):
    total_characters: int
    letters: int = Field(description="Number of ASCII letters counted.")
    breakdown: CharacterBreakdown
    rows: list[LetterRow] = Field(description="One row per letter, A to Z.")
    ranking: list[str] = Field(description="All 26 letters, most to least frequent.")
    most_frequent: list[str] = Field(description="Up to three of the most frequent letters.")
    least_frequent: list[str] = Field(
        description="Up to three occurring letters with the smallest counts."
    )
    absent: list[str] = Field(description="Letters that never occur.")
    chi_squared: float | None = Field(
        description="chi-squared of the letter counts against English (25 degrees of freedom); "
        "null when the text has no letters."
    )
    index_of_coincidence: float | None = Field(
        description="IC = sum f(f-1) / (N(N-1)) of the letter counts; null below two letters."
    )
    reference: str = Field(description="Source of the English reference frequencies.")


class CaesarCandidate(BaseModel):
    rank: int = Field(description="1 is the best-scoring candidate.")
    key: int = Field(description="Shift k (0..25) such that plaintext = D_k(ciphertext).")
    chi_squared: float
    plaintext: str


class CaesarCrackResponse(BaseModel):
    letters: int
    reliability: Reliability
    reliability_note: str
    candidates: list[CaesarCandidate] = Field(description="All 26 keys, best first.")
    separation: float | None = Field(
        description="Runner-up chi-squared divided by the best chi-squared; larger means the "
        "best candidate stands out more. Null when undefined."
    )


class AffineCandidate(BaseModel):
    rank: int
    a: int
    b: int
    a_inverse: int
    chi_squared: float
    plaintext: str | None = Field(
        description="Decrypted text; null beyond the first `plaintext_limit` candidates."
    )


class AffineSearchResponse(BaseModel):
    letters: int
    reliability: Reliability
    reliability_note: str
    key_space: int = Field(description="Number of valid keys searched (always 312).")
    plaintexts_included: int
    candidates: list[AffineCandidate] = Field(description="All 312 valid keys, best first.")
    separation: float | None


# ---------------------------------------------------------------------------- Vigenere analysis

MAX_KEY_LENGTH = 40


class VigenereCandidatesRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = _TEXT
    key_length: int = Field(
        strict=True,
        ge=1,
        le=MAX_KEY_LENGTH,
        description="Key length to investigate (1 to 40). It cannot exceed the number of letters.",
    )


class IcResult(BaseModel):
    letters: int
    ic: float | None = Field(description="Index of coincidence; null below two letters.")
    english_ic: float = Field(description="Reference IC of English text (about 0.0655).")
    random_ic: float = Field(description="IC of uniformly random letters (1/26).")
    reading: Literal["insufficient", "english_like", "intermediate", "flat"]
    reliability: Reliability
    note: str
    friedman_key_length: float | None = Field(
        description="Friedman's rough key-length estimate from the IC; null when undefined."
    )


class KasiskiRepeat(BaseModel):
    sequence: str = Field(description="The repeated letters, upper-cased (at most 20 shown).")
    length: int
    first: int = Field(description="Position among the letters (from 0) of the earlier occurrence.")
    second: int = Field(description="Position of the later occurrence.")
    distance: int = Field(description="second - first.")


class KasiskiVote(BaseModel):
    length: int
    repeats: int = Field(description="Number of repeat distances this key length divides.")
    fraction: float = Field(description="repeats divided by the total number of repeats.")
    examples: list[KasiskiRepeat]


class KasiskiResult(BaseModel):
    letters: int
    total_repeats: int
    repeats: list[KasiskiRepeat] = Field(description="Longest first, at most 100.")
    votes: list[KasiskiVote] = Field(description="Ranked: most repeats first, then shorter length.")
    distance_gcd: int | None = Field(description="gcd of all repeat distances; null without repeats.")
    note: str


class LengthRow(BaseModel):
    rank: int
    length: int
    smallest_column: int
    mean_ic: float | None
    plausible: bool = Field(description="Mean column IC is at least 0.055 and within 0.005 of the best in the table.")
    kasiski_repeats: int
    kasiski_fraction: float


class VigenereLengthsResponse(BaseModel):
    letters: int
    index_of_coincidence: IcResult
    kasiski: KasiskiResult
    lengths: list[LengthRow] = Field(description="Candidate key lengths 1..20, ranked.")
    suggested_length: int | None = Field(description="Shortest plausible length; null if none qualifies.")
    reliability: Reliability
    note: str


class ColumnOption(BaseModel):
    shift: int
    letter: str
    chi_squared: float


class ColumnAnalysis(BaseModel):
    position: int = Field(description="0-based position within the key.")
    size: int = Field(description="Letters in this column.")
    best: ColumnOption
    options: list[ColumnOption] = Field(description="The best shifts for this column, best first.")
    separation: float | None
    reliability: Reliability


class KeyCandidate(BaseModel):
    rank: int
    key: str = Field(description="A valid keyword of A-Z letters.")
    shortest_equivalent_key: str
    shifts: list[int]
    column_chi_sum: float = Field(description="Sum of the chosen shifts' column chi-squared values.")
    text_chi_squared: float = Field(description="Chi-squared of the whole decrypted text.")
    plaintext: str


class VigenereCandidatesResponse(BaseModel):
    letters: int
    key_length: int
    columns: list[ColumnAnalysis]
    candidates: list[KeyCandidate] = Field(description="Best first, at most 10.")
    reliability: Reliability
    note: str
