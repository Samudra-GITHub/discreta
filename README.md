# DISCRETA

**A Classical Cryptography and Frequency Analysis Laboratory**

Team: **BugSquad** (2 members) · Version **1.0.0**

DISCRETA is a web application for encrypting, decrypting and *breaking* classical ciphers. Encrypt a message
with a Caesar, affine or Vigenère cipher, send the ciphertext to the Analysis Lab, count its letters, compare
them with English, rank every possible key, or investigate the key length of a repeating-key cipher with the
index of coincidence and Kasiski examination. The mathematics behind it is discrete mathematics: modular
arithmetic over ℤ₂₆, the Euclidean algorithm, modular inverses, probability and the χ² statistic.

> **Academic and security disclaimer.** The ciphers in DISCRETA are historical and educational. They are
> **not secure encryption** and must never be used to protect real data; the application exists to show why
> they are easy to break. Every analysis result is a **statistical estimate**, not proof: short texts,
> unusual texts and long keys can mislead it, and the interface says so.

## Objective

Build one focused, correct and well-tested environment in which a student can encrypt a message, watch the
arithmetic, and then attack the ciphertext with the same statistics a cryptanalyst would use. The mathematics
supports the tools; the application is not a general mathematics course.

## Problem statement

Classical ciphers are usually taught on paper, where the arithmetic is tedious and the attacks (frequency
counting, χ² scoring, Kasiski examination) are hard to see working. DISCRETA does the arithmetic with a
backend that is independently verified, shows the formula that applies to the current key, and makes every
analysis step inspectable, while keeping measured facts, calculated values and statistical suggestions
visibly separate.

## Main features

| Destination | What it does |
| --- | --- |
| **Overview** | What DISCRETA is, and the two entry points |
| **Cipher Workspace** | Caesar, affine and Vigenère encryption and decryption; key controls with validation; the one formula that applies; the result; worked steps checked against the backend; copy, swap, clear; send to the Analysis Lab |
| **Analysis Lab** | **Frequency Analysis** (A–Z counts against English, χ², IC), **Caesar Analysis** (26 ranked shifts), **Affine Analysis** (312 ranked keys), **Vigenère Analysis** (IC, Kasiski, key-length ranking, key letters, candidate keys); inspect any candidate and send it back to the workspace |
| **Settings** | Light, dark or system theme; clear the session; backend status |

Navigation is a floating glass taskbar at the bottom; there is no sidebar and no dashboard. The workspace and
the Analysis Lab share one in-memory session, so a result moves between them without retyping.

## Supported ciphers

| Cipher | Encryption | Decryption | Key |
| --- | --- | --- | --- |
| Caesar | E(x) = (x + k) mod 26 | D(y) = (y − k) mod 26 | any integer (reduced mod 26), 26 keys |
| Affine | E(x) = (a·x + b) mod 26 | D(y) = a⁻¹(y − b) mod 26 | gcd(a, 26) = 1: 12 multipliers × 26 offsets = 312 keys |
| Vigenère | Cᵢ = (Pᵢ + Kᵢ) mod 26 | Pᵢ = (Cᵢ − Kᵢ + 26) mod 26 | a keyword of 1 to 64 letters, repeating over the letters only |

Only ASCII letters are enciphered and case is preserved; spaces, digits, punctuation and non-ASCII characters are
copied unchanged (and, for Vigenère, do not use up a key letter).

## Mathematical foundations

Letters are numbers in ℤ₂₆ (`A = 0 … Z = 25`). The affine multiplier must be invertible, which happens exactly
when gcd(a, 26) = 1; the inverse comes from the extended Euclidean algorithm (written by hand; SymPy is used
only in the tests as an independent check). ℤ₂₆ is not a field: 14 of its 25 non-zero elements have no inverse.
Details and proofs: [Caesar and affine](docs/mathematics/caesar-and-affine.md),
[Vigenère](docs/mathematics/vigenere.md).

## Statistical analysis methods

* **Letter frequencies** against a normalised English reference table.
* **χ² statistic**, χ² = Σ (Oᵢ − Eᵢ)² / Eᵢ on letter counts, to rank every Caesar and affine key.
* **Index of coincidence**, IC = Σ fᵢ(fᵢ − 1) / (N(N − 1)), to separate monoalphabetic from polyalphabetic
  patterns, and Friedman's rough key-length estimate.
* **Kasiski examination**: repeated sequences, their distances and the key lengths those distances share.
* **Vigenère key recovery**: mean column IC to rank key lengths, then χ² on each column for the key letters and
  ranked candidate keys.

Reliability flags mark short texts. See [Frequency analysis](docs/mathematics/frequency-analysis.md) and
[Polyalphabetic analysis](docs/mathematics/polyalphabetic-analysis.md).

## Technology stack

**Frontend:** React 19, TypeScript (strict), Vite 8, Tailwind CSS 4, React Router, Lucide icons, Vitest and Testing
Library; Space Grotesk, Inter and IBM Plex Mono (self-hosted). **Backend:** Python 3.12, FastAPI, Uvicorn, Pydantic,
pytest; SymPy (tests only).

