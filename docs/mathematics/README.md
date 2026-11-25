# Mathematics notes

This folder will hold the mathematical write-up that accompanies each implemented tool.
It is empty of results on purpose: nothing has been implemented yet, and no claim is
recorded here until the corresponding code is tested.

## Convention for each topic

One file per topic (for example `caesar-and-affine.md`), each containing:

1. **Definitions**: the objects and operations, stated precisely.
2. **Theorems and proofs** (or references to them): for example, that `a` is invertible
   in ℤₙ if and only if gcd(a, n) = 1.
3. **Algorithm**: the procedure the code implements, with its complexity.
4. **Verification**: how SymPy and the test suite confirm the implementation, including
   edge cases.
5. **References**: textbook chapter or paper.

## First topic: cipher and frequency analysis

Planned write-ups, with the facts they will establish:

| Note | Core content |
| --- | --- |
| Encoding ℤ₂₆ | A–Z ↔ 0–25; arithmetic modulo 26 |
| Caesar cipher | E(x) = (x + k) mod 26; 26 keys |
| Affine cipher | E(x) = (ax + b) mod 26; gcd(a, 26) = 1 gives 12 values of a, so 312 keys |
| Vigenère cipher | Repeated Caesar shifts under a keyword of length m |
| Frequency analysis | Letter counts; index of coincidence IC = Σ nᵢ(nᵢ − 1) / (N(N − 1)) |
| Key-space and attacks | Counting keys; why monoalphabetic ciphers fall to frequency analysis |
