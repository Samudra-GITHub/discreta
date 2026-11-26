"""Endpoints for ciphertext analysis: letter frequencies and statistical key search.

All endpoints are ``POST`` under ``/api/v1/analysis`` and use the uniform error body of
``app.core.errors``: 422 for malformed input (and ``no_letters`` when a key search is asked
to rank a text that has no ASCII letters), 413 for an oversized body.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.core.errors import ClientError, ErrorResponse
from app.modules.analysis import cryptanalysis, frequency
from app.modules.analysis.schemas import (
    AffineSearchRequest,
    AffineSearchResponse,
    CaesarCrackResponse,
    FrequencyResponse,
    TextRequest,
)

router = APIRouter(prefix="/analysis", tags=["analysis"])

REFERENCE = (
    "English letter frequencies from R. Lewand, Cryptological Mathematics (2000), "
    "normalised to sum to 100%."
)

_ERRORS = {
    413: {"model": ErrorResponse, "description": "Request body larger than the size limit."},
    422: {
        "model": ErrorResponse,
        "description": "Malformed request, or a text with no letters (type `no_letters`).",
    },
}


def _no_letters(error: cryptanalysis.NoLettersError) -> ClientError:
    return ClientError(422, "no_letters", f"{error} Enter ciphertext that contains letters.", ("body", "text"))


@router.post(
    "/frequency",
    response_model=FrequencyResponse,
    responses=_ERRORS,
    summary="Letter frequencies A-Z, compared with English",
)
def letter_frequency(request: TextRequest) -> FrequencyResponse:
    result = frequency.analyse(request.text)
    return FrequencyResponse(
        total_characters=result.total_characters,
        letters=result.letters,
        breakdown=result.breakdown.__dict__,
        rows=[row.__dict__ for row in result.rows],
        ranking=list(result.ranking),
        most_frequent=list(result.most_frequent),
        least_frequent=list(result.least_frequent),
        absent=list(result.absent),
        chi_squared=result.chi_squared,
        reference=REFERENCE,
    )


@router.post(
    "/caesar/crack",
    response_model=CaesarCrackResponse,
    responses=_ERRORS,
    summary="Rank all 26 Caesar keys by chi-squared against English",
)
def crack_caesar(request: TextRequest) -> CaesarCrackResponse:
    try:
        result = cryptanalysis.crack_caesar(request.text)
    except cryptanalysis.NoLettersError as error:
        raise _no_letters(error) from error
    return CaesarCrackResponse(
        letters=result.letters,
        reliability=result.reliability,
        reliability_note=result.note,
        candidates=[c.__dict__ for c in result.candidates],
        separation=result.separation,
    )


@router.post(
    "/affine/search",
    response_model=AffineSearchResponse,
    responses=_ERRORS,
    summary="Rank all 312 valid affine keys by chi-squared against English",
)
def search_affine(request: AffineSearchRequest) -> AffineSearchResponse:
    try:
        result = cryptanalysis.search_affine(request.text, request.plaintext_limit)
    except cryptanalysis.NoLettersError as error:
        raise _no_letters(error) from error
    return AffineSearchResponse(
        letters=result.letters,
        reliability=result.reliability,
        reliability_note=result.note,
        key_space=cryptanalysis.AFFINE_KEY_SPACE,
        plaintexts_included=result.plaintexts_included,
        candidates=[c.__dict__ for c in result.candidates],
        separation=result.separation,
    )


__all__ = ["router"]
