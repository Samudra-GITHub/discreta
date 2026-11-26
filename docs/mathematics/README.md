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

## Notes

| Note | Core content |
| --- | --- |
| [Caesar and affine ciphers](caesar-and-affine.md) | ℤ₂₆ encoding, **modular arithmetic**, Caesar and affine derivations, gcd and coprimality, the extended Euclidean algorithm, **modular inverses**, worked examples, errors and security notes |
| [The Vigenère cipher](vigenere.md) | repeating-key shifts, the treatment of non-letters, validation, a worked example, verification |
| [Frequency analysis and statistical key search](frequency-analysis.md) | letter counts and character treatment, the English reference, the **χ² statistic**, Caesar (26 keys) and affine (312 keys) ranking, reliability and limits |
| [Polyalphabetic analysis](polyalphabetic-analysis.md) | the **index of coincidence**, **Kasiski examination**, key-length ranking, per-column key letters, candidate keys, limits |

## Where each topic is explained

| Topic | Note and section |
| --- | --- |
| Caesar cipher | caesar-and-affine, sections 3 and 8 |
| Affine cipher | caesar-and-affine, sections 4 and 8 |
| Vigenère cipher | vigenere |
| Modular arithmetic | caesar-and-affine, section 2 |
| Modular inverses (gcd, extended Euclid) | caesar-and-affine, sections 5 to 7 |
| Frequency analysis | frequency-analysis, sections 1 and 2 |
| Chi-squared statistic | frequency-analysis, section 3 |
| Index of coincidence | polyalphabetic-analysis, section 1 |
| Kasiski examination | polyalphabetic-analysis, section 2 |
| Vigenère cryptanalysis | polyalphabetic-analysis, sections 3 to 5 |

The HTTP interface is summarised in [../api.md](../api.md).
