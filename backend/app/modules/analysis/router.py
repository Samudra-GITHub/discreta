"""Endpoints for ciphertext analysis: letter frequencies, key search and Vigenere investigation.

All endpoints are ``POST`` under ``/api/v1/analysis`` and use the uniform error body of
``app.core.errors``: 422 for malformed input (and ``no_letters`` when a key search is asked
to rank a text that has no ASCII letters), 413 for an oversized body.
"""

from __future__ import annotations

from dataclasses import asdict

from fastapi import APIRouter

from app.core.errors import ClientError, ErrorResponse
from app.modules.analysis import cryptanalysis, frequency, vigenere_analysis
from app.modules.analysis.schemas import (
    AffineSearchRequest,
    AffineSearchResponse,
    CaesarCrackResponse,
    FrequencyResponse,
    TextRequest,
    VigenereCandidatesRequest,
    VigenereCandidatesResponse,
    VigenereLengthsResponse,
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
        "description": (
            "Malformed request, a text with no letters (`no_letters`), too little text "
            "(`insufficient_text`) or an unusable key length (`invalid_key_length`)."
        ),
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
        index_of_coincidence=result.index_of_coincidence,
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




def _insufficient(error: vigenere_analysis.InsufficientTextError) -> ClientError:
    return ClientError(422, "insufficient_text", str(error), ("body", "text"))


@router.post(
    "/vigenere/lengths",
    response_model=VigenereLengthsResponse,
    responses=_ERRORS,
    summary="Index of coincidence, Kasiski examination and ranked Vigenere key lengths",
)
def vigenere_lengths(request: TextRequest) -> VigenereLengthsResponse:
    try:
        result = vigenere_analysis.analyse_lengths(request.text)
    except vigenere_analysis.InsufficientTextError as error:
        raise _insufficient(error) from error
    return VigenereLengthsResponse.model_validate(
        {
            "letters": result.letters,
            "index_of_coincidence": asdict(result.ic),
            "kasiski": asdict(result.kasiski),
            "lengths": [asdict(row) for row in result.lengths],
            "suggested_length": result.suggested_length,
            "reliability": result.reliability,
            "note": result.note,
        }
    )


@router.post(
    "/vigenere/candidates",
    response_model=VigenereCandidatesResponse,
    responses=_ERRORS,
    summary="Estimate each Vigenere key letter for a chosen key length and rank candidate keys",
)
def vigenere_candidates(request: VigenereCandidatesRequest) -> VigenereCandidatesResponse:
    try:
        result = vigenere_analysis.analyse_key_length(request.text, request.key_length)
    except vigenere_analysis.InsufficientTextError as error:
        raise _insufficient(error) from error
    except vigenere_analysis.KeyLengthError as error:
        raise ClientError(422, "invalid_key_length", str(error), ("body", "key_length")) from error
    return VigenereCandidatesResponse.model_validate(asdict(result))


__all__ = ["router"]
