"""Tests for Kasiski examination.

Oracles: hand-built strings with known repeats, a deliberately naive O(n^2) re-implementation that scans
every pair of positions, and ciphertexts made from a repeated plaintext block (so the repeat distance is
known from construction).
"""

import random
import string
import time
from math import gcd

import pytest

from app.modules.algebra.ciphers import vigenere_encrypt
from app.modules.analysis import kasiski as ks
from tests.passages import LONG_PASSAGE, VERY_LONG_PASSAGE


def naive_repeats(s: str, minimum: int = 3, cap: int = ks.MAX_SEQUENCE) -> set[tuple[int, int, int]]:
    """Every (first, second, length) of a left-maximal repeat, found by scanning all pairs of positions.

    For each later position j only the ``MAX_PARTNERS`` nearest earlier matching positions are kept,
    which is the documented limit of the real implementation.
    """
    found = set()
    for j in range(len(s) - minimum + 1):
        matches = [i for i in range(j) if s[i : i + minimum] == s[j : j + minimum]]
        for i in matches[-ks.MAX_PARTNERS :]:
            if i > 0 and s[i - 1] == s[j - 1]:
                continue
            length = minimum
            while length < cap and j + length < len(s) and s[i + length] == s[j + length]:
                length += 1
            found.add((i, j, length))
    return found


class TestLettersOnly:
    def test_keeps_ascii_letters_upper_cased(self):
        assert ks.letters_only("ab, Cd! 12 éz") == "ABCDZ"

    def test_empty(self):
        assert ks.letters_only("") == "" and ks.letters_only("123 !?") == ""


class TestHandBuiltExamples:
    def test_a_simple_repeat(self):
        # ABC at 0, 6 and 13.
        result = ks.kasiski("ABCXYZABCQRSTABC")
        pairs = {(r.first, r.second, r.distance, r.sequence) for r in result.repeats}
        assert pairs == {(0, 6, 6, "ABC"), (0, 13, 13, "ABC"), (6, 13, 7, "ABC")}
        assert result.total_repeats == 3
        assert result.distance_gcd == 1

    def test_distances_vote_for_their_divisors(self):
        result = ks.kasiski("ABCXYZABCQRSTABC")
        votes = {v.length: v.repeats for v in result.votes}
        # distances 6, 7 and 13: 6 = 2*3 votes for 2, 3 and 6; 7 and 13 are prime.
        assert votes == {2: 1, 3: 1, 6: 1, 7: 1, 13: 1}

    def test_a_longer_repeat_is_measured_and_counted_once(self):
        result = ks.kasiski("HELLOXQUICKZHELLOWQ")
        assert [(r.sequence, r.length, r.first, r.second) for r in result.repeats] == [("HELLO", 5, 0, 12)]
        assert result.total_repeats == 1

    def test_positions_count_letters_only_and_ignore_case(self):
        result = ks.kasiski("abc, ABC")
        assert [(r.first, r.second, r.distance) for r in result.repeats] == [(0, 3, 3)]

    def test_overlapping_repeats_are_allowed(self):
        result = ks.kasiski("ABABABX")
        assert [(r.first, r.second, r.distance) for r in result.repeats] == [(0, 2, 2)]

    def test_no_repeats(self):
        result = ks.kasiski(string.ascii_uppercase)
        assert result.total_repeats == 0 and result.repeats == () and result.votes == ()
        assert result.distance_gcd is None
        assert "No sequence of three or more letters repeats" in result.note

    @pytest.mark.parametrize("text", ["", "AB", "ABCAB", "123 !?", "你好"])
    def test_short_or_letterless_text(self, text):
        result = ks.kasiski(text)
        assert result.total_repeats == 0 and result.votes == ()
        assert "too short" in result.note

    def test_pairs_of_letters_are_not_repeats(self):
        assert ks.kasiski("ABXABYAB" "QQ").total_repeats == 0


class TestAgainstANaiveImplementation:
    def test_random_texts_over_small_alphabets(self):
        rng = random.Random(404)
        for alphabet in ("AB", "ABC", "ABCDE", string.ascii_uppercase[:8]):
            for _ in range(40):
                s = "".join(rng.choice(alphabet) for _ in range(rng.randint(0, 60)))
                got = {(r.first, r.second, r.length) for r in ks.find_repeats(s)}
                assert got == naive_repeats(s), (alphabet, s)

    def test_each_repeat_really_repeats(self):
        s = ks.letters_only(VERY_LONG_PASSAGE)
        for r in ks.find_repeats(s):
            assert s[r.first : r.first + r.length] == r.sequence == s[r.second : r.second + r.length]
            assert r.distance == r.second - r.first > 0
            assert r.length >= 3

    def test_distances_and_votes_follow_from_the_repeats(self):
        result = ks.kasiski(LONG_PASSAGE)
        everything = ks.find_repeats(ks.letters_only(LONG_PASSAGE))
        assert result.total_repeats == len(everything)
        for vote in result.votes:
            assert vote.repeats == sum(r.distance % vote.length == 0 for r in everything)
            assert vote.fraction == pytest.approx(vote.repeats / len(everything))
            assert all(r.distance % vote.length == 0 for r in vote.examples)
        expected_gcd = 0
        for r in everything:
            expected_gcd = gcd(expected_gcd, r.distance)
        assert result.distance_gcd == expected_gcd


