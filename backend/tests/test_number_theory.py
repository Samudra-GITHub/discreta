"""Tests for the hand-written number theory. SymPy and ``math`` act as independent oracles."""

import math

import pytest
import sympy

from app.modules.algebra.number_theory import (
    NoModularInverseError,
    extended_gcd,
    gcd,
    mod_inverse,
)

SMALL_RANGE = range(-40, 41)


class TestGcd:
    @pytest.mark.parametrize(
        ("a", "b", "expected"),
        [(48, 18, 6), (26, 5, 1), (26, 13, 13), (17, 17, 17), (1071, 462, 21), (0, 9, 9), (9, 0, 9)],
    )
    def test_known_values(self, a, b, expected):
        assert gcd(a, b) == expected

    def test_gcd_of_zero_and_zero_is_zero(self):
        assert gcd(0, 0) == 0

    def test_result_is_never_negative_and_ignores_signs(self):
        assert gcd(-12, 18) == gcd(12, -18) == gcd(-12, -18) == 6

    def test_symmetric(self):
        for a in SMALL_RANGE:
            for b in SMALL_RANGE:
                assert gcd(a, b) == gcd(b, a)

    def test_agrees_with_math_gcd_and_sympy(self):
        for a in SMALL_RANGE:
            for b in SMALL_RANGE:
                assert gcd(a, b) == math.gcd(a, b) == int(sympy.gcd(a, b))

    def test_large_numbers(self):
        assert gcd(2**89 - 1, 2**61 - 1) == 1
        assert gcd(10**30, 10**20) == 10**20


class TestExtendedGcd:
    def test_documented_example(self):
        # 26 = 3*7 + 5, 7 = 1*5 + 2, 5 = 2*2 + 1  =>  1 = 3*26 - 11*7
        assert extended_gcd(26, 7) == (1, 3, -11)

    def test_bezout_identity_holds_for_all_small_pairs(self):
        for a in SMALL_RANGE:
            for b in SMALL_RANGE:
                g, x, y = extended_gcd(a, b)
                assert a * x + b * y == g

    def test_gcd_component_is_correct_and_non_negative(self):
        for a in SMALL_RANGE:
            for b in SMALL_RANGE:
                g, _, _ = extended_gcd(a, b)
                assert g >= 0
                assert g == math.gcd(a, b) == gcd(a, b)
                # SymPy's gcdex returns (x, y, g) for the same problem.
                assert g == int(sympy.gcdex(a, b)[2])

    def test_zero_cases(self):
        assert extended_gcd(0, 0) == (0, 1, 0)
        g, x, y = extended_gcd(7, 0)
        assert (g, 7 * x + 0 * y) == (7, 7)
        g, x, y = extended_gcd(0, 7)
        assert (g, 0 * x + 7 * y) == (7, 7)

    def test_large_numbers(self):
        a, b = 2**89 - 1, 3**40
        g, x, y = extended_gcd(a, b)
        assert g == math.gcd(a, b)
        assert a * x + b * y == g


