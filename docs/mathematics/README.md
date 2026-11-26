# Mathematics notes

This folder holds the mathematical write-up that accompanies each implemented tool. A claim
is recorded here only after the corresponding code exists and is tested.

## Convention for each topic

One file per topic, each containing:

1. **Definitions**: the objects and operations, stated precisely.
2. **Theorems and proofs** (or references to them): for example, that `a` is invertible
   in ℤₙ if and only if gcd(a, n) = 1.
3. **Algorithm**: the procedure the code implements, with its complexity.
4. **Verification**: how SymPy and the test suite confirm the implementation, including
   edge cases.
5. **References**: textbook chapter or paper.

## Written

| Note | Core content |
| --- | --- |
| [Caesar and affine ciphers](caesar-and-affine.md) | ℤ₂₆ encoding, modular arithmetic, Caesar and affine derivations, gcd and coprimality, extended Euclid, modular inverses, worked examples, error handling and security notes (v0.2.0, corrected in v0.2.1) |
| [Frequency analysis and statistical key search](frequency-analysis.md) | Letter counts and character treatment, the English reference, the χ² statistic, why trying every key works, Caesar (26 keys) and affine (312 keys) ranking, reliability and limits (v0.4.0) |

## Not yet written

| Note | Core content |
| --- | --- |
| Vigenère cipher, Kasiski examination, index of coincidence | Repeated Caesar shifts under a keyword of length m; IC = Σ nᵢ(nᵢ − 1) / (N(N − 1)). Not implemented, so not documented. |
