"""Endpoints for the algebra module: Caesar and affine ciphers.

All four endpoints are ``POST`` and live under ``/api/v1/algebra``. Every client error has
the uniform body described in ``app.core.errors`` (``detail`` is a list of ``loc``/``msg``/
``type`` objects, and the offending input is never echoed back):

* 422 - malformed request (wrong types, missing or unknown fields, out-of-range values), or a
  well-formed request whose key is mathematically invalid (for example an affine ``a`` that
  is not coprime to 26, reported with type ``invalid_key``).
* 413 - request body larger than the configured limit.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.core.errors import ClientError, ErrorResponse
from app.modules.algebra import ciphers
from app.modules.algebra.number_theory import mod_inverse
from app.modules.algebra.schemas import (
    AffineRequest,
    AffineResponse,
    CaesarRequest,
    CaesarResponse,
    Operation,
)

router = APIRouter(prefix="/algebra", tags=["algebra"])

_ERRORS = {
    413: {"model": ErrorResponse, "description": "Request body larger than the size limit."},
    422: {
        "model": ErrorResponse,
        "description": "Malformed request, or a mathematically invalid key (type `invalid_key`).",
    },
}


def _invalid_key(error: ciphers.InvalidKeyError) -> ClientError:
    loc = ("body", error.field) if error.field else ("body",)
    return ClientError(422, "invalid_key", str(error), loc)


def _caesar(request: CaesarRequest, operation: Operation) -> CaesarResponse:
    try:
        effective_key = ciphers.validate_caesar_key(request.key)
        run = ciphers.caesar_encrypt if operation == "encrypt" else ciphers.caesar_decrypt
        output = run(request.text, request.key)
    except ciphers.InvalidKeyError as error:
        raise _invalid_key(error) from error
    return CaesarResponse(
        operation=operation,
        input=request.text,
        output=output,
        key=request.key,
        effective_key=effective_key,
    )


def _affine(request: AffineRequest, operation: Operation) -> AffineResponse:
    try:
        effective_a, effective_b = ciphers.validate_affine_key(request.a, request.b)
        run = ciphers.affine_encrypt if operation == "encrypt" else ciphers.affine_decrypt
        output = run(request.text, request.a, request.b)
    except ciphers.InvalidKeyError as error:
        raise _invalid_key(error) from error
    return AffineResponse(
        operation=operation,
        input=request.text,
        output=output,
        a=request.a,
        b=request.b,
        effective_a=effective_a,
        effective_b=effective_b,
        a_inverse=mod_inverse(effective_a, ciphers.MODULUS),
    )


@router.post(
    "/caesar/encrypt",
    response_model=CaesarResponse,
    responses=_ERRORS,
    summary="Caesar encryption: E(x) = (x + k) mod 26",
)
def caesar_encrypt(request: CaesarRequest) -> CaesarResponse:
    return _caesar(request, "encrypt")


@router.post(
    "/caesar/decrypt",
    response_model=CaesarResponse,
    responses=_ERRORS,
    summary="Caesar decryption: D(y) = (y - k) mod 26",
)
def caesar_decrypt(request: CaesarRequest) -> CaesarResponse:
    return _caesar(request, "decrypt")


@router.post(
    "/affine/encrypt",
    response_model=AffineResponse,
    responses=_ERRORS,
    summary="Affine encryption: E(x) = (a*x + b) mod 26",
)
def affine_encrypt(request: AffineRequest) -> AffineResponse:
    return _affine(request, "encrypt")


@router.post(
    "/affine/decrypt",
    response_model=AffineResponse,
    responses=_ERRORS,
    summary="Affine decryption: D(y) = a^-1 (y - b) mod 26",
)
def affine_decrypt(request: AffineRequest) -> AffineResponse:
    return _affine(request, "decrypt")
