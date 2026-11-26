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