## Architecture overview

```text
 Browser (React)  ──HTTP/JSON──▶  FastAPI backend
 pages · session · services        algebra   (number theory, ciphers)
 no cryptography in the UI         analysis  (frequency, χ², IC, Kasiski, Vigenère)
```

The backend is the only place that encrypts, decrypts or computes statistics; the frontend validates input,
calls it, checks the shape of each reply and presents it. Every client error has one uniform body that never
echoes the input, requests are size-limited, and each module is a package with its own router. See
[docs/architecture/overview.md](docs/architecture/overview.md) and the [design system](docs/architecture/design-system.md).

## Project directory structure

```text
discreta/
├── backend/
│   ├── app/
│   │   ├── api/v1/            health, module list, router aggregation
│   │   ├── core/              settings, uniform errors, request-size limit
│   │   ├── modules/
│   │   │   ├── algebra/       number_theory.py, ciphers.py, schemas.py, router.py
│   │   │   └── analysis/      english, scoring, frequency, cryptanalysis,
│   │   │                      coincidence, kasiski, vigenere_analysis, schemas, router
│   │   └── main.py            application factory
│   ├── tests/                 pytest suite
│   ├── requirements.txt       runtime dependencies
│   └── requirements-dev.txt   runtime plus test dependencies
├── frontend/
│   └── src/
│       ├── components/        Taskbar, shared UI; workspace/, analysis/, atmosphere/
│       ├── layouts/           application shell, navigation
│       ├── modules/           algebra/ (keys, cipher state), analysis/ (readings)
│       ├── pages/             Overview, Workspace, Analysis Lab, Settings
│       ├── services/          API client, cipher and analysis calls
│       ├── session/           shared workspace and analysis state
│       └── theme/             light, dark, system
├── docs/
│   ├── architecture/          overview, design system
│   ├── mathematics/           one note per topic
│   ├── api.md                 endpoint reference
│   └── report/                progress report, screenshots-v1.0.0/
├── README.md · LICENSE (MIT)
```

## Installation

Prerequisites: **Node.js 20.19+ or 22.12+** (developed on 24), **npm**, **Python 3.12+**, **Git**.

```powershell
git clone https://github.com/Samudra-GITHUB/discreta.git
cd discreta
```

Backend (Windows PowerShell; on macOS or Linux activate with `source .venv/bin/activate`):

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
```

`requirements-dev.txt` includes `requirements.txt` and adds pytest, httpx and SymPy; use `requirements.txt` alone
to run the server only. Frontend:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
```

`.env` sets `VITE_API_BASE_URL=http://localhost:8000` and is git-ignored.

## Running

Use two terminals.

**Backend**, from `backend/` with the virtual environment active:

```powershell
uvicorn app.main:app --reload --port 8000
```

**Frontend**, from `frontend/`:

```powershell
npm run dev
```

Open <http://localhost:5173>. The frontend must stay on port 5173 (`strictPort`) because the backend allows only
that origin (and 4173, `vite preview`) through CORS; set `DISCRETA_CORS_ORIGINS` to a comma-separated list to
allow others. Settings shows the live backend status; stop the backend to see the offline state.

## API documentation

With the backend running: Swagger UI at <http://localhost:8000/docs>, ReDoc at <http://localhost:8000/redoc>,
schema at <http://localhost:8000/openapi.json>. A written summary of every endpoint, limit and error is in
[docs/api.md](docs/api.md).

## Testing

```powershell
# backend (from backend/, virtual environment active)
python -m pytest

# frontend (from frontend/): type-check and production build, then the tests
npm run build
npm test
```

The backend tests use independent oracles (textbook vectors, `fractions`, `collections.Counter`, brute-force
definitions, SymPy for number theory); the frontend tests run the real pages against a stubbed `fetch`.

## Known limitations

* The ciphers are not secure, and rankings are estimates (see the disclaimer above).
* English only: the reference table is one average, so another language, or unusual English such as a pangram,
  can be ranked wrongly. Short texts are flagged but still ranked.
* Vigenère recovery needs enough text per key letter (roughly 25 letters or more); Kasiski needs sequences that
  repeat, so it finds nothing for a short text or a long key. The IC and Kasiski suggest, they do not prove.
* Only Caesar, affine and Vigenère: no Playfair, Hill, transposition or modern ciphers.
* Text up to 10,000 characters; keys up to ±(2⁵³ − 1); Vigenère keywords up to 64 letters; request bodies up to 256 KiB.
* An integer literal of more than 4,300 digits is refused by Python's JSON parser with HTTP 400 rather than 422.
* Python and Node environments are not portable between folders; recreate them if the repository is moved.

## Documentation

* [Architecture overview](docs/architecture/overview.md) · [Design system](docs/architecture/design-system.md)
* [Mathematics notes](docs/mathematics/README.md) · [API reference](docs/api.md)
* [Project report and screenshots](docs/report/README.md)

## Team

**BugSquad**

## License

MIT. See [LICENSE](LICENSE).
