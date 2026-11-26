# Development setup

How to install and run DISCRETA locally. The commands below are the ones in the repository (`backend/requirements*.txt`,
`frontend/package.json`, `frontend/.env.example`).

## Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Python | 3.12 or newer | the backend (developed and tested on 3.12) |
| Node.js | 20.19+ or 22.12+ | the frontend (developed on 24); npm comes with it |
| Git | any recent | to clone the repository |

Nothing else is needed: no database, no external service and no API key.

## Get the code

```powershell
git clone https://github.com/Samudra-GITHub/discreta.git
cd discreta
```

## Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
```

On macOS or Linux activate with `source .venv/bin/activate`. `requirements-dev.txt` includes `requirements.txt`
(FastAPI and Uvicorn) and adds pytest, httpx and SymPy; install `requirements.txt` alone to run the server only.
SymPy is used only by the tests, as an independent check of the hand-written number theory.

Start the server from `backend/` with the virtual environment active:

```powershell
uvicorn app.main:app --reload --port 8000
```

| URL | What |
| --- | --- |
| <http://localhost:8000/> | service banner |
| <http://localhost:8000/api/v1/health> | health check |
| <http://localhost:8000/docs> | Swagger UI |
| <http://localhost:8000/redoc> | ReDoc |
| <http://localhost:8000/openapi.json> | OpenAPI schema |

## Frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open <http://localhost:5173>. Other scripts in `frontend/package.json`:

| Script | Does |
| --- | --- |
| `npm run dev` | Vite dev server on port 5173 |
| `npm run build` | type-check (`tsc -b`) and production build into `dist/` |
| `npm run typecheck` | type-check only |
| `npm run preview` | serve the production build on port 4173 |
| `npm test` | run the test suite once (Vitest) |
| `npm run test:watch` | tests in watch mode |

## Environment variables

There are only two.

| Variable | Where | Default | Purpose |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | frontend, in `frontend/.env` (git-ignored; copy from `.env.example`) | `http://localhost:8000` | where the browser finds the backend; a trailing slash is ignored |
| `DISCRETA_CORS_ORIGINS` | backend, process environment | `http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:4173`, `http://127.0.0.1:4173` | comma-separated browser origins the backend allows; there is no wildcard |

The Vite dev server uses `strictPort`, so it must stay on 5173 (and `vite preview` on 4173) unless you also change
`DISCRETA_CORS_ORIGINS`. To run the backend on another port, change `VITE_API_BASE_URL` to match and restart the
frontend.

Fixed settings (in `backend/app/core/config.py`): request body limit 256 KiB; API prefix `/api/v1`.

## Checking that it works

1. Open <http://localhost:5173> and choose **Settings**: the Backend panel should say *Connected* and show the
   service version.
2. In **Cipher Workspace** choose Caesar, key 3, type `Hello, World!` and press **Encrypt message**: the result is
   `Khoor, Zruog!`.

If the backend is not running, the workspace and the Analysis Lab report that it is not reachable instead of failing
silently.

## Moving the repository

Python virtual environments store absolute paths. If you move the folder, delete `backend/.venv` and repeat the backend
installation. `frontend/node_modules` can be rebuilt with `npm install`.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Settings says *Not reachable* | the backend is not running, or `VITE_API_BASE_URL` points elsewhere |
| Browser console shows a CORS error | the frontend is on a port the backend does not allow; use 5173 or set `DISCRETA_CORS_ORIGINS` |
| `Address already in use` on port 8000 or 5173 | another process holds the port; stop it, or start the backend elsewhere and update `.env` |
| `npm run dev` exits with a port error | 5173 is taken (`strictPort`); free it |
