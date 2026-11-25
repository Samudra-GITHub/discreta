# Architecture overview

This document records the main design decisions up to v0.3.0 (the v0.1.0 foundation, the
v0.2.0 cipher engine, the v0.2.1 corrections and the v0.3.0 Cipher Laboratory and redesign)
and the reasons for them.

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
touching any other file. Only the algebra router has endpoints so far (Caesar and affine
ciphers, added in v0.2.0); the other routers are empty on purpose, and
`GET /api/v1/modules` reports algebra as `in_progress` and the rest as `planned`.

The algebra module is split into `number_theory.py` (pure integer algorithms), `ciphers.py`
(pure functions raising `InvalidKeyError`), `schemas.py` (Pydantic request and response
models) and `router.py`, the HTTP layer. The router maps requests onto the pure functions,
reports the reduced keys (including `a_inverse`, which it obtains by calling `mod_inverse`),
and turns an `InvalidKeyError` into the uniform 422 error response. It contains no
cipher arithmetic of its own. The mathematics never depends on FastAPI, so it can be tested
and reused directly.

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
feature is built, its `status` changes in one place on each side. Since v0.3.0 both sides
agree: algebra is `in_progress` (backend) / `in-progress` (frontend), because the Cipher
Laboratory uses its endpoints.

## Backend

- **Application factory** (`create_app`) lets tests build an app with custom settings.
- **Settings** live in `app/core/config.py`. Only `DISCRETA_CORS_ORIGINS` is read from the
  environment; the other settings (such as the request-body limit) have fixed defaults that
  tests can override through `create_app(Settings(...))`.
- **CORS** allows the Vite dev server (`localhost`/`127.0.0.1` on 5173) and `vite preview`
  (4173). No wildcard, no credentials, only the methods the API uses.
- **Health** (`GET /api/v1/health`) returns `status`, `service`, `version`, `message` and a
  UTC `timestamp`. `GET /` returns a small service banner.
- **Uniform errors** (`app/core/errors.py`). Every client error has the body
  `{"detail": [{"loc": [...], "msg": "...", "type": "..."}]}`: request validation errors
  (422), mathematically invalid keys (422, type `invalid_key`), unknown routes (404), wrong
  methods (405) and oversized bodies (413). The offending input is never echoed back, the body
  is encoded as plain ASCII, and at most 20 problems are listed, so a response can always be
  serialised and cannot be used to amplify a request. FastAPI's default handler echoed the
  input, which turned `NaN`, `Infinity` and unpaired surrogates into HTTP 500 errors.
  Unexpected exceptions are deliberately *not* mapped to 4xx: they return a fixed generic
  500 body, and the traceback goes only to the server log.
- **Request-size limit** (`app/core/limits.py`). A small ASGI middleware refuses bodies over
  256 KiB with HTTP 413 before they are parsed. It checks the declared `Content-Length`
  and also counts streamed bytes, so chunked or falsely labelled bodies are stopped too. It
  sits inside the CORS middleware so that 413 responses still carry CORS headers.
- **API limits are not mathematical limits.** Keys are bounded to ±(2⁵³ − 1) at the API
  boundary because JavaScript numbers cannot represent larger integers exactly; the functions
  in `number_theory.py` and `ciphers.py` accept any integer.
- **SymPy** is used only by the test suite, as an independent oracle for the hand-written
  number theory. The application code never imports it.
- **Dependencies.** `backend/requirements.txt` holds the runtime packages (FastAPI and
  Uvicorn). `backend/requirements-dev.txt` includes it and adds the development and test
  tools (pytest, httpx, SymPy). Install the dev file for local work.

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

### Cipher Laboratory (v0.3.0)

- **State** lives in one hook, `modules/algebra/useCipherLab.ts`: the inputs, the run state
  (`idle`, `loading`, `success`, `error`), local validation, and the single `execute` action.
  Typing never calls the backend; only the explicit run button does, and a newer request
  cancels an older one.
- **API access** goes through the one request helper in `services/api.ts` (timeout, abort,
  the backend's uniform error body parsed into `ApiError` with `kind` and `details`), and
  `services/cipher.ts`, which also checks the shape of each reply.
- **Local mathematics** (`modules/algebra/cipherMath.ts`) only validates what the user typed
  (an integer with at most 2⁵³ − 1 in magnitude), reduces keys with exact `BigInt`
  arithmetic, and draws the alphabet dial preview. It never produces the result. The worked
  example is built from the backend's reduced keys and inverse and is **checked letter by
  letter against the backend's output**; if anything disagrees, it is withheld.
- **Stale results.** If the inputs change after a run, the result stays visible but is marked
  out of date, and it no longer fills in formula numbers, the inverse or the explainer.
- **Invalid multipliers** (gcd(a, 26) ≠ 1) are explained with a concrete colliding pair of
  letters and are never sent; the backend would reject them with HTTP 422 `invalid_key`.

### Look and shell (v0.3.0)

One light design system for the whole app; see [design-system.md](design-system.md). The
per-page 3D forms are small WebGL shaders with static SVG fallbacks, and need no 3D library.
The **Theory & Proofs** page (new) states and proves the three theorems the ciphers rely on
and draws two diagrams from the same arithmetic; it is the only page added in v0.3.0.

## Known limitations

- Only the Caesar and affine ciphers exist, with the Cipher Laboratory as their interface.
  The other four modules, the frequency analysis engine and the Secure Message Journey are
  not implemented; their pages are labelled as planned.
- The cipher wheel follows the key controls but cannot be dragged to set the key.
- An integer literal of more than 4,300 digits in a request body is refused by Python's JSON
  parser with HTTP 400 (type `bad_request`) rather than the 422 used for other malformed
  input. POSTs to a URL with a trailing slash get a 307 redirect (FastAPI's default).
- Frontend tests (Vitest, Testing Library) cover the services, the mathematics helpers, the
  Cipher Laboratory page and every route; the WebGL shaders are checked for structure only,
  since jsdom has no GPU. Visual quality is checked in a real browser.
- Python and Node virtual environments are not portable between folders; see the README
  if the repository is moved.
