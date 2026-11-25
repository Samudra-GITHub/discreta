# Architecture overview

This document records the main design decisions of the v0.1.0 foundation and the reasons
for them.

## Monorepo

`frontend/` and `backend/` live in one repository. The project has two contributors and
the two halves change together (an API change usually needs a matching UI change), so a
single history and a single pull request per feature is simpler than two repositories.

## Module contract

The five mathematical modules (logic, sets, combinatorics, graphs, algebra) are mirrored
on both sides with the same names.

**Backend.** Each package under `backend/app/modules/<slug>/` exposes:

- `INFO`: a `ModuleInfo` (slug, title, summary, status), defined in `modules/base.py`
- `router`: a FastAPI `APIRouter` with prefix `/<slug>`

`app/modules/__init__.py` lists the modules in `MODULES`. The v1 router mounts every
module's router, so a finished module's endpoints appear at `/api/v1/<slug>/...` without
touching any other file. Routers are empty on purpose: the mathematical engines are not
implemented, and `GET /api/v1/modules` reports every module as `planned`.

**Frontend.** Each folder under `frontend/src/modules/<slug>/` exports a `LabModule`
description (title, symbol, topics, icon, status). `modules/index.ts` registers them; the
sidebar, dashboard cards and module pages are all generated from that list.

Adding a module means adding one folder and one registry line on each side.

## Where the ciphers live

The base topic's ciphers (Caesar, affine, Vigenère) are arithmetic over ℤ₂₆, so their
mathematics belongs to the **algebra** module. Key-space counting uses **combinatorics**.
The three cryptography pages in the UI are presentation layers over those modules, not a
sixth module. If the cryptography code outgrows algebra, a dedicated package can be
added under the same contract.

## Honest status

Nothing in the UI pretends to compute. Planned pages say so in a visible note, status
badges read "Planned", and the Secure Message Journey diagram is a static outline. When a
feature is built, its `status` changes in one place and the badge follows.

## Backend

- **Application factory** (`create_app`) lets tests build an app with custom settings.
- **Settings** are read from environment variables with local defaults
  (`app/core/config.py`). Only `DISCRETA_CORS_ORIGINS` exists so far.
- **CORS** allows the Vite dev server (`localhost`/`127.0.0.1` on 5173) and `vite preview`
  (4173). No wildcard, no credentials, only the methods the API uses.
- **Health** (`GET /api/v1/health`) returns `status`, `service`, `version`, `message` and a
  UTC `timestamp`. `GET /` returns a small service banner.
- **SymPy** is a dependency now so that later engines can verify their results
  symbolically; nothing imports it yet.

## Frontend

- **Stack choices.** Vite and Tailwind CSS 4 (via `@tailwindcss/vite`) for a small
  toolchain; React Router for the multi-page shell; React Flow only where a graph is
  drawn. TypeScript runs in strict mode with `noUncheckedIndexedAccess`.
- **API layer.** `services/config.ts` reads `VITE_API_BASE_URL`; `services/api.ts` is a
  small typed `fetch` wrapper with timeout and abort support; `services/health.ts` adds
  runtime validation of the health payload.
- **Connection indicator.** `hooks/useBackendHealth.ts` performs a real request on mount
  and every 30 seconds. The status is `online` only for a well-formed response with
  `status: "ok"`; any network error, timeout, HTTP error or malformed body gives
  `offline`. A context provider shares one poller between the header badge and the
  dashboard panel.
- **Code splitting.** The Secure Message Journey page, the only user of React Flow, is
  loaded lazily so the initial bundle stays small.
- **Accessibility.** Skip link, labelled landmarks, visible focus rings, `aria-live` on the
  connection status, reduced-motion support, and a mobile navigation drawer that is
  removed from the tab order while closed.

## Known limitations

- No mathematical engine, API endpoint or interactive tool exists yet.
- No frontend unit tests yet; the frontend is verified by type-check, production build and
  manual browser checks. A test runner (Vitest) is the natural next addition once there is
  logic to test.
- Python and Node virtual environments are not portable between folders; see the README
  if the repository is moved.
