# DISCRETA

**An Interactive Discrete Mathematics & Cryptography Laboratory**

Team: **BugSquad** (2 members)

DISCRETA is a web platform for exploring discrete mathematics by experiment. Five
mathematical modules share one application, and the first topic under construction is
**Simple Cipher & Frequency Analysis**: classical ciphers treated as arithmetic in ℤ₂₆,
and the statistical attacks that break them.

> **Status: v0.3.0, the interactive Cipher Laboratory and a new look.** The backend
> implements the Caesar and affine ciphers (hand-written gcd, extended Euclid and modular
> inverse) behind a tested HTTP API, and the **Cipher Laboratory** page now uses it: choose a
> cipher and key, press the round button, and see the result with the formula and a worked
> example built from the real response. The whole interface follows one light design system
> ([Aurora](docs/architecture/design-system.md)) with a 3D focal form on every page. The
> other four modules and the frequency analysis are still planned and labelled so. The
> ciphers are teaching tools, not secure encryption; see
> [Caesar and affine ciphers](docs/mathematics/caesar-and-affine.md).

## Objectives

1. Make discrete mathematics tangible: each concept comes with an interactive tool next to
   its precise definition.
2. Keep the mathematics correct: results computed by the backend are to be cross-checked
   with SymPy and covered by automated tests.
3. Deliver one complete topic end to end (ciphers and frequency analysis), including its
   mathematical write-up, before widening scope.
4. Keep the architecture modular so each laboratory can be built, tested and documented
   independently.

## The five mathematical modules

| Module | Scope |
| --- | --- |
| **Logic** | Propositions, truth tables, equivalence, quantifiers, proof techniques |
| **Sets** | Set operations, relations, equivalence classes, functions |
| **Combinatorics** | Counting principles, permutations, combinations, recurrences |
| **Graphs** | Graphs and trees, connectivity, traversal, shortest paths |
| **Algebra** | Number theory, modular arithmetic, algebraic structures |

The cryptography pages (**Cipher Laboratory**, **Frequency Analyzer**, **Secure Message
Journey**) sit on top of these modules, mainly Algebra (arithmetic in ℤ₂₆) and
Combinatorics (key-space counting).

## Technology stack

**Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, Vitest and Testing Library, React Router, Lucide React,
React Flow (`@xyflow/react`)

**Backend:** Python 3.12, FastAPI, Uvicorn, SymPy, Pytest

## Repository structure

```text
discreta/
├── frontend/                 React + TypeScript + Vite application
│   ├── src/
│   │   ├── components/       Shell, panels, status; cipher/ (laboratory), sculpture/ (3D forms), illustrations/
│   │   ├── layouts/          App shell and navigation definition
│   │   ├── pages/            One component per route
│   │   ├── modules/          One folder per mathematical module
│   │   │   ├── logic/  sets/  combinatorics/  graphs/  algebra/
│   │   ├── services/         Backend API client (config, request helper, health)
│   │   ├── hooks/            React hooks (backend health polling)
│   │   └── types/            Shared TypeScript types
│   └── package.json
├── backend/                  FastAPI service
│   ├── app/
│   │   ├── api/v1/           Versioned HTTP routes (health, module metadata)
│   │   ├── core/             Configuration, uniform error responses, request-size limit
│   │   ├── modules/          One package per mathematical module
│   │   │   ├── logic/  sets/  combinatorics/  graphs/  algebra/
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
  `/api/v1/algebra/affine/decrypt`. Keys are integers with absolute value at most
  9007199254740991 (2⁵³ − 1), text is at most 10,000 characters and a request body at most
  256 KiB. Every error returns `{"detail": [{"loc", "msg", "type"}]}`: 422 for invalid input
  (including invalid affine multipliers), 413 for oversized bodies. Details are in the
  [mathematics note](docs/mathematics/caesar-and-affine.md#10-api).

**Frontend**, from `frontend/`:

```powershell
npm run dev
```

Open <http://localhost:5173>. The dashboard's *Backend connection* panel and the header
badge call the health endpoint and show the real result. Stop the backend and press
*Check again* to see the offline state.

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
- [Design system (Aurora)](docs/architecture/design-system.md)
- [Mathematics notes](docs/mathematics/README.md)
- [Report](docs/report/README.md)

## Team

**BugSquad**

## License

MIT. See [LICENSE](LICENSE).
