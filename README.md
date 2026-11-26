# DISCRETA

**A Classical Cryptography and Frequency Analysis Laboratory**

Team: **BugSquad** (2 members)

DISCRETA is a web application for encrypting, decrypting and *breaking* classical ciphers. Encrypt a
message with a Caesar or affine cipher, send the ciphertext to the Analysis Lab, count its letters,
compare them with English, and rank every possible key by a chi-squared score. The mathematics behind
it is discrete mathematics: modular arithmetic over ℤ₂₆, the Euclidean algorithm, modular inverses and
frequency distributions.

> **Status: v0.4.0, refocused on cryptography.** The interface is four destinations reached from a
> floating glass taskbar: **Overview**, **Cipher Workspace**, **Analysis Lab** and **Settings**, in a light
> and a dark theme. The backend implements Caesar and affine ciphers (hand-written gcd, extended Euclid
> and modular inverse), letter-frequency analysis, the chi-squared statistic, a Caesar key search (26
> keys) and an affine key search (all 312 valid keys). Results are statistical estimates, not proof, and
> the ciphers are teaching tools, not secure encryption. See
> [Caesar and affine ciphers](docs/mathematics/caesar-and-affine.md) and
> [Frequency analysis](docs/mathematics/frequency-analysis.md). Vigenère, Kasiski examination and the index
> of coincidence are not implemented.

## Objectives

1. Make classical cryptography tangible: encrypt, decrypt and analyse in one connected workspace.
2. Keep the mathematics correct: every algorithm is tested against independent expected values, with
   SymPy and the standard library as oracles only.
3. Keep the backend the single source of truth for cryptographic and statistical calculations.
4. Stay honest: the interface labels estimates as estimates and never presents a ranking as proof.

## What you can do

| Destination | Purpose |
| --- | --- |
| **Overview** | What DISCRETA is, and the two entry points |
| **Cipher Workspace** | Caesar and affine encryption and decryption, key controls, the relevant formula, the result, copy, swap, send to analysis |
| **Analysis Lab** | Frequency Analysis (A–Z counts against English), Caesar Analysis (26 ranked shifts), Affine Analysis (312 ranked keys); inspect a candidate and send it back to the workspace |
| **Settings** | Light, dark or system theme; clear the session; backend status |

## Technology stack

**Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, React Router, Lucide React, Vitest and Testing Library;
fonts Space Grotesk, Inter and IBM Plex Mono (self-hosted)

**Backend:** Python 3.12, FastAPI, Uvicorn, SymPy, Pytest

## Repository structure

```text
discreta/
├── frontend/                 React + TypeScript + Vite application
│   ├── src/
│   │   ├── components/       Taskbar, shared UI; workspace/ (keys, formula), analysis/ (charts, tabs)
│   │   ├── layouts/          App shell and navigation definition
│   │   ├── pages/            One component per route
│   │   ├── modules/          Frontend logic: algebra/ (keys, cipher state), analysis/ (readings)
│   │   ├── session/          Shared workspace and analysis state
│   │   ├── theme/            Light, dark and system themes
│   │   ├── services/         Backend API client (config, request helper, health)
│   │   ├── hooks/            React hooks (backend health polling)
│   │   └── types/            Shared TypeScript types
│   └── package.json
├── backend/                  FastAPI service
│   ├── app/
│   │   ├── api/v1/           Versioned HTTP routes (health, module list)
│   │   ├── core/             Configuration, uniform error responses, request-size limit
│   │   ├── modules/          algebra/ (ciphers, number theory), analysis/ (frequency, chi-squared, key search)
│   │   └── main.py           Application factory and entry point
│   ├── tests/                Pytest suite
│   ├── requirements.txt      Runtime dependencies
│   └── requirements-dev.txt  Runtime plus development and test dependencies
├── docs/
│   ├── architecture/         Design decisions
│   ├── mathematics/          Mathematical write-ups
│   └── report/               Project report
├── README.md
├── LICENSE                   MIT
└── .gitignore
```

## Installation

Prerequisites: **Node.js 20.19+ or 22.12+** (developed on 24), **npm**, **Python 3.12+**, **Git**.

```powershell
git clone https://github.com/Samudra-GITHUB/discreta.git
cd discreta
```

**Backend** (Windows PowerShell):

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
```

`requirements-dev.txt` includes `requirements.txt` and adds the test tools (pytest, httpx and
SymPy). To install only what is needed to run the server, use `requirements.txt`.

On macOS/Linux, activate with `source .venv/bin/activate` instead.

**Frontend:**

```powershell
cd frontend
npm install
Copy-Item .env.example .env
```

`.env` sets `VITE_API_BASE_URL=http://localhost:8000`. It is git-ignored; edit it if the
backend runs elsewhere.

## Local development

Run the two servers in separate terminals.

**Backend**, from `backend/` with the virtual environment active:

```powershell
uvicorn app.main:app --reload --port 8000
```

- API root: <http://localhost:8000/>
- Health check: <http://localhost:8000/api/v1/health>
- Interactive API docs: <http://localhost:8000/docs>
- Cipher endpoints (all `POST`, JSON body): `/api/v1/algebra/caesar/encrypt`,
  `/api/v1/algebra/caesar/decrypt`, `/api/v1/algebra/affine/encrypt`,
  `/api/v1/algebra/affine/decrypt`. Analysis endpoints (`POST`, `{"text"}`): `/api/v1/analysis/frequency`,
  `/api/v1/analysis/caesar/crack` and `/api/v1/analysis/affine/search`. Keys are integers with absolute value at most
  9007199254740991 (2⁵³ − 1), text is at most 10,000 characters and a request body at most
  256 KiB. Every error returns `{"detail": [{"loc", "msg", "type"}]}`: 422 for invalid input
  (including invalid affine multipliers), 413 for oversized bodies. Details are in the
  [mathematics notes](docs/mathematics/caesar-and-affine.md#10-api) and
[frequency analysis](docs/mathematics/frequency-analysis.md#7-api).

**Frontend**, from `frontend/`:

```powershell
npm run dev
```

Open <http://localhost:5173>. Settings shows the live result of the backend health check; stop the
backend and press *Check again* to see the offline state, which the Cipher Workspace and Analysis Lab
also report when you run something.

**Tests and checks:**

```powershell
# backend (from backend/, venv active)
python -m pytest

# frontend (from frontend/): type-check and production build, then the unit and component tests
npm run build
npm test
```

The frontend dev server must stay on port 5173 (it is configured with `strictPort`)
because the backend only allows that origin through CORS. To allow other origins, set
`DISCRETA_CORS_ORIGINS` to a comma-separated list before starting the backend.

## Moving the repository

Move the whole folder, including the hidden `.git` directory. Python virtual environments
store absolute paths and break when moved, so afterwards recreate `backend/.venv` with the
backend installation steps above. `frontend/node_modules` can be rebuilt with `npm install`
if anything misbehaves. Both folders are git-ignored.

## Documentation

- [Architecture decisions](docs/architecture/overview.md)
- [Design system (Instrument)](docs/architecture/design-system.md)
- [Mathematics notes](docs/mathematics/README.md)
- [Report](docs/report/README.md)

## Team

**BugSquad**

## License

MIT. See [LICENSE](LICENSE).
