# Architecture overview

DISCRETA is a classical cryptography and frequency analysis laboratory: encrypt and decrypt with the Caesar,
affine and Vigenère ciphers, analyse ciphertext statistically, rank candidate keys and investigate the key
length of a repeating-key cipher. The mathematics (modular
arithmetic, gcd, the extended Euclidean algorithm, modular inverses, frequency distributions, the
chi-squared statistic) runs behind the interface and is documented in `docs/mathematics/`.

History: v0.1.0 foundation, v0.2.0 and v0.2.1 cipher engine, v0.3.0 first Cipher Laboratory, v0.4.0
product refocus, v1.0.0 Vigenère cipher, index of coincidence, Kasiski examination and key recovery. Earlier plans for separate Logic, Sets, Combinatorics and Graphs
laboratories were dropped: they were outside the project topic, and their empty stubs were removed.

## Monorepo

`frontend/` and `backend/` live in one repository. The two halves change together (an API change usually
needs a matching UI change), so one history and one pull request per feature is simpler than two
repositories.

## Backend modules

Each package under `backend/app/modules/<slug>/` exposes `INFO` (a `ModuleInfo`) and `router` (an
`APIRouter` with prefix `/<slug>`). `modules/__init__.py` lists them in `MODULES`, and the v1 router mounts
each one under `/api/v1/<slug>`.

| Module | Files | Responsibility |
| --- | --- | --- |
| `algebra` | `number_theory.py`, `ciphers.py`, `schemas.py`, `router.py` | Euclid, extended Euclid, modular inverse; Caesar, affine and Vigenère encryption and decryption; key validation |
| `analysis` | `english.py`, `scoring.py`, `frequency.py`, `cryptanalysis.py`, `coincidence.py`, `kasiski.py`, `vigenere_analysis.py`, `schemas.py`, `router.py` | English reference, χ², letter frequencies, Caesar and affine key ranking, index of coincidence, Kasiski examination, Vigenère key-length ranking and key estimation, reliability |

The mathematics (`number_theory`, `ciphers`, `scoring`, `frequency`, `cryptanalysis`) never imports
FastAPI, so it can be tested and reused directly. The routers only translate requests into calls on those
functions and turn expected failures into the uniform error response. `analysis` calls `algebra` for
decryption and inverses and has no cipher arithmetic of its own.

Endpoints: `GET /`, `GET /api/v1/health`, `GET /api/v1/modules`,
`POST /api/v1/algebra/{caesar,affine,vigenere}/{encrypt,decrypt}` and
`POST /api/v1/analysis/{frequency, caesar/crack, affine/search, vigenere/lengths, vigenere/candidates}`.
The full reference is in [../api.md](../api.md).

### Cross-cutting backend rules

* **Uniform errors** (`app/core/errors.py`). Every client error has the body
  `{"detail": [{"loc": [...], "msg": "...", "type": "..."}]}`: validation (422), invalid keys (422
  `invalid_key`), a key search over a text with no letters (422 `no_letters`), unknown routes (404),
  wrong methods (405) and oversized bodies (413). The offending input is never echoed, the body is plain
  ASCII, and at most 20 problems are listed. Unexpected exceptions return a generic 500.
* **Request limits** (`app/core/limits.py`). Bodies over 256 KiB get a 413 before parsing, for both the
  declared and the streamed length. Text is limited to 10,000 characters; keys to ±(2⁵³ − 1), the largest
  integer a browser represents exactly. These are API limits, not mathematical ones.
* **CORS** allows the Vite dev server (5173) and `vite preview` (4173) on `localhost` and `127.0.0.1`.
* **SymPy** is used only by tests, as an oracle. No production calculation depends on it.
* **Dependencies**: `requirements.txt` (FastAPI, Uvicorn) for running; `requirements-dev.txt` adds pytest,
  httpx and SymPy.

## Frontend

React 19, TypeScript (strict, `noUncheckedIndexedAccess`), Vite, Tailwind CSS 4, React Router, Lucide icons.
No other runtime dependencies.

