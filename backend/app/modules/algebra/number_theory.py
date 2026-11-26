"""Elementary number theory, implemented from scratch.

Everything here uses only integer arithmetic. SymPy is deliberately *not* imported:
it is used in the test suite as an independent check on these algorithms.

Contents
--------
* :func:`gcd`          - Euclidean algorithm.
* :func:`extended_gcd` - extended Euclidean algorithm (Bezout coefficients).
* :func:`mod_inverse`  - modular multiplicative inverse via ``extended_gcd``.
"""

from __future__ import annotations


class NoModularInverseError(ValueError):
    """Raised when ``a`` has no multiplicative inverse modulo ``m`` (gcd(a, m) != 1)."""

    def __init__(self, a: int, m: int, g: int) -> None:
        self.a = a
        self.m = m
        self.gcd = g
        super().__init__(
            f"{a} has no multiplicative inverse modulo {m}: "
            f"gcd({a}, {m}) = {g}, but an inverse exists only when gcd({a}, {m}) = 1."
        )


def gcd(a: int, b: int) -> int:
    """Greatest common divisor by the Euclidean algorithm.

    Uses ``gcd(a, b) = gcd(b, a mod b)`` until the remainder is 0. The result is
    always non-negative, ``gcd(a, 0) = |a|`` and ``gcd(0, 0) = 0``.
    """
    a, b = abs(a), abs(b)
    while b != 0:
        a, b = b, a % b
    return a


def extended_gcd(a: int, b: int) -> tuple[int, int, int]:
    """Extended Euclidean algorithm.

    Returns ``(g, x, y)`` such that ``g = gcd(a, b) >= 0`` and ``a*x + b*y = g``
    (Bezout's identity).

    The invariant maintained by the loop is::

        old_r = a*old_x + b*old_y
        r     = a*x     + b*y

    Each step replaces ``(old_r, r)`` by ``(r, old_r - q*r)`` with
    ``q = old_r // r``, applying the same linear combination to the coefficients,
    so the invariant holds until ``r`` reaches 0, at which point ``old_r`` is the gcd.
    """
    old_r, r = a, b
    old_x, x = 1, 0
    old_y, y = 0, 1

    while r != 0:
        q = old_r // r
        old_r, r = r, old_r - q * r
        old_x, x = x, old_x - q * x
        old_y, y = y, old_y - q * y

    if old_r < 0:  # keep the gcd non-negative (only possible for negative inputs)
        old_r, old_x, old_y = -old_r, -old_x, -old_y
    return old_r, old_x, old_y


def mod_inverse(a: int, m: int) -> int:
    """Multiplicative inverse of ``a`` modulo ``m``, in the range ``0 <= result < m``.

    Writing ``g = gcd(a, m) = a*x + m*y`` (extended Euclid): if ``g = 1`` then
    ``a*x ≡ 1 (mod m)``, so ``x mod m`` is the inverse. If ``g != 1`` no inverse exists.

    Raises:
        ValueError: if ``m < 2``.
        NoModularInverseError: if ``gcd(a, m) != 1``.
    """
    if m < 2:
        raise ValueError(f"modulus must be at least 2, got {m}")

    g, x, _ = extended_gcd(a % m, m)
    if g != 1:
        raise NoModularInverseError(a, m, g)
    return x % m
