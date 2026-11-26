# Polyalphabetic analysis: index of coincidence, Kasiski examination and Vigenère key recovery

This note explains the mathematics implemented in `backend/app/modules/analysis/`:

| File | Contents |
| --- | --- |
| `coincidence.py` | index of coincidence, reading thresholds, Friedman estimate |
| `kasiski.py` | repeated sequences, distances, key-length votes |
| `vigenere_analysis.py` | key-length ranking, per-column key letters, candidate keys |

It builds on [The Vigenère cipher](vigenere.md) and [Frequency analysis](frequency-analysis.md) (the χ²
statistic and the English reference). Everything here is **evidence and estimates**. Nothing proves a key
length, a key or a plaintext, and every result carries a reliability flag.

The worked numbers below come from one real run: the 459-letter English passage in `backend/tests/passages.py`
(`LONG_PASSAGE`) encrypted with the key `LEMON`.

## 1. The index of coincidence (IC)

For a text of `N` letters in which letter `i` occurs `fᵢ` times,

```
IC = Σᵢ fᵢ (fᵢ − 1) / (N (N − 1))
```

Choose two *different positions* of the text at random: `fᵢ(fᵢ − 1)` counts the ordered pairs of
different positions that both hold letter `i`, and `N(N − 1)` counts all ordered pairs, so the IC is the
probability that the two letters match. It is computed from the counts only (case-insensitive, ASCII
letters only).

*Example.* `HELLO WORLD` has `L = 3`, `O = 2`, and `H, E, W, R, D = 1` each, `N = 10`:
`Σ fᵢ(fᵢ − 1) = 6 + 2 = 8`, so `IC = 8 / 90 = 0.0889`. The implementation is tested against the definition
by brute force over all ordered pairs of positions.

**Reference values.** For ordinary English, `IC ≈ Σ pᵢ² = 0.0655` (using the normalised table of the
frequency note). For uniformly random letters, `IC = 26 · (1/26)² = 1/26 = 0.0385`.

**Edge cases.** With fewer than two letters the IC is undefined and the API returns `null` (never NaN or
infinity) with the reading `insufficient`. Text with no letters, one letter, punctuation only or digits only
behave the same way.

**What it tells you.** A substitution cipher (Caesar, affine) only relabels letters, so it **does not change
the IC**: an IC near 0.065 fits plain English or a monoalphabetic cipher (or a transposition). A
polyalphabetic cipher mixes several relabelings, so the IC falls towards 0.0385: the sample ciphertext has
`IC = 0.0426`. The reading thresholds are heuristics: `english_like` from 0.060, `flat` up to 0.045,
`intermediate` between. The IC is evidence about the *kind* of cipher, never proof: short text, unusual text
or a short key can put it anywhere. Reliability is `very_low` below 30 letters, `low` below 100.

**Friedman's key-length estimate.** If the text is English enciphered with a repeating key of length `m`,
then with `κp = 0.0655`, `κr = 1/26`:

```
m ≈ (κp − κr) N / ((N − 1) IC − κr N + κp)
```

(an IC of exactly `κp` gives `m = 1`; an IC of exactly `κr` gives `m = N`). For the sample, `IC = 0.0426`,
`N = 459` gives about 6.5, against a true length of 5. It is very rough, can be undefined when the
denominator is not positive, and is shown only as "rough estimate".

## 2. Kasiski examination

With a repeating key of length `m`, a plaintext fragment that occurs at two positions `a` and `b` enciphers
to the *same* ciphertext fragment when `b − a` is a multiple of `m`. So the distance between two
occurrences of a repeated ciphertext sequence is often a multiple of `m`, and the factors shared by many
distances point at `m`.

**Algorithm (as implemented).**