### Structure

| Path | Role |
| --- | --- |
| `layouts/AppLayout.tsx`, `layouts/navigation.ts` | The shell (page plus floating taskbar) and the four destinations |
| `components/Taskbar.tsx` | The only navigation |
| `components/ui.tsx`, `TextEditor.tsx` | Shared primitives: sections, segmented control, notices, copy, editor |
| `components/workspace/` | Key controls, the formula, the worked steps |
| `components/analysis/` | Charts, the four tabs (Frequency, Caesar, Affine, Vigenère), the candidate table and inspector |
| `pages/` | Overview, Workspace, Analysis Lab, Settings, Not found |
| `session/` | Shared state: workspace, analysis and the transfers between them |
| `theme/` | Light, dark, system |
| `services/` | `api.ts` (request, timeout, abort, error parsing), `cipher.ts`, `analysis.ts` (reply guards), `health.ts` |
| `modules/algebra/` | Key parsing and validation, worked example, the cipher state hook |
| `modules/analysis/interpret.ts` | Plain-language reading of analysis results |

### The backend is the source of truth

The frontend never encrypts, decrypts, counts letters or computes χ². It validates what the user typed
(an integer with at most 2⁵³ − 1 in magnitude, at most 10,000 characters), sends requests, checks the
shape of each reply, and presents it. Small presentation helpers use exact `BigInt` arithmetic (reducing a
key mod 26, explaining why a multiplier is invalid) and the worked example is cross-checked letter by letter
against the backend's output and hidden if anything disagrees. The only text the interface writes about
results (`interpret.ts`) describes numbers the backend returned.

### Session and the connected workflow

`SessionProvider` (inside the router, above the routes) holds one in-memory session: the workspace state
(`useCipherLab`) and the analysis state (`useAnalysisSession`: the ciphertext, the active tab, one
result per analysis, and for Vigenère the key-length investigation plus the chosen length). It survives navigation and ends when the tab closes; nothing is persisted.

* **Workspace → Analysis Lab:** "Send to Analysis Lab" (or "Analyse" on the input) sets the analysis text,
  opens the lab and runs the frequency analysis.
* **Analysis Lab → Workspace:** "Send to Cipher Workspace" on a candidate fills the workspace with the
  candidate's plaintext, the candidate's cipher and key (for Vigenère, the shortest equivalent keyword), and
  the *encrypt* operation, so running it reproduces the ciphertext.
* **Vigenère investigation:** one run asks the backend for the IC, the Kasiski evidence and the ranked key
  lengths, then (if a length is suggested) for the key letters of that length; any other length can be chosen
  from the table.
* **Clear:** Clear in the lab empties the text and all results; "Clear session" in Settings resets both
  halves.
* Results are only used while they match the current inputs; otherwise they stay visible, marked as out of
  date, and stop filling in numbers (the inverse, the formula) for different keys.
* Analyses run only on an explicit button press, never while typing.

### Accessibility and responsiveness

Skip link; one labelled `nav`; `aria-current` on the active destination; a roving-tabindex tablist with
arrow, Home and End keys; labelled form controls; text alternatives for both charts plus a ranked data table;
`aria-live` regions for results; status shown with icons and words; reduced-motion support; layouts verified
without horizontal scrolling at 375, 768, 1024 and 1440 px.

## Known limitations

* Only the Caesar, affine and Vigenère ciphers exist; no other classical cipher (Playfair, Hill, transposition)
  is implemented. Vigenère recovery is a statistical estimate and needs enough text per key letter.
* The English reference is a single average table; a text in another language, or an unusual English text
  such as a pangram, can be ranked wrongly. Short texts are flagged but still ranked. The index of coincidence,
  Kasiski examination and the Friedman estimate are evidence, not proof.
* An integer literal of more than 4,300 digits in a request body is refused by Python's JSON parser with
  HTTP 400 (`bad_request`) rather than 422. POSTs to a URL with a trailing slash get a 307 redirect.
* Python and Node environments are not portable between folders; see the README if the repository moves.
