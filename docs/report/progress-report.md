# DISCRETA release report: v1.0.0

Team BugSquad (Samudra Kar and Shriyanshu Rout Roy). Final academic release. Everything below was built and verified in this repository; the figures
come from runs of the real test suites and the real application against the real backend.

## What DISCRETA is

A classical cryptography and frequency analysis laboratory. A student encrypts and decrypts with the Caesar, affine
and Vigenère ciphers, then attacks the ciphertext with letter frequencies, the χ² statistic, the index of
coincidence and Kasiski examination, and sends a chosen candidate back to the workspace to test it. The
mathematics (modular arithmetic, gcd, the extended Euclidean algorithm, modular inverses, probability) is
documented in `docs/mathematics/`, and the ciphers are labelled as educational, not secure.

## Release history

| Version | Content |
| --- | --- |
| v0.1.0 | project foundation, health check |
| v0.2.0, v0.2.1 | Caesar and affine ciphers, hand-written gcd, extended Euclid and modular inverse, hardened API, independent audit |
| v0.3.0 | first interactive cipher laboratory (superseded design) |
| v0.4.0 | refocus on cryptography: frequency analysis, χ², Caesar and affine key ranking; floating-taskbar UI; light and dark themes |
| **v1.0.0** | **Vigenère cipher, index of coincidence, Kasiski examination, Vigenère key-length ranking and key estimation; documentation, API reference and screenshots** |

## Implemented in v1.0.0

* **Vigenère cipher** (`/api/v1/algebra/vigenere/encrypt|decrypt`): Cᵢ = (Pᵢ + Kᵢ) mod 26 and
  Pᵢ = (Cᵢ − Kᵢ + 26) mod 26; keyword of 1 to 64 letters; case preserved; the key advances on letters only.
* **Index of coincidence**, with a reading, reliability and Friedman's estimate; shown in the Frequency tab and
  the Vigenère tab; `null` (never NaN) below two letters.
* **Kasiski examination**: repeated sequences, positions, distances, key-length votes, gcd.
* **Vigenère investigation** (`/api/v1/analysis/vigenere/lengths|candidates`): key lengths ranked by mean column IC,
  a suggested length (or none), per-column key letters with alternatives, and up to ten ranked candidate keys with
  decrypted text, flagged by reliability.
* **Interface**: Vigenère in the Cipher Workspace (keyword field, key-alignment preview, formula, worked steps) and a
  fourth Analysis Lab tab that tags each section *measured*, *calculated* or *suggestion*. The four destinations,
  taskbar, themes and background are unchanged.

## Verification (actual results)

| Check | Result |
| --- | --- |
| Backend tests (`python -m pytest`) | **1,410 passed, 0 failed** |
| Frontend tests (`npm test`) | **262 passed, 0 failed** (13 files) |
| TypeScript (`tsc -b`) | clean |
| Production build (`npm run build`) | clean; main JS 364 kB (112 kB gzipped), CSS 36 kB, `dist` 917 kB with fonts |
| Browser, real backend | all four destinations and all four analysis tabs, in light and dark, at 375, 768, 1024 and 1440 px: no horizontal overflow, no console errors, no failed requests |
| Real cipher round trips in the browser | Caesar `Hello, World!` ⇄ `Khoor, Zruog!`; affine `AFFINE CIPHER` ⇄ `IHHWVC SWFRCP`; Vigenère `ATTACKATDAWN` ⇄ `LXFOPVEFRNHR` |
| Real investigation | a 459-letter passage encrypted with `LEMON` in the workspace, sent to the lab: IC 0.0426 (flat), Kasiski best length 5 (30 of 32 repeats), suggested length 5, best candidate `LEMON` with the original text; sent back to the workspace |
| Accessibility audit (script) | every button, input, tab and chart has an accessible name; every table has a caption; one `h1` and one `nav` per page |

### Mathematical verification

* Caesar, affine and Vigenère against textbook vectors, a separately written reference implementation, exhaustive
  checks over all 26 × 26 letter pairs and all valid affine keys, and SymPy (number theory only).
* χ², IC and frequencies against hand-computed values, exact `fractions`, `collections.Counter` and the brute-force
  pairwise definition of the IC.
* Kasiski against hand-built strings and a naive all-pairs implementation on random texts; distances of a repeated
  plaintext block equal the block length.
* Key-length suggestion correct for all 288 seeded random keys of 1 to 12 letters; the best candidate equals the true
  key for 192 random keys when the right length is given; every candidate's whole-text χ² and column scores are
  recomputed independently.
* Edge cases: empty, one-letter, punctuation-only, digit-only and non-ASCII text; short texts (flagged);
  pangrams (a documented failure of the method); the 10,000-character and 64-letter limits; 413 and 422 responses;
  errors that never echo the input.

## Known limitations

* The ciphers are not secure and every ranking is an estimate; short texts, non-English text and unusual English
  can mislead it. Reliability flags say so.
* Vigenère recovery needs roughly 25 or more letters per key letter; Kasiski needs repeated sequences and finds
  nothing for a short text or a long key.
* English reference only; Caesar, affine and Vigenère only.
* The 10,000-character, 64-letter and 256 KiB limits are API limits, not mathematical ones.
* The check runner `/verify` was not used; the suites were run directly.

## Screenshots

`docs/report/screenshots-v1.0.0/`: 25 images of the running application (Overview, the three ciphers encrypting and
decrypting, the four analysis tabs, Settings, in light and dark, and a mobile layout with the taskbar).
