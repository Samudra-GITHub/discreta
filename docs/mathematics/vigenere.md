# The Vigenère cipher

This note explains the mathematics implemented in `backend/app/modules/algebra/ciphers.py`
(`vigenere_shifts`, `vigenere_encrypt`, `vigenere_decrypt`). It builds on
[Caesar and affine ciphers](caesar-and-affine.md): letters are numbers in ℤ₂₆ (`A = 0 … Z = 25`) and
all arithmetic is modulo 26. How such a cipher is attacked is in
[Polyalphabetic analysis](polyalphabetic-analysis.md).

## 1. Definition

A Vigenère key is a **keyword** of `m ≥ 1` letters. Read as numbers, its letters are shifts
`K₀, K₁, …, K_{m−1}` in `0 … 25`. Number the *letters* of the message `i = 0, 1, 2, …` and let `Pᵢ` and
`Cᵢ` be the numbers of the `i`-th plaintext and ciphertext letter. The key repeats, so letter `i` uses
the shift `K_{i mod m}`:

```
Encryption:   Cᵢ = (Pᵢ + K_{i mod m}) mod 26
Decryption:   Pᵢ = (Cᵢ − K_{i mod m} + 26) mod 26
```

Decryption undoes encryption because `(Pᵢ + K) − K ≡ Pᵢ (mod 26)`; adding 26 only keeps the intermediate
value non-negative before reducing, which is the same residue. With `m = 1` the cipher is exactly the
Caesar cipher with `k = K₀` (tested for all 26 shifts), and the keyword `A` repeated is the identity.

Each of the `m` key positions is therefore a separate Caesar cipher applied to every `m`-th letter. That
is why the cipher is called *polyalphabetic*: a given plaintext letter does not always become the same
ciphertext letter. The key space has `26ᵐ` keywords (for `m = 5`, 11,881,376).

## 2. Treatment of other characters

| Character | Treatment |
| --- | --- |
| ASCII letters `A–Z`, `a–z` | enciphered; **case is preserved** |
| spaces, digits, punctuation, symbols, line breaks | copied unchanged and **do not use up a key letter** |
| non-ASCII characters (é, 你, emoji) | copied unchanged and do not use up a key letter |
| the keyword | letters `A–Z`/`a–z` only; case is ignored (`Lemon` = `LEMON`) |

The key advances only on letters, so the keyword stays aligned with the letters however the text is
spaced or punctuated. (Some textbooks strip the punctuation first; the result is the same as long as
the ciphertext is read letter by letter.) The index `i` above counts letters only.

## 3. Keyword validation

The key is rejected, with HTTP 422 of type `invalid_key` and location `["body", "key"]`, when it is empty,
contains anything other than ASCII letters (spaces, digits, punctuation, accented letters), is not a
string, or is longer than 64 characters (an API limit; the pure functions accept any length). The error
message never repeats the keyword or the text.

## 4. Worked example

Key `LEMON` = shifts `(11, 4, 12, 14, 13)`, message `ATTACKATDAWN`:

| letter | A | T | T | A | C | K | A | T | D | A | W | N |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Pᵢ` | 0 | 19 | 19 | 0 | 2 | 10 | 0 | 19 | 3 | 0 | 22 | 13 |
| key | L | E | M | O | N | L | E | M | O | N | L | E |
| `Kᵢ` | 11 | 4 | 12 | 14 | 13 | 11 | 4 | 12 | 14 | 13 | 11 | 4 |
| `Pᵢ + Kᵢ` | 11 | 23 | 31 | 14 | 15 | 21 | 4 | 31 | 17 | 13 | 33 | 17 |
| `Cᵢ` | 11 | 23 | 5 | 14 | 15 | 21 | 4 | 5 | 17 | 13 | 7 | 17 |
| cipher | L | X | F | O | P | V | E | F | R | N | H | R |

So `ATTACKATDAWN` encrypts to `LXFOPVEFRNHR`. Note that the four `A`s become `L`, `O`, `E` and `N`, and the
three `T`s become `X`, `F` and `F`: single-letter frequencies are flattened. With punctuation and case,
`Attack at Dawn!` encrypts to `Lxfopv ef Rnhr!`: the space and `!` are copied, the case of every letter is
kept, and the key does not advance on them. Decrypting `LXFOPVEFRNHR` with the same key gives
`ATTACKATDAWN`, for example `(11 − 11 + 26) mod 26 = 0 → A`.

## 5. Verification

* Two textbook vectors as literals: `ATTACKATDAWN` / `LEMON` → `LXFOPVEFRNHR`, and
  `CRYPTOISSHORTFORCRYPTOGRAPHY` / `ABCD` → `CSASTPKVSIQUTGQUCSASTPIUAQJB`.
* The decryption formula `(C − K + 26) mod 26` is checked for all 26 × 26 pairs of letters.
* A separately written reference implementation (plain `ord`/`chr`) agrees with the code on 400 random
  texts and keys, including digits, punctuation and non-ASCII characters; encryption followed by
  decryption (and the reverse) returns the input for all of them.
* A single-letter key equals `caesar_encrypt` for every shift; repeating the keyword changes nothing;
  the keyword `AAAA` is the identity.
* Non-letters pass through and do not consume a key letter; invalid keywords raise errors that do not
  contain the keyword; the API tests cover the 413 and 422 responses.

## 6. Limitations

* **Not secure.** The key repeats, so every position is a Caesar cipher. Once the key length is known the
  cipher falls to frequency analysis column by column (see
  [Polyalphabetic analysis](polyalphabetic-analysis.md)), and the repetition leaks the key length through
  repeated sequences (Kasiski) and the index of coincidence. A long random key used once (a one-time pad)
  would be unbreakable, but that is a different cipher.
* **26-letter Latin alphabet only**, as for the other ciphers.
