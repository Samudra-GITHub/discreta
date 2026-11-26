# Testing

DISCRETA is an academic project, so correctness is checked against **independent** expected values, not against the
code that produced a result.

## Commands

```powershell
# backend: from backend/, with the virtual environment active
python -m pytest

# frontend: from frontend/
npm run typecheck     # tsc -b
npm run build         # type-check and production build
npm test              # Vitest, run once
```

`backend/pytest.ini` sets `testpaths = tests` and `pythonpath = .`; the frontend test configuration (jsdom, setup file,
`css: false`) is in `frontend/vite.config.ts`.

## Last recorded results

Release v1.0.0 (see [the release report](../report/progress-report.md) and [the project report](../report/PROJECT_REPORT.md),
section 11, which records when they were last run):

| Check | Result |
| --- | --- |
| Backend, `python -m pytest` | 1,410 passed |
| Frontend, `npm test` | 262 passed in 13 files |
| TypeScript, `tsc -b` | clean |
| Production build | clean |

Re-run the commands above to reproduce them.

## What the backend suites cover

| File | Covers |
| --- | --- |
| `test_number_theory.py` | gcd, extended Euclid, modular inverse, against SymPy and exhaustive small ranges |
| `test_caesar.py`, `test_affine.py` | the ciphers, key reduction, all 26 Caesar keys, all 312 affine keys, invalid multipliers |
| `test_vigenere.py`, `test_vigenere_api.py` | the Vigenère cipher: textbook vectors, a reference implementation, key validation, the API |
| `test_algebra_api.py`, `test_api_errors.py`, `test_cors.py`, `test_health.py`, `test_modules.py` | endpoints, the uniform error body, the 413 and 422 responses, CORS, the module list |
| `test_analysis_statistics.py` | the English table, χ², letter counts, character treatment |
| `test_cryptanalysis.py`, `test_analysis_api.py` | Caesar and affine key ranking and their endpoints |
| `test_coincidence.py` | the index of coincidence, reading thresholds, Friedman's estimate |
| `test_kasiski.py` | repeated sequences, distances, votes, limits |
| `test_vigenere_analysis.py`, `test_vigenere_analysis_api.py` | key-length ranking, key letters, candidate keys, and their endpoints |

## Independent oracles

* **Textbook vectors written as literals:** `ATTACKATDAWN` with `LEMON` gives `LXFOPVEFRNHR`; `CRYPTOISSHORTFORCRYPTOGRAPHY` with
  `ABCD` gives `CSASTPKVSIQUTGQUCSASTPIUAQJB`.
* **Separately written reference implementations** (plain `ord`/`chr` arithmetic) compared on hundreds of random inputs.
* **Brute-force definitions:** the index of coincidence as the probability that two distinct random positions match, and
  Kasiski repeats found by scanning all pairs of positions.
* **Exact arithmetic** with `fractions`, counts with `collections.Counter`, `math.gcd` and `pow(a, -1, 26)`.
* **SymPy** for number theory only. The application never imports it.
* **Exhaustive checks** where the space is small: all 26 × 26 letter pairs, all 12 valid multipliers with all 26 offsets.
* **Seeded statistical checks** for the Vigenère investigation: random keys of 1 to 12 letters on two English passages.
* **Documented failures:** a pangram defeats the affine ranking, and two-letter texts mislead the Caesar ranking; the tests
  assert this so the limitation cannot be hidden.

## What the frontend suites cover

The tests render the real pages with Testing Library against a stubbed `fetch` (so no backend is needed), and check
behaviour a user sees:

* the taskbar, the routes, the legacy redirects and the not-found page;
* the Cipher Workspace for Caesar, affine and Vigenère: key validation, formulas, results, loading, error and offline
  states, copy, clear, swap and the worked steps;
* the Analysis Lab: all four tabs, keyboard tab navigation, stale results, candidate inspection;
* the transfers in both directions between the workspace and the lab, and the shared session;
* themes (system, light, dark, blocked storage) and Settings;
* the services' reply validation, and the background layer's safety properties (decorative, paused, static under
  reduced motion).

## Browser verification

The release was also checked by running the real application against the real backend: all four destinations and all
four analysis tabs, in light and dark themes, at 375, 768, 1024 and 1440 px, looking for horizontal overflow, console
errors and failed requests. That check is manual (scripted with Playwright) and not part of `npm test`.
