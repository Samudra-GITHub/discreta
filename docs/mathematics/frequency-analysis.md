# Frequency analysis and statistical key search

This note explains the mathematics implemented in `backend/app/modules/analysis/`:

| File | Contents |
| --- | --- |
| `english.py` | The English reference table (percentages and normalised probabilities) |
| `scoring.py` | The chi-squared statistic |
| `frequency.py` | Letter counts, character treatment, ranking, the per-letter report |
| `cryptanalysis.py` | Caesar (26 keys) and affine (312 keys) key ranking, reliability |
| `schemas.py`, `router.py` | The HTTP API |

It builds on [Caesar and affine ciphers](caesar-and-affine.md): letters are numbers in ℤ₂₆, and
both ciphers are bijections of ℤ₂₆. SymPy is not used. The tests use `collections.Counter`,
`fractions`, `math.gcd` and `pow(a, -1, 26)` as independent oracles.

## 1. What is counted

Only the 52 ASCII letters are counted, and case is ignored (`A` and `a` are the same letter).

| Character | Treatment |
| --- | --- |
| `A`–`Z`, `a`–`z` | counted |
| spaces and other ASCII whitespace | ignored |
| digits `0`–`9` | ignored |
| other ASCII characters (punctuation, symbols, control characters) | ignored |
| non-ASCII characters of any kind (é, Ω, 你, emoji, full-width letters) | ignored |

Characters are classified by explicit code-point ranges. `str.lower()` and `str.isalpha()` are
deliberately avoided, because some non-ASCII characters behave like ASCII letters under them (the
Kelvin sign U+212A lowercases to `k`, the long s U+017F uppercases to `S`). The Caesar and affine
ciphers copy every non-ASCII-letter character through unchanged, so such characters carry no
information about the key. The input text is never altered.

Let `Oᵢ` be the number of occurrences of letter `i` (`A = 0 … Z = 25`) and `N = Σ Oᵢ` the number of
letters. The **relative frequency** of letter `i` is `Oᵢ / N`. With `N = 0` (empty text,
punctuation only, non-ASCII only) every count and share is 0 and no statistic is defined.

The **rank** of a letter orders the letters by `Oᵢ`, largest first; equal counts are ordered
alphabetically so the ranking is deterministic.

## 2. The English reference

The reference is the widely quoted table from R. Lewand, *Cryptological Mathematics* (2000),
for example E 12.702 %, T 9.056 %, A 8.167 %, … Z 0.074 %. As printed (rounded to three decimals)
the 26 values add up to 99.999, not 100, so they are **normalised**:

```
pᵢ = (printed percentage of letter i) / 99.999        so that  Σ pᵢ = 1
```

The reference is an average over many texts. A particular passage, especially a short one, can differ
from it a lot; a table for another language would need other values.

## 3. The chi-squared statistic

For a text of `N` letters, the expected count of letter `i` if the text followed English is
`Eᵢ = N · pᵢ`. The statistic is

```
χ² = Σᵢ (Oᵢ − Eᵢ)² / Eᵢ
```

Observed and expected values are both **counts** (not one count and one percentage), which is what
makes the statistic meaningful. Every `pᵢ > 0`, so no `Eᵢ` is zero when `N > 0`.

Reading it: a text drawn at random from a distribution `p` has, on average, `E[χ²] = 25` (26 letters
minus 1 constraint = 25 degrees of freedom). Real English passages usually score somewhat above that
because they are not a random sample of the table; a text whose letters are unrelated to English scores
far higher, and the gap grows with `N`. χ² therefore *ranks* candidates; it does not give a probability
that a candidate is correct, and the two figures must not be confused.

Each letter's term `(Oᵢ − Eᵢ)² / Eᵢ` is also returned, and the terms sum to the statistic (tested).

## 4. Why trying every key works

A Caesar or affine cipher replaces every plaintext letter `x` by `y = f(x)` for one fixed bijection
`f` of ℤ₂₆. The ciphertext therefore has the *same multiset of letter counts* as the plaintext, only
relabelled: `C_{f(x)} = P_x`. Decrypting with a wrong key relabels the counts incorrectly and produces
letter counts unlike English, while the right key restores them. So ranking all keys by the χ² of the
decrypted text tends to put the right key first.