class TestModInverse:
    UNITS_MOD_26 = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25]

    @pytest.mark.parametrize(
        ("a", "inverse"),
        [(1, 1), (3, 9), (5, 21), (7, 15), (9, 3), (11, 19), (15, 7), (17, 23), (19, 11), (21, 5), (23, 17), (25, 25)],
    )
    def test_all_inverses_modulo_26(self, a, inverse):
        assert mod_inverse(a, 26) == inverse

    def test_defining_property_for_every_unit(self):
        for a in self.UNITS_MOD_26:
            inv = mod_inverse(a, 26)
            assert 0 <= inv < 26
            assert (a * inv) % 26 == 1

    def test_agrees_with_sympy(self):
        for a in self.UNITS_MOD_26:
            assert mod_inverse(a, 26) == int(sympy.mod_inverse(a, 26))

    def test_inverse_of_inverse_is_original(self):
        for a in self.UNITS_MOD_26:
            assert mod_inverse(mod_inverse(a, 26), 26) == a

    def test_non_units_raise_with_a_mathematical_message(self):
        for a in set(range(26)) - set(self.UNITS_MOD_26):
            with pytest.raises(NoModularInverseError) as info:
                mod_inverse(a, 26)
            assert info.value.gcd == math.gcd(a, 26) != 1
            assert f"gcd({a}, 26)" in str(info.value)

    def test_error_is_a_value_error(self):
        with pytest.raises(ValueError):
            mod_inverse(2, 26)

    def test_negative_and_oversized_arguments_are_reduced(self):
        assert mod_inverse(-1, 26) == 25
        assert mod_inverse(-5, 26) == mod_inverse(21, 26)
        assert mod_inverse(5 + 26 * 1000, 26) == 21

    def test_exhaustive_against_brute_force_for_many_moduli(self):
        for m in range(2, 61):
            for a in range(m):
                brute = [x for x in range(m) if (a * x) % m == 1]
                if math.gcd(a, m) == 1:
                    assert brute == [mod_inverse(a, m)]
                else:
                    assert brute == []
                    with pytest.raises(NoModularInverseError):
                        mod_inverse(a, m)

    @pytest.mark.parametrize("m", [1, 0, -26])
    def test_modulus_below_two_is_rejected(self, m):
        with pytest.raises(ValueError, match="at least 2"):
            mod_inverse(3, m)

    def test_large_prime_modulus(self):
        p = 2**61 - 1
        inv = mod_inverse(123456789, p)
        assert (123456789 * inv) % p == 1


class TestIntegerOnlyArithmeticAtScale:
    """Huge operands, checked against Python's own `math.gcd` and `pow(a, -1, m)`.

    These tests confirm that results are exact integers satisfying Bezout's identity. Note that
    a stray floating-point division would NOT change the results at the scale of 10**40:
    Euclid's algorithm stays correct for any integer quotient, an inexact one only slows it
    down. Float arithmetic becomes detectable once a quotient exceeds the float range (about
    1.8e308), where `/` raises OverflowError; see
    test_quotients_beyond_the_range_of_a_float_do_not_overflow."""

    HUGE = 10**40

    def test_extended_gcd_with_a_huge_first_argument(self):
        g, x, y = extended_gcd(self.HUGE, 7)

        assert g == 1
        assert self.HUGE * x + 7 * y == 1
        assert abs(x) <= 7  # minimal Bezout coefficient: |x| <= b / (2g) rounded up
        assert y % self.HUGE == pow(7, -1, self.HUGE)  # Python's own inverse as the oracle

    def test_extended_gcd_with_a_huge_second_argument(self):
        g, x, y = extended_gcd(7, self.HUGE)

        assert g == 1
        assert 7 * x + self.HUGE * y == 1
        assert x % self.HUGE == pow(7, -1, self.HUGE)

    def test_extended_gcd_with_two_huge_arguments(self):
        a, b = 3**100 * 5**20, 3**60 * 7**40
        g, x, y = extended_gcd(a, b)

        assert g == math.gcd(a, b) == 3**60
        assert a * x + b * y == g

    def test_extended_gcd_with_huge_negative_arguments(self):
        for a, b in [(-self.HUGE, 7), (self.HUGE, -7), (-self.HUGE, -7), (7, -self.HUGE)]:
            g, x, y = extended_gcd(a, b)
            assert g == 1 and a * x + b * y == 1

    def test_all_returned_values_are_exact_integers_not_floats(self):
        for values in (extended_gcd(self.HUGE, 7), (gcd(10**30, 3), mod_inverse(7, self.HUGE))):
            for value in values:
                assert type(value) is int

    def test_gcd_of_a_googol_cubed_and_three(self):
        assert gcd(10**30, 3) == 1
        assert gcd(3, 10**30) == 1

    @pytest.mark.parametrize(
        ("a", "b"),
        [
            (10**30, 6),
            (10**30, 3 * 10**29),
            (10**40, 10**40),
            (-(10**30), 3),
            (10**30 + 1, 10**30),
            (2**200, 6**100),
            (10**40, 0),
        ],
    )
    def test_gcd_of_huge_integers_matches_the_standard_library(self, a, b):
        assert gcd(a, b) == math.gcd(a, b)

    def test_mod_inverse_with_a_huge_modulus_and_a_huge_argument(self):
        assert mod_inverse(7, self.HUGE) == pow(7, -1, self.HUGE)
        # 10**40 is congruent to 4 (mod 7), so 10**40 + 1 is congruent to 5 and invertible.
        assert mod_inverse(self.HUGE + 1, 7) == pow(self.HUGE + 1, -1, 7)
        assert mod_inverse(-self.HUGE, 7) == pow(-self.HUGE, -1, 7)
        assert (7 * mod_inverse(7, self.HUGE)) % self.HUGE == 1

    def test_quotients_beyond_the_range_of_a_float_do_not_overflow(self):
        """10**400 / 7 is about 1.4e399, larger than any float (max about 1.8e308), so an
        implementation that divided with `/` would raise OverflowError here."""
        beyond_float = 10**400

        g, x, y = extended_gcd(beyond_float, 7)
        assert g == 1 and beyond_float * x + 7 * y == 1
        assert gcd(beyond_float, 7) == 1
        assert gcd(beyond_float, 2 * 10**399) == math.gcd(beyond_float, 2 * 10**399) == 2 * 10**399
        assert mod_inverse(7, beyond_float) == pow(7, -1, beyond_float)
        # 10**400 is congruent to 4 (mod 7), so 10**400 + 1 is congruent to 5 and invertible.
        assert mod_inverse(beyond_float + 1, 7) == pow(beyond_float + 1, -1, 7)


