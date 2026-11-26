# DISCRETA progress report (v0.4.0)

Team BugSquad. Branch `feat/cipher-engine`. v0.1.0 is on `main`; v0.2.0 to v0.3.0 are committed and pushed on the
branch; v0.4.0 is in the working tree and is not committed.

## Product

DISCRETA is a classical cryptography and frequency analysis laboratory: encrypt and decrypt with Caesar and affine
ciphers, analyse ciphertext statistically, and rank candidate keys. It is not a general discrete-mathematics
teaching platform; the mathematics runs behind the tools and is documented in `docs/mathematics/`.

## Done

**Foundation, cipher engine, hardened API (v0.1.0 to v0.2.1).** Hand-written gcd, extended Euclid and modular
inverse; Caesar and affine encryption and decryption; strict key and text limits; uniform error body; 413 size
limit; independent audit and corrections.

**Product refocus (v0.4.0).**

* Backend `analysis` module: letter frequencies (A to Z, case-insensitive, other characters ignored and
  documented), English reference, chi-squared statistic, Caesar key ranking (26 keys), affine key ranking (all 312
  valid keys), reliability flags for short text. Three endpoints under `/api/v1/analysis/`.
* Frontend rebuilt around four destinations reached from a floating glass taskbar: Overview, Cipher Workspace,
  Analysis Lab (Frequency, Caesar and Affine tabs) and Settings. No sidebar, no dashboard.
* Connected workflow: workspace result to Analysis Lab (runs the frequency analysis), candidate back to the
  workspace, copy, clear, swap; state survives navigation.
* Light and dark themes (plus system), new typography, new design system ("Instrument").
* Background layer: faint grid, hex columns and annotations in the side margins of wide screens, a network motif on
  the Overview; truthful, pausable, static under reduced motion.
* Removed: the Logic, Sets, Combinatorics and Graph stubs (both sides), Theory & Proofs, Secure Message Journey,
  the WebGL sculptures, the React Flow dependency, and the old fonts.

## Verified

* Backend: 1,161 tests pass.
* Frontend: 191 tests pass; `tsc -b` clean; production build clean (main JS 339 kB, 107 kB gzipped).
* Browser, against the real backend: all pages in light and dark at 375, 768, 1024 and 1440 px, no horizontal
  overflow, no console errors, no failed requests; typing and clicking work with the background running; only
  `transform` and `opacity` animate; nothing animates under reduced motion or on narrow screens.

## Not done

* Vigenère, Kasiski examination and index of coincidence (the analysis package is ready for them).
* The English reference is one average table; short or unusual texts can be ranked wrongly (flagged, not hidden).
* Not committed or pushed; no pull request open for `feat/cipher-engine`.
