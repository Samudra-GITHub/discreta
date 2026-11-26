# Caesar and affine ciphers

This note explains the mathematics implemented in `backend/app/modules/algebra/`:

| File | Contents |
| --- | --- |
| `number_theory.py` | `gcd` (Euclid), `extended_gcd`, `mod_inverse` |
| `ciphers.py` | Caesar and affine encryption, decryption and key validation |
| `schemas.py`, `router.py` | The HTTP API over those functions |

All algorithms are written from scratch with integer arithmetic. SymPy appears only in the
test suite, as an independent check (see [Verification](#9-verification)).

## 1. Alphabet-to-number mapping

Each letter is identified with its position in the alphabet, starting from 0:

| A | B | C | D | E | F | G | H | I | J | K | L | M |
| - | - | - | - | - | - | - | - | - | - | - | - | - |
| 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |

| N | O | P | Q | R | S | T | U | V | W | X | Y | Z |
| - | - | - | - | - | - | - | - | - | - | - | - | - |
| 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 |

In code, `x = ord(letter) − ord('A')` for upper case and `x = ord(letter) − ord('a')` for
lower case. The numbers are elements of ℤ₂₆, the integers modulo 26. Lower-case letters use
the same numbers and the result keeps the case of the input.

Characters outside `A–Z` and `a–z` (spaces, digits, punctuation, accented or non-Latin
letters) are not part of the alphabet. They are copied through unchanged.

## 2. Modular arithmetic

For an integer n ≥ 2, **a ≡ b (mod n)** means n divides a − b. Every integer is congruent
to exactly one **residue** in {0, 1, …, n − 1}, written `a mod n`.

- 29 mod 26 = 3, because 29 = 1·26 + 3.
- −3 mod 26 = 23, because −3 = (−1)·26 + 23. The residue is never negative. (Python's `%`
  already behaves this way for a positive modulus.)
- 1000 mod 26 = 12, because 1000 = 38·26 + 12.

Addition and multiplication respect congruence: if a ≡ a′ and b ≡ b′ (mod n) then
a + b ≡ a′ + b′ and ab ≡ a′b′ (mod n). Consequently a key can be replaced by its residue
without changing the cipher. That is why negative and oversized keys are accepted: the
implementation reduces them mod 26 and the result is exact, not an approximation.

## 3. Caesar cipher

**Definition.** For a key k ∈ ℤ₂₆ and a letter with number x:

```text
E(x) = (x + k) mod 26        D(y) = (y − k) mod 26
```

**Derivation of D.** Encryption adds k, so decryption must undo the addition by adding the
additive inverse −k.

**Correctness.** D(E(x)) = ((x + k) mod 26 − k) mod 26. Since `u mod 26 ≡ u`, this is
congruent to x + k − k = x, and both sides lie in 0..25, so D(E(x)) = x.

**Any integer key.** E depends only on k mod 26, so k = −3 acts like 23 and k = 29 acts like 3.

**Key space.** 26 keys (k = 0 is the identity). All 26 can be tried in a brute-force attack.

## 4. Affine cipher

**Definition.** For a key (a, b) and a letter with number x:

```text
E(x) = (a·x + b) mod 26
```

This generalises Caesar: a = 1 gives the Caesar cipher with k = b.

**Decryption.** Suppose y ≡ a·x + b (mod 26). Subtract b: y − b ≡ a·x. If a has a
multiplicative inverse a⁻¹ modulo 26, multiply both sides by it:

```text
a⁻¹ (y − b) ≡ a⁻¹ a x ≡ x        so        D(y) = a⁻¹ (y − b) mod 26
```

Decryption therefore exists exactly when a⁻¹ exists, which is the subject of the next
sections.

## 5. GCD and coprimality

The **greatest common divisor** gcd(a, b) is the largest positive integer dividing both,
when at least one of a, b is non-zero. Two integers are **coprime** when gcd(a, b) = 1.
Signs are ignored: gcd(−12, 18) = 6, and the result is never negative.

**Convention used here: gcd(0, 0) = 0.** Every integer divides 0, so there is no *largest*
common divisor and the definition above does not apply. Defining the value as 0 keeps
gcd(a, 0) = |a| and gcd(a, b) = gcd(b, a mod b) valid for every input, and it agrees with
Python's `math.gcd`. The ciphers never need it, because they only compute gcd(a, 26).

**Theorem (invertibility).** Let n ≥ 2. The congruence a·x ≡ 1 (mod n) has a solution if
and only if gcd(a, n) = 1.

*Proof.* (⇐) By Bézout's identity (section 6) there are integers x, y with
a·x + n·y = 1, so a·x ≡ 1 (mod n). (⇒) If a·x ≡ 1 then a·x − 1 = n·k for some k, so
a·x − n·k = 1. Any common divisor of a and n divides the left side, hence divides 1. ∎

**Theorem (when the affine map is a bijection).** The map f(x) = a·x + b on ℤ₂₆ is a
bijection if and only if gcd(a, 26) = 1.

*Proof.* (⇐) a is invertible, and f has the inverse y ↦ a⁻¹(y − b). (⇒) Let g = gcd(a, 26)
> 1. Then 0 < 26/g < 26 and a·(26/g) = (a/g)·26 ≡ 0 (mod 26), so f(0) = f(26/g) with
0 ≠ 26/g. The map is not injective, so no decryption can exist. ∎

**Valid multipliers.** Since 26 = 2 · 13, gcd(a, 26) = 1 means a is odd and not a multiple of
13. In 0..25 that leaves

```text
a ∈ {1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25}
```

which is φ(26) = φ(2)·φ(13) = 1 · 12 = 12 values (φ is Euler's totient function). With 26
choices of b, the affine cipher has 12 × 26 = **312 keys**.

**Examples of invalid multipliers.**

- a = 2: gcd(2, 26) = 2. Then x = 0 and x = 13 collide, since 2·13 = 26 ≡ 0.
- a = 13: gcd(13, 26) = 13. Then 13·x is 0 for every even x, so 13 letters share one image.
- a = 0 or a = 26: gcd = 26, and every letter encrypts to the same letter.

The implementation applies the rule to the integer exactly as given: a is valid when
gcd(a, 26) = 1. Because gcd(a, 26) = gcd(a mod 26, 26), integers such as 31 (≡ 5) or −1
(≡ 25) are valid and behave like their residues. The API reports the residues as
`effective_a` and `effective_b`.

## 6. Extended Euclidean algorithm

**Euclidean algorithm.** Repeating gcd(a, b) = gcd(b, a mod b) until the second argument is
0 gives the gcd, because any common divisor of a and b also divides a − q·b.

**Bézout's identity.** For integers a, b there exist integers x, y with
a·x + b·y = gcd(a, b). The **extended** algorithm finds them by tracking, for every
remainder r in the Euclidean algorithm, coefficients (x, y) with r = a·x + b·y.

Start with the rows (r, x, y) = (a, 1, 0) and (b, 0, 1). Each step divides, q = r_prev // r,
and forms the new row as `row_prev − q · row`. When the remainder reaches 0, the previous row
holds (gcd, x, y). The code (`extended_gcd`) keeps exactly this invariant:
`old_r = a·old_x + b·old_y` and `r = a·x + b·y`.

**Worked example: extended_gcd(26, 7).**

| step | q | r | x (coefficient of 26) | y (coefficient of 7) |
| --- | --- | --- | --- | --- |
| start | | 26 | 1 | 0 |
| start | | 7 | 0 | 1 |
| 1 | 3 | 5 | 1 | −3 |
| 2 | 1 | 2 | −1 | 4 |
| 3 | 2 | 1 | 3 | −11 |
| 4 | 2 | 0 | | |

The last non-zero row gives **1 = 3·26 + (−11)·7**, so gcd(26, 7) = 1 and the function returns
`(1, 3, −11)`. Check: 78 − 77 = 1.

## 7. Modular multiplicative inverse

Given gcd(a, n) = 1, extended Euclid yields a·x + n·y = 1. Reducing modulo n kills the term
n·y, so a·x ≡ 1 (mod n): **a⁻¹ = x mod n**. If gcd(a, n) ≠ 1 there is no inverse, and
`mod_inverse` raises an error stating the gcd.

From the table above, x = −11 for a = 7, so 7⁻¹ ≡ −11 ≡ 15 (mod 26). Check: 7 · 15 = 105 =
4·26 + 1.

All twelve inverses modulo 26:

| a | 1 | 3 | 5 | 7 | 9 | 11 | 15 | 17 | 19 | 21 | 23 | 25 |
| - | - | - | - | - | - | - | -- | -- | -- | -- | -- | -- |
| a⁻¹ | 1 | 9 | 21 | 15 | 3 | 19 | 7 | 23 | 11 | 5 | 17 | 25 |

## 8. Worked examples

### Caesar, key k = 3: HELLO

| letter | H | E | L | L | O |
| --- | --- | --- | --- | --- | --- |
| x | 7 | 4 | 11 | 11 | 14 |
| x + 3 | 10 | 7 | 14 | 14 | 17 |
| letter | K | H | O | O | R |

`HELLO` → `KHOOR`. Decrypting subtracts 3 from each number and returns `HELLO`.

### Caesar with a negative or oversized key

- k = −3 on `D` (x = 3): (3 − 3) mod 26 = 0, which is `A`.
- k = 29 behaves like k = 3 because 29 mod 26 = 3. On `HELLO` it also gives `KHOOR`.

### Affine, key (a, b) = (5, 8): AFFINE CIPHER

First, gcd(5, 26) = 1, so the key is valid. Euclid: 26 = 5·5 + 1, so 1 = 26 − 5·5 and
5⁻¹ ≡ −5 ≡ **21** (mod 26). Check: 5 · 21 = 105 = 4·26 + 1.

Encryption of the first six letters (`AFFINE`):

| letter | A | F | F | I | N | E |
| --- | --- | --- | --- | --- | --- | --- |
| x | 0 | 5 | 5 | 8 | 13 | 4 |
| 5x + 8 | 8 | 33 | 33 | 48 | 73 | 28 |
| mod 26 | 8 | 7 | 7 | 22 | 21 | 2 |
| letter | I | H | H | W | V | C |

The full message `AFFINE CIPHER` encrypts to `IHHWVC SWFRCP`.

Decryption of `W` (y = 22): 21 · (22 − 8) = 21 · 14 = 294 = 11·26 + 8, so x = 8, which is `I`.
Decrypting the whole ciphertext returns `AFFINE CIPHER`.

### Affine, invalid key (a, b) = (4, 3)

gcd(4, 26) = 2 ≠ 1, so the key is rejected. The error message states
`gcd(4, 26) = 2`, explains that x ↦ a·x + b is not a bijection on ℤ₂₆, and lists the valid
multipliers.

## 9. Verification

- `tests/test_number_theory.py`: `gcd`, `extended_gcd` and `mod_inverse` checked against
  `math.gcd`, `sympy.gcd`, `sympy.gcdex` and `sympy.mod_inverse` for every pair in
  −40..40, Bézout's identity `a·x + b·y = g` for each pair, an exhaustive brute-force
  comparison of `mod_inverse` for all moduli 2..60, zero and negative edge cases, and
  integer-only checks at the scale of 10⁴⁰ (where a stray floating-point division would
  lose digits) against Python's `math.gcd` and `pow(a, -1, m)`.
- `tests/test_caesar.py`: known answers, empty and single-character input, case and
  non-letter preservation, negative and oversized keys, round trips, and agreement with
  `sympy.crypto.crypto.encipher_shift` for all 26 keys.
- `tests/test_affine.py`: all 12 valid multipliers with every b (round trip, permutation of
  the alphabet, agreement with `encipher_affine` for all 312 keys), rejection of each of the
  14 invalid residues with the correct gcd in the message, and the non-injectivity argument
  from section 5 checked numerically.
- Both cipher test files also check, for every one of the 128 ASCII characters, that only
  `A–Z` and `a–z` change (with explicit cases for `@`, `[`, `` ` `` and `{`, the characters
  next to the letter ranges), and that invalid multipliers are rejected whatever `b` is.
- `tests/test_algebra_api.py`: the four endpoints, validation errors, the exact positive and
  negative key boundaries (±9007199254740991 accepted, one beyond rejected) with limits
  written as literals rather than imported from the code, JSON floats, unknown fields and
  CORS.
- `tests/test_api_errors.py`: the uniform error shape, `NaN`, `Infinity` and unpaired
  surrogates (clean 422, never 500), no echo of input, the request-size limit (declared,
  chunked and falsified lengths), unexpected errors staying generic 500s, and the OpenAPI
  error schema.
- The main worked examples above (`HELLO` → `KHOOR`, `AFFINE CIPHER` → `IHHWVC SWFRCP`,
  `extended_gcd(26, 7) = (1, 3, −11)`, the twelve inverses, the invalid key (4, 3)) are
  asserted in the tests.

## 10. API

Base path `/api/v1/algebra`, all `POST` with a JSON body.

| Endpoint | Body | Computes |
| --- | --- | --- |
| `/caesar/encrypt` | `{"text": "...", "key": 3}` | E(x) = (x + k) mod 26 |
| `/caesar/decrypt` | `{"text": "...", "key": 3}` | D(y) = (y − k) mod 26 |
| `/affine/encrypt` | `{"text": "...", "a": 5, "b": 8}` | E(x) = (a·x + b) mod 26 |
| `/affine/decrypt` | `{"text": "...", "a": 5, "b": 8}` | D(y) = a⁻¹(y − b) mod 26 |

A successful response (HTTP 200) echoes the input and reports the result, the keys as
submitted, and the reduced keys that were actually used: `effective_key` (k mod 26) for
Caesar, and `effective_a`, `effective_b` and `a_inverse` for the affine cipher. Encryption
shifts by `effective_key`; decryption shifts by its negative.

### Input limits

These are limits of the API, not of the mathematics. The functions in `ciphers.py` and
`number_theory.py` accept any Python integer.

- `text`: at most 10,000 characters (Unicode code points, not bytes), and valid Unicode (no
  unpaired surrogates).
- `key`, `a`, `b`: JSON integers with absolute value at most **9007199254740991** (2⁵³ − 1),
  the largest integer a JavaScript number represents exactly. Beyond it a browser would round
  the key before sending it. Integral floats such as `3.0` or `1e2` are rejected.
- Request body: at most 262,144 bytes (256 KiB). The largest valid request is about 120 KB:
  10,000 characters, each written in the worst case as an escaped surrogate pair.

### Errors

Every error response has the same body, a list of problems. The offending input is never
echoed back, so responses stay small and can always be serialised:

```json
{"detail": [{"loc": ["body", "a"], "msg": "Invalid affine key: a = 4 is not coprime to 26 ...", "type": "invalid_key"}]}
```

`loc` names the field, `msg` explains the problem, and `type` is a stable code (for example
`missing`, `extra_forbidden`, `int_type`, `string_type`, `string_too_long`,
`less_than_equal`, `greater_than_equal`, `json_invalid`, `invalid_key`). At most 20 problems
are listed, followed by an entry of type `truncated` when there were more.

| Status | When |
| --- | --- |
| 200 | Success. |
| 307 | The URL ends in a slash (`/caesar/encrypt/`): redirect to the URL without it. |
| 400 | The body cannot be parsed before validation, for example an integer literal of more than 4,300 digits (Python's own limit). Type `bad_request`, empty `loc`. |
| 404 | Unknown path (`not_found`). |
| 405 | Wrong method, such as `GET` (`method_not_allowed`); the `Allow: POST` header is kept. |
| 413 | Body larger than 262,144 bytes (`payload_too_large`). Checked before parsing, including for chunked bodies with no declared length. |
| 422 | The request is malformed or invalid: missing or unknown field, wrong type (strings, booleans, `null`, floats, `NaN`, `Infinity`), key out of range, text too long or containing an unpaired surrogate, or invalid JSON. Also a mathematically invalid key: `invalid_key` with `loc` `["body", "a"]` for an affine multiplier that is not coprime to 26. |
| 500 | An unexpected server error. The message is always the fixed text `Internal server error.` with type `internal_error`; no exception text or stack trace is sent. |

Malformed or invalid input is meant to produce 422 (or 413, or the rare 400 above). A 500
always indicates a server bug, never a client mistake.

Interactive documentation, including these error schemas, is at `/docs`.

## 11. Why these ciphers are not secure

The Caesar and affine ciphers are teaching tools. They must not be used to protect real
data. The reasons, from the weakest point to the most structural:

- **Tiny key spaces.** There are 26 Caesar keys (about 2⁴·⁷) and 312 affine keys (about
  2⁸·³). An attacker tries them all in microseconds. Modern ciphers use keys of at least 128
  bits, a space of about 3.4 × 10³⁸.
- **Known-plaintext attack on the affine cipher.** Two known plaintext/ciphertext letter
  pairs reveal the whole key. From y₁ ≡ a·x₁ + b and y₂ ≡ a·x₂ + b, subtracting gives
  y₁ − y₂ ≡ a·(x₁ − x₂). If gcd(x₁ − x₂, 26) = 1, then a ≡ (y₁ − y₂)·(x₁ − x₂)⁻¹ (mod 26)
  directly, and b ≡ y₁ − a·x₁. If the difference is even, the congruence has two solutions for
  a that differ by 13; exactly one is odd, so exactly one is a valid multiplier. Only a
  difference of 13 gives no information (12 keys still fit), and then any other pair settles
  it. For the Caesar cipher a single pair is enough: k ≡ y − x.

  *Example.* Suppose `A` encrypts to `I` and `F` encrypts to `H`. Then x₁ = 0, y₁ = 8,
  x₂ = 5, y₂ = 7. Here x₁ − x₂ ≡ 21 and y₁ − y₂ ≡ 1, and 21⁻¹ ≡ 5 (mod 26), so
  a ≡ 1 · 5 = 5 and b ≡ 8 − 5 · 0 = 8. This is the key (5, 8) used in section 8.
- **Frequency patterns survive.** Each plaintext letter always becomes the same ciphertext
  letter, so the set of letter counts is the same, only attached to different letters: the
  frequencies are *permuted, not eliminated*. In English the most common letters (`E`, `T`,
  `A`) therefore still stand out as the most common ciphertext letters, and repeated letters
  and word shapes (`LL`, `THE`) keep their form. This is what the Analysis Lab's frequency
  analysis exploits (see [Frequency analysis](frequency-analysis.md)).
- **Deterministic encryption.** The same plaintext and key always give the same ciphertext.
  There is no random nonce or IV, so an eavesdropper sees exactly which parts of a message
  repeat, and identical messages are recognisable.
- **No integrity protection.** There is no authentication tag. Any string of letters
  decrypts to *something*, so tampering cannot be detected, and the effect of a change is
  predictable: adding j to a ciphertext letter of a Caesar cipher subtracts j from the
  plaintext letter.
- **Keeping the algorithm secret is not security.** The mathematics above is public by
  design. Security has to come from the key alone, and here the key is trivially recoverable.

## 12. Limitations

- **Not secure.** See section 11.
- **26-letter Latin alphabet only.** Accented letters, other scripts, digits and symbols are
  not enciphered; they are copied through unchanged. Case is preserved.
- **API bounds.** Text up to 10,000 characters, keys up to ±9007199254740991, request bodies
  up to 262,144 bytes. The core functions accept any Python integer.
- **Integers beyond about 4,300 digits** in a request body are refused with HTTP 400 by
  Python's parser before the API can validate them.
- **Duplicate keys in a JSON body** are accepted and the last one wins, as in most JSON
  parsers.
- **Attacks live elsewhere.** This note covers only the ciphers. Section 11 describes the weaknesses; the
  frequency analysis and key search that exploit them are in [Frequency analysis](frequency-analysis.md), and the
  Vigenère cipher is in [The Vigenère cipher](vigenere.md).
