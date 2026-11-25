"""Request and response schemas for the algebra cipher endpoints."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StrictInt

#: Upper bound on input size, to keep request cost predictable.
MAX_TEXT_LENGTH = 10_000

#: API-level bound on every key (``key``, ``a``, ``b``): 2**53 - 1, the largest integer a
#: JavaScript ``Number`` represents exactly. Beyond it a browser would silently round the key
#: before sending it. This is a transport limit only; the functions in ``ciphers.py`` and
#: ``number_theory.py`` accept any integer. Keys may be negative or larger than 26 and are
#: reduced mod 26.
MAX_KEY_MAGNITUDE = 9_007_199_254_740_991

Operation = Literal["encrypt", "decrypt"]

_TEXT = Field(
    max_length=MAX_TEXT_LENGTH,
    description="Text to process. Only ASCII letters are changed; everything else is kept.",
)


class CaesarRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={"examples": [{"text": "Hello, World!", "key": 3}]},
    )

    text: str = _TEXT
    key: StrictInt = Field(
        ge=-MAX_KEY_MAGNITUDE,
        le=MAX_KEY_MAGNITUDE,
        description=(
            "Integer shift k with |k| <= 9007199254740991 (2**53 - 1). "
            "Negative and larger-than-26 values are reduced mod 26."
        ),
    )


class CaesarResponse(BaseModel):
    cipher: Literal["caesar"] = "caesar"
    operation: Operation
    input: str
    output: str
    key: int = Field(description="The key as submitted.")
    effective_key: int = Field(
        description="k mod 26 (0..25). Encryption shifts by this amount, decryption by its negative."
    )


class AffineRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={"examples": [{"text": "AFFINE CIPHER", "a": 5, "b": 8}]},
    )

    text: str = _TEXT
    a: StrictInt = Field(
        ge=-MAX_KEY_MAGNITUDE,
        le=MAX_KEY_MAGNITUDE,
        description=(
            "Multiplier a with |a| <= 9007199254740991 (2**53 - 1). "
            "Must satisfy gcd(a, 26) = 1."
        ),
    )
    b: StrictInt = Field(
        ge=-MAX_KEY_MAGNITUDE,
        le=MAX_KEY_MAGNITUDE,
        description="Shift b with |b| <= 9007199254740991 (2**53 - 1). Reduced mod 26.",
    )


class AffineResponse(BaseModel):
    cipher: Literal["affine"] = "affine"
    operation: Operation
    input: str
    output: str
    a: int = Field(description="The multiplier as submitted.")
    b: int = Field(description="The shift as submitted.")
    effective_a: int = Field(description="a mod 26 (0..25).")
    effective_b: int = Field(description="b mod 26 (0..25).")
    a_inverse: int = Field(description="Multiplicative inverse of a modulo 26.")