class TestOnRealCiphertexts:
    @pytest.mark.parametrize("key", ["KEY", "LEMON", "CIPHER", "ABCDEFG"])
    def test_a_repeated_plaintext_block_gives_distances_that_are_multiples_of_the_key_length(self, key):
        m = len(key)
        block = "THEQUICKBROWNFOXJUMPSOVERTHELAZYDOG" * 0 + "WEMUSTMEETATTHEOLDBRIDGEBEFOREDAWNTOMORROW"
        block = block[: (len(block) // m) * m]  # a whole number of key periods
        assert len(block) % m == 0
        plaintext = block * 4
        cipher = vigenere_encrypt(plaintext, key)
        result = ks.kasiski(cipher)
        longest = result.repeats[0]
        assert longest.length == ks.MAX_SEQUENCE
        assert longest.distance == len(block)
        top = result.votes[0]
        assert top.repeats == result.total_repeats  # every repeat is a multiple of the block length
        assert any(v.length == m for v in result.votes)
        m_votes = next(v for v in result.votes if v.length == m)
        assert m_votes.repeats == result.total_repeats

    def test_the_true_key_length_collects_most_votes_on_english_ciphertext(self):
        for key in ("LEMON", "SECRET", "CRYPTOGRAPHY"):
            cipher = vigenere_encrypt(VERY_LONG_PASSAGE, key)
            result = ks.kasiski(cipher)
            true = len(key)
            true_votes = next(v.repeats for v in result.votes if v.length == true)
            # The true length (or one of its factors/multiples) is among the best supported.
            assert true_votes >= 0.5 * result.votes[0].repeats

    def test_a_monoalphabetic_cipher_still_repeats_by_chance_of_english(self):
        # Kasiski is only meaningful for repeating keys; the output must not claim a key length.
        result = ks.kasiski(VERY_LONG_PASSAGE)
        assert "not proof" in result.note

    def test_output_is_deterministic(self):
        cipher = vigenere_encrypt(LONG_PASSAGE, "LEMON")
        assert ks.kasiski(cipher) == ks.kasiski(cipher)


class TestRankingAndLimits:
    def test_votes_are_sorted_by_count_then_shorter_length(self):
        cipher = vigenere_encrypt(VERY_LONG_PASSAGE, "LEMON")
        votes = ks.kasiski(cipher).votes
        keys = [(-v.repeats, v.length) for v in votes]
        assert keys == sorted(keys)
        assert all(2 <= v.length <= ks.MAX_KEY_LENGTH for v in votes)

    def test_listing_is_capped_but_the_count_is_not(self):
        rng = random.Random(1)
        s = "".join(rng.choice("AB") for _ in range(600))
        result = ks.kasiski(s)
        assert len(result.repeats) <= ks.MAX_REPEATS_LISTED
        assert result.total_repeats >= len(result.repeats)

    def test_each_vote_has_at_most_three_examples(self):
        result = ks.kasiski(vigenere_encrypt(VERY_LONG_PASSAGE, "KEY"))
        assert all(len(v.examples) <= ks.EXAMPLES_PER_LENGTH for v in result.votes)

    @pytest.mark.parametrize("letter", ["A", "AB"])
    def test_the_longest_allowed_periodic_text_is_fast(self, letter):
        text = (letter * 10_000)[:10_000]
        start = time.perf_counter()
        result = ks.kasiski(text)
        assert time.perf_counter() - start < 2.0
        assert result.letters == 10_000

    def test_the_longest_allowed_random_text_is_fast(self):
        rng = random.Random(3)
        text = "".join(rng.choice(string.ascii_uppercase) for _ in range(10_000))
        start = time.perf_counter()
        ks.kasiski(text)
        assert time.perf_counter() - start < 2.0

    def test_sequence_length_is_capped(self):
        block = "THEQUICKBROWNFOXJUMPSOVERTHELAZYDOG"
        result = ks.kasiski(block + "ZZZZ" + block)
        assert result.repeats[0].length == ks.MAX_SEQUENCE