1. Take the letters only, upper-cased; positions count letters from 0.
2. A *repeat* is a sequence of at least 3 letters that occurs at two positions. Each trigram is paired with
   its (up to 8) most recent earlier occurrences, and the pair is kept only if it does not also match one
   letter further left (so each maximal repeat is recorded once, from its start). Its length is measured up
   to 20 letters. Overlapping repeats are allowed. The work is linear in the length of the text.
3. Each repeat has a *distance* `d = second − first`.
4. For each candidate key length `f` from 2 to 40, count the repeats whose distance `f` divides. Rank by that
   count (then by the shorter length). Also report the gcd of all distances.

*Example.* In `ABCXYZABCQRSTABC` the sequence `ABC` is at positions 0, 6 and 13, giving the repeats
`(0, 6)` distance 6, `(0, 13)` distance 13 and `(6, 13)` distance 7. The distance 6 votes for the key
lengths 2, 3 and 6; 7 and 13 are prime and vote only for themselves; the gcd of all distances is 1.

For the sample ciphertext there are 32 repeats. The key length 5 divides 30 of their distances; 2 and 10
divide 18; 3 divides 15. The true length collects the most votes, but note the bias: **every multiple of the
true length divides the same distances** (10 and 15 score well), and **chance** also repeats short sequences
(the votes for 2 and 3 come from such repeats). Kasiski is therefore listed as evidence beside the IC, and the
two are not merged into one score. With no repeats at all (a short text or a long key) there is no evidence,
and the response says so.

## 3. Ranking key lengths with the IC

For each candidate length `m` from 1 to 20 (never more than half the letters) the letters are split into `m`
columns (letter `i` goes to column `i mod m`) and the IC of each column is averaged into the **mean IC**.

* At the true length every column was enciphered with one Caesar shift, so each column looks like English:
  mean IC ≈ 0.0655 (sample: **0.0687** at 5, 0.0678 at 10).
* At other lengths the columns mix several shifts: mean IC ≈ 0.042 to 0.044 (sample: 0.0426 at 1, 0.0422 at 2,
  0.0418 at 3, 0.0427 at 4, 0.0428 at 6).

A length is called **plausible** when its mean IC is at least 0.055 *and* within 0.005 of the best mean IC in
the table (a divisor of the true length is better than random but clearly below the best). Multiples of the
true length are plausible too, so plausible lengths are listed shortest first, followed by the others in
order of mean IC. The **suggested length** is the first plausible one; if none qualifies, nothing is
suggested. The thresholds are heuristics chosen for teaching. Measured on 288 random keys of 1 to 12 letters
(two English passages), the suggestion equalled the true key length every time, which supports the heuristic
but does not make it a theorem: it needs a few dozen letters per column and English-like text.

## 4. Estimating the key letters

For a chosen length `m`, column `j` is a Caesar cipher whose shift is the key letter `K_j`. Decrypting the
column with shift `s` gives a candidate plaintext column; its χ² against English (the statistic of the
frequency note, with `E = n · pᵢ` for the `n` letters of the column) is small when `s = K_j`. The best shift
of each column is the estimated key letter; the response also lists the next two best shifts, the ratio
runner-up χ² ÷ best χ², and a reliability flag from the column size (`very_low` below 10 letters, `low` below
25).

*Example* (sample, `m = 5`, columns of 91 to 92 letters):

| position | letter | best χ² | alternatives (χ²) | runner-up ÷ best |
| --- | --- | --- | --- | --- |
| 1 | L | 13.8 | R 338.9, Y 366.2 | 24.6 |
| 2 | E | 66.4 | D 212.7, P 212.7 | 3.2 |
| 3 | M | 23.5 | S 303.9, Y 411.7 | 12.9 |
| 4 | O | 19.0 | A 272.7, H 391.6 | 14.3 |
| 5 | N | 31.1 | Y 207.8, C 350.9 | 6.7 |

## 5. Candidate keys

