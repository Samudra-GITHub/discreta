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
| [Caesar and affine ciphers](caesar-and-affine.md) | ℤ₂₆ encoding, modular arithmetic, Caesar and affine derivations, gcd and coprimality, extended Euclid, modular inverses, worked examples, error handling and security notes (implemented in v0.2.0, corrected in v0.2.1) |

## Planned: cipher and frequency analysis topic

| Note | Core content |
| --- | --- |
| Vigenère cipher | Repeated Caesar shifts under a keyword of length m |
| Frequency analysis | Letter counts; index of coincidence IC = Σ nᵢ(nᵢ − 1) / (N(N − 1)) |
| Key-space and attacks | Counting keys; why monoalphabetic ciphers fall to frequency analysis |
