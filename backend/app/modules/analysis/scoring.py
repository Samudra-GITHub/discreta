"""The chi-squared statistic used to compare a letter distribution with English.

For observed letter counts ``O_i`` (``i = 0..25``) from a text of ``N`` letters, and expected
probabilities ``p_i``, the expected counts are ``E_i = N * p_i`` and

    chi^2 = sum_i (O_i - E_i)^2 / E_i

Observed and expected values are both *counts*, which is what makes the statistic
meaningful. A small value means the text's letters are distributed much like English; a large
value means they are not. With 26 letters there are 25 degrees of freedom.

The statistic ranks candidates; it does not prove that one of them is the plaintext.
"""

from __future__ import annotations

from collections.abc import Sequence


def expected_counts(total: int, proportions: Sequence[float]) -> list[float]:
    """Expected counts ``E_i = N * p_i`` for a text of ``total`` letters."""
    if total < 0:
        raise ValueError("The number of letters cannot be negative.")
    return [total * p for p in proportions]


def chi_squared(observed: Sequence[int], proportions: Sequence[float]) -> float:
    """Return ``sum((O - E)^2 / E)`` with ``E = N * p``.

    Raises:
        ValueError: if the sequences differ in length, a count is negative, a probability is
            not positive (``E`` would be zero or negative), or there are no letters at all
            (``N = 0`` makes every ``E`` zero, so the statistic is undefined).
    """
    if len(observed) != len(proportions):
        raise ValueError("observed and proportions must have the same length.")
    if any(o < 0 for o in observed):
        raise ValueError("Observed counts cannot be negative.")
    if any(p <= 0 for p in proportions):
        raise ValueError("Every expected probability must be positive.")
    total = sum(observed)
    if total == 0:
        raise ValueError("chi-squared is undefined for a text with no letters.")
    expected = expected_counts(total, proportions)
    return sum((o - e) ** 2 / e for o, e in zip(observed, expected, strict=True))


def chi_contributions(observed: Sequence[int], proportions: Sequence[float]) -> list[float]:
    """The individual terms ``(O_i - E_i)^2 / E_i``; all zero when there are no letters."""
    total = sum(observed)
    if total == 0:
        return [0.0] * len(observed)
    expected = expected_counts(total, proportions)
    return [(o - e) ** 2 / e for o, e in zip(observed, expected, strict=True)]