### Caesar: 26 keys

Decrypting with `k` sends ciphertext letter `y` to `x = (y − k) mod 26`, so the plaintext count of
letter `x` equals the ciphertext count of letter `(x + k) mod 26`. The backend scores each key from the
rotated counts, then decrypts only to display the text. The tests check that these scores equal the χ²
of the really decrypted text, computed independently with `Counter`.

### Affine: 312 keys

A key `(a, b)` is valid exactly when `gcd(a, 26) = 1` (proved in the Caesar and affine note). Of the
residues `0 … 25`, φ(26) = 12 qualify: `1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25`. With 26 offsets this
gives **12 × 26 = 312** keys, and every one of them is ranked; invalid multipliers are never generated.
Decrypting with `(a, b)` sends `y` to `x = a⁻¹ (y − b) mod 26`, where `a⁻¹` comes from the
extended Euclidean algorithm. The affine multiplier `a = 1` gives the Caesar ciphers, so the best Caesar
key `k` and the affine key `(1, k)` have identical scores.

To keep responses small, only the best `plaintext_limit` candidates (default 20, at most 312) carry
their decrypted text; any other candidate is decrypted on demand through the ordinary affine decryption
endpoint.

## 5. How far to trust the ranking

* The ranking is an **estimate**. The best-scoring candidate is not guaranteed to be the plaintext.
* **Short texts** give noisy counts. The backend reports a `reliability`: `very_low` below 20 letters
  (Caesar) or 50 (affine), `low` below 60 or 150, otherwise `adequate`. These thresholds are heuristics
  chosen for teaching, not statistical constants. The affine search needs more text because it must tell
  312 keys apart rather than 26.
* **Unusual text** breaks the assumption. A pangram uses every letter about equally and does not look like
  English, so the true key is not ranked first for any of the 312 affine keys (tested).
* `separation` is the runner-up's χ² divided by the best χ². A value near 1 means the top candidates are
  hard to tell apart.
* The reference is English only.
* Classical ciphers are broken here in milliseconds; this is a study of why they are not secure.

## 6. Verification

* Hand-computed χ² examples (`[10, 20]` against `[½, ½]` gives 50/15; `[30, 30, 40]` against
  `[0.2, 0.3, 0.5]` gives 7), cross-checked with exact rational arithmetic.
* Letter counts agree with `collections.Counter` on a 459-letter passage; look-alike, full-width,
  non-ASCII, empty and punctuation-only inputs are tested.
* All 26 Caesar keys and all 312 affine keys are recovered from a 459-letter passage; the 312 key pairs
  equal `{(a, b) : gcd(a, 26) = 1}`, every `a·a⁻¹ ≡ 1 (mod 26)` and each multiplier appears with 26
  offsets.
* Every candidate's score equals the χ² of the actually decrypted text.
* Short texts are flagged, and the limits above (very short text, pangram) are tested rather than hidden.

## 7. API

All endpoints are `POST` with a JSON body and share the error format of the cipher API
(`{"detail": [{"loc", "msg", "type"}]}`; text at most 10,000 characters; body at most 256 KiB).

| Endpoint | Body | Reply |
| --- | --- | --- |
| `/api/v1/analysis/frequency` | `{"text"}` | per-letter counts, shares, English comparison, ranks, χ², character breakdown |
| `/api/v1/analysis/caesar/crack` | `{"text"}` | all 26 keys ranked, with text, χ², reliability |
| `/api/v1/analysis/affine/search` | `{"text", "plaintext_limit"?}` | all 312 keys ranked, χ², inverses, reliability |

A text without letters is a valid input for `/frequency` (all zeros, `chi_squared: null`) and a 422
error of type `no_letters` for the two key searches, which have nothing to score.

## References

* R. Lewand, *Cryptological Mathematics*, MAA, 2000: English letter frequencies.
* K. Rosen, *Discrete Mathematics and Its Applications*: modular arithmetic and the extended Euclidean algorithm.
* W. Stallings, *Cryptography and Network Security*: classical ciphers and frequency analysis.