The columns are independent, so a candidate key is scored by the **sum of its letters' column χ²** and the
cheapest combinations of the best three shifts per column are enumerated best-first (at most 10 keys). Every
candidate is a valid keyword of the letters `A–Z`. Each is also used to decrypt the whole text, and the
**whole-text χ²** of the result is reported as an independent check (computed from the decrypted text, not
from the columns). For the sample: `LEMON` (column sum 153.8, whole-text χ² 24.8), then `LDMON` (300.1, 34.5),
`LPMON` (300.1, 39.0) and `LEMOY` (330.5, 60.9).

If the chosen length is a multiple of the true one, the best key is a repetition of the true key:
`LEMONLEMON` for `m = 10`. The response gives the **shortest equivalent key** (`LEMON`) alongside it. If the
chosen length is wrong the candidates are wrong, with a large whole-text χ², and the response does not claim
otherwise.

## 6. How far to trust it

* **Everything is an estimate.** Neither a key length nor a candidate key is proven. The interface labels
  results *measured* (counted from the text: letters, IC, repeats and their positions), *calculated* (derived
  by a formula: mean IC, χ²) or *suggestion* (the suggested length and the candidate keys).
* **Short texts.** Columns of fewer than about 25 letters make the key letters uncertain, and below about 10
  they are guesses; the tests include such a short text and check that it is flagged. Kasiski needs enough
  text for sequences to repeat.
* **Key length close to the text length** approaches a one-time pad, which this method cannot break.
* **Plaintext that is not ordinary English** (a pangram, another language, a list of random letters) breaks
  the assumption behind both the IC and χ².
* **Multiples and divisors.** Multiples of the true length look plausible; divisors look somewhat better than
  random. Both are why the shortest plausible length is suggested and the whole table is shown.
* The reference is English only, and the ciphers are not secure.

## 7. Verification

* IC: hand-computed fractions; agreement with the brute-force pairwise definition on random texts and with
  exact fractions on a 459-letter text; unchanged by Caesar shifts, lowered by Vigenère; never NaN or
  infinity; `null` for empty, one-letter, punctuation-only and non-ASCII-only text; Friedman values at the
  two reference ICs.
* Kasiski: hand-built strings with known positions and distances; a naive all-pairs implementation agrees
  with the code on random texts over small alphabets; ciphertexts from a repeated plaintext block have
  repeat distances equal to the block length; periodic and random 10,000-letter texts finish in well under
  two seconds; no repeats and short texts are handled.
* Key length and key letters: the suggested length is correct for all 288 seeded random keys of 1 to 12
  letters; the mean IC of every length equals the brute-force column IC; each column's best shift equals the
  minimum of χ² recomputed from `collections.Counter` and the raw table; the best candidate is the true key
  for 192 random keys when the right length is given; candidate keys are valid keywords whose decryptions match
  the independently tested cipher; multiples, wrong lengths, short texts, 1-letter and over-long key lengths,
  and the 10,000-letter limit are tested.

## 8. API

| Endpoint | Body | Reply |
| --- | --- | --- |
| `POST /api/v1/analysis/vigenere/lengths` | `{"text"}` | IC with reading and Friedman estimate, Kasiski repeats and votes, ranked lengths 1 to 20, suggested length, reliability |
| `POST /api/v1/analysis/vigenere/candidates` | `{"text", "key_length"}` (1 to 40) | per-column letters with alternatives, up to 10 ranked candidate keys with plaintexts, reliability |

The IC is also reported by `/api/v1/analysis/frequency`. Fewer than two letters is a 422 `insufficient_text`;
a key length larger than the number of letters is a 422 `invalid_key_length`. The full reference is in
[docs/api.md](../api.md).

## References

* F. Kasiski, *Die Geheimschriften und die Dechiffrir-Kunst*, 1863: repeated sequences.
* W. Friedman, *The Index of Coincidence and Its Applications in Cryptography*, 1922.
* W. Stallings, *Cryptography and Network Security*: polyalphabetic ciphers and their cryptanalysis.
