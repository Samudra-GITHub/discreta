"""Caesar and affine ciphers over the integers modulo 26.

Alphabet mapping: ``A..Z`` (and ``a..z``) <-> ``0..25``. Only the 52 ASCII letters are
enciphered; every other character (spaces, digits, punctuation, accented or non-Latin
letters, emoji, ...) is copied through unchanged. Letter case is preserved.

Formulas, with ``x`` the plaintext number and ``y`` the ciphertext number:

* Caesar:  ``E(x) = (x + k) mod 26``,        ``D(y) = (y - k) mod 26``
* Affine:  ``E(x) = (a*x + b) mod 26``,      ``D(y) = a^(-1) * (y - b) mod 26``
  with the requirement ``gcd(a, 26) = 1`` so that ``a^(-1)`` exists.

Keys are arbitrary integers (negative and oversized values included) and are reduced
modulo 26; this is exact because arithmetic in Z_26 depends only on residues.
"""

from __future__ import annotations

from collections.abc import Callable

from app.modules.algebra.number_theory import gcd, mod_inverse

MODULUS = 26

_UPPER_BASE = ord("A")
_LOWER_BASE = ord("a")


class InvalidKeyError(ValueError):
    """Raised for a key that is not a valid key for the requested cipher.

    ``field`` names the offending key component (``"key"``, ``"a"`` or ``"b"``) so the API can
    point at it; it plays no part in the mathematics.
    """

    def __init__(self, message: str, field: str | None = None) -> None:
        super().__init__(message)
        self.field = field


# ---------------------------------------------------------------------------
# Alphabet <-> Z_26
# ---------------------------------------------------------------------------


def _map_letters(text: str, transform: Callable[[int], int]) -> str:
    """Apply ``transform`` to the number of each letter, keeping case and other characters.

    A letter is converted to ``x = ord(letter) - ord('A' or 'a')`` in ``0..25``,
    ``transform(x)`` is reduced mod 26, and the result is converted back to a letter of the
    same case.
    """
    out: list[str] = []
    for char in text:
        code = ord(char)
        if _UPPER_BASE <= code < _UPPER_BASE + MODULUS:
            out.append(chr(_UPPER_BASE + transform(code - _UPPER_BASE) % MODULUS))
        elif _LOWER_BASE <= code < _LOWER_BASE + MODULUS:
            out.append(chr(_LOWER_BASE + transform(code - _LOWER_BASE) % MODULUS))
        else:
            out.append(char)
    return "".join(out)


def _require_int(name: str, value: object, field: str) -> int:
    # bool is a subclass of int in Python but is never a meaningful key.
    if isinstance(value, bool) or not isinstance(value, int):
        raise InvalidKeyError(f"{name} must be an integer, got {type(value).__name__}.", field)
    return value


# ---------------------------------------------------------------------------
# Caesar cipher
# ---------------------------------------------------------------------------


def validate_caesar_key(key: object) -> int:
    """Check that ``key`` is an integer and return its residue ``key mod 26``."""
    return _require_int("Caesar key k", key, "key") % MODULUS


def caesar_encrypt(text: str, key: int) -> str:
    """Encrypt with ``E(x) = (x + k) mod 26``."""
    k = validate_caesar_key(key)
    return _map_letters(text, lambda x: x + k)


def caesar_decrypt(text: str, key: int) -> str:
    """Decrypt with ``D(y) = (y - k) mod 26``."""
    k = validate_caesar_key(key)
    return _map_letters(text, lambda y: y - k)


# ---------------------------------------------------------------------------
# Affine cipher
# ---------------------------------------------------------------------------

#: The values of ``a`` in ``0..25`` with ``gcd(a, 26) = 1``: Euler's phi(26) = 12 of them.
VALID_AFFINE_A: tuple[int, ...] = tuple(a for a in range(MODULUS) if gcd(a, MODULUS) == 1)


def validate_affine_key(a: object, b: object) -> tuple[int, int]:
    """Validate an affine key ``(a, b)`` and return its residues ``(a mod 26, b mod 26)``.

    Raises:
        InvalidKeyError: if ``a`` or ``b`` is not an integer, or if ``gcd(a, 26) != 1``.
            The message states the gcd and lists the valid residues of ``a``.
    """
    a_int = _require_int("Affine key a", a, "a")
    b_int = _require_int("Affine key b", b, "b")

    g = gcd(a_int, MODULUS)
    if g != 1:
        valid = ", ".join(str(v) for v in VALID_AFFINE_A)
        raise InvalidKeyError(
            f"Invalid affine key: a = {a_int} is not coprime to {MODULUS} "
            f"(gcd({a_int}, {MODULUS}) = {g}), so x -> a*x + b is not a bijection on "
            f"Z_{MODULUS} and cannot be decrypted. "
            f"Valid values of a (mod {MODULUS}) are: {valid}.",
            "a",
        )
    return a_int % MODULUS, b_int % MODULUS


def affine_encrypt(text: str, a: int, b: int) -> str:
    """Encrypt with ``E(x) = (a*x + b) mod 26``; requires ``gcd(a, 26) = 1``."""
    a_res, b_res = validate_affine_key(a, b)
    return _map_letters(text, lambda x: a_res * x + b_res)


def affine_decrypt(text: str, a: int, b: int) -> str:
    """Decrypt with ``D(y) = a^(-1) * (y - b) mod 26``; requires ``gcd(a, 26) = 1``."""
    a_res, b_res = validate_affine_key(a, b)
    a_inv = mod_inverse(a_res, MODULUS)
    return _map_letters(text, lambda y: a_inv * (y - b_res))
