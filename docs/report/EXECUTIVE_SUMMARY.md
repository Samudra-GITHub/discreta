# DISCRETA: executive summary

**Classical Cryptography and Frequency Analysis Laboratory** · Team BugSquad (Samudra Kar, Shriyanshu Rout Roy) · Version 1.0.0 (commit `b54f570`, tag `v1.0.0`, 26 November 2026)

## What it is

DISCRETA is a web application in which a student can encrypt and decrypt with three classical ciphers (**Caesar, affine and Vigenère**) and then
attack the ciphertext with the statistics a cryptanalyst would use. It is for classical cryptography and academic experiment. The ciphers are **not
secure** and must never protect real data.

## The problem

Classical ciphers are usually studied on paper, where the arithmetic is slow and the statistical attacks that break them are hard to see. Existing tools
are single-purpose and often present a ranking as an answer, with no sign of how uncertain it is.

## What it does

| Area | Capability |
| --- | --- |
| Ciphers | Caesar (E(x) = x + k), affine (E(x) = ax + b, gcd(a, 26) = 1, 312 keys), Vigenère (Cᵢ = Pᵢ + Kᵢ, repeating keyword): encrypt and decrypt, with strict key validation |
| Statistics | letter frequencies against English, Pearson's χ², index of coincidence, Kasiski examination |
| Key search | all 26 Caesar keys and all 312 affine keys ranked by χ²; Vigenère key length ranked by column IC, key letters estimated, ranked candidate keys |
| Workflow | one session: send a ciphertext from the workspace to the Analysis Lab, inspect candidates, send one back to be re-encrypted as a check |
| Honesty | every result is labelled *measured*, *calculated* or *suggestion*, carries a reliability flag for short text, and is never called proof |

## How it is built

A **React 19 / TypeScript** frontend and a **Python FastAPI** backend, joined by a versioned JSON API. The backend is the only place that does any
cryptography or statistics: the number theory (gcd, extended Euclid, modular inverse) is written from scratch, and the frontend validates input and
presents replies. Errors have one uniform shape and never echo the input; requests are size-limited.

## How it was verified

* **1,410 backend tests and 262 frontend tests passed** when re-run for the report; TypeScript and the production build were clean.
* Mathematics checked against textbook vectors, brute-force definitions, independent reference implementations and exact arithmetic (SymPy for number theory,
  in tests only).
* The interface was checked in a browser against the real backend at 375, 768, 1024 and 1440 px in light and dark themes.

| Example | Result |
| --- | --- |
| Caesar, k = 3 | `Hello, World!` → `Khoor, Zruog!` |
| Affine, a = 5, b = 8 | `AFFINE CIPHER` → `IHHWVC SWFRCP` |
| Vigenère, key `LEMON` | `ATTACKATDAWN` → `LXFOPVEFRNHR` |
| Vigenère recovery, 459 letters, key `LEMON` | IC 0.0426, suggested length 5, recovered key `LEMON` |

## Limits

English reference only; every ranking is an estimate and short or unusual text can mislead it; Vigenère recovery needs roughly 25 or more letters per key
letter and Kasiski finds nothing for a short text or a long key; only three ciphers. Details in section 13 of the [project report](PROJECT_REPORT.md).

## Team

**Samudra Kar**: software implementation, tests and documentation. **Shriyanshu Rout Roy**: mathematics research and review.

## Where to look

[README](../../README.md) · [Project report](PROJECT_REPORT.md) · [User guide](../user-guide.md) · [API](../api.md) · [Mathematics](../mathematics/README.md)