class TestZeroAndNegativeEdges:
    @pytest.mark.parametrize(
        ("a", "b"),
        [(0, 0), (0, 7), (7, 0), (0, -7), (-7, 0), (-7, -7), (7, -7), (-4, 6), (4, -6), (-4, -6), (-1, 0), (0, -1)],
    )
    def test_extended_gcd_zero_and_negative_pairs(self, a, b):
        g, x, y = extended_gcd(a, b)

        assert g == math.gcd(a, b) >= 0
        assert a * x + b * y == g

    def test_gcd_zero_conventions(self):
        assert gcd(0, 0) == 0  # convention of this implementation, see the docs
        assert gcd(0, 5) == gcd(5, 0) == gcd(0, -5) == gcd(-5, 0) == 5
        assert gcd(-0, 0) == 0

    def test_gcd_with_one_and_minus_one(self):
        for n in (0, 1, -1, 26, -26, 10**20):
            assert gcd(n, 1) == gcd(1, n) == gcd(n, -1) == 1

    def test_gcd_is_unchanged_by_adding_multiples(self):
        for a, b in [(26, 5), (-26, 5), (84, 36), (0, 9)]:
            for k in (-3, 2, 10**6):
                assert gcd(a, b) == gcd(a + k * b, b)

    @pytest.mark.parametrize("a", [0, 26, 52, -26, 26 * 10**20])
    def test_zero_modulo_26_has_no_inverse(self, a):
        with pytest.raises(NoModularInverseError) as info:
            mod_inverse(a, 26)

        assert info.value.gcd == 26 and info.value.a == a and info.value.m == 26

    def test_mod_inverse_of_zero_modulo_any_modulus_fails(self):
        for m in (2, 3, 26, 97, 10**30):
            with pytest.raises(NoModularInverseError):
                mod_inverse(0, m)

    def test_mod_inverse_of_one_and_minus_one(self):
        for m in (2, 3, 26, 10**30):
            assert mod_inverse(1, m) == 1
            assert mod_inverse(-1, m) == m - 1

    def test_error_message_states_the_gcd_for_negative_arguments(self):
        with pytest.raises(NoModularInverseError, match=r"gcd\(-4, 26\) = 2"):
            mod_inverse(-4, 26)
