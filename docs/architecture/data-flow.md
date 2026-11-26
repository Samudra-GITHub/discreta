# Data flow

How data moves through DISCRETA: from a button press in the browser to the backend's mathematics and back, and between the
Cipher Workspace and the Analysis Lab. The diagrams are [Mermaid](https://mermaid.js.org/), which GitHub renders; static SVG
versions used by the report are in [`../report/figures/`](../report/figures/). Module structure is in the
[overview](overview.md).

## 1. Layers

```mermaid
flowchart LR
  subgraph Browser["Browser (React 19, TypeScript)"]
    P["Pages<br/>Workspace · Analysis Lab"]
    S["Session<br/>useCipherLab · useAnalysisSession"]
    V["Services<br/>api.ts · cipher.ts · analysis.ts"]
    P --> S --> V
  end
  subgraph Backend["Backend (FastAPI)"]
    M["Middleware<br/>CORS · 256 KiB body limit"]
    R["Routers<br/>/algebra · /analysis"]
    A["algebra<br/>number theory · ciphers"]
    N["analysis<br/>frequency · χ² · IC · Kasiski · Vigenère"]
    M --> R
    R --> A
    R --> N
    N --> A
  end
  V -- "POST JSON" --> M
  R -- "JSON, or uniform error body" --> V
```

* The browser never encrypts, decrypts or computes statistics. It validates what the user typed, calls the backend, checks the
  **shape** of each reply, and presents it.
* `analysis` calls `algebra` for decryption and modular inverses; it has no cipher arithmetic of its own.
* Both packages keep their mathematics free of FastAPI, so the routers only translate requests and errors.

## 2. One encryption

```mermaid
sequenceDiagram
  actor U as User
  participant W as Workspace page
  participant H as useCipherLab
  participant S as services/cipher.ts
  participant B as Backend router
  participant C as ciphers.py
  U->>W: choose cipher, key, type text
  W->>H: setCipher / setField / setText
  Note over H: local checks only: key format and range,<br/>valid affine multiplier, keyword letters, text length
  U->>W: press "Encrypt message"
  W->>H: execute()
  H->>S: runCaesar / runAffine / runVigenere
  S->>B: POST /api/v1/algebra/.../encrypt
  B->>C: validate key, transform letters
  alt valid
    C-->>B: output
    B-->>S: 200 JSON (output, reduced key, inverse or shifts)
    S-->>H: reply passes the shape guard
    H-->>W: run = success (kept with the inputs it ran on)
    W-->>U: result, formula with the key, worked steps checked against the output
  else invalid or unreachable
    B-->>S: 422 / 413 uniform error body, or the network fails
    S-->>H: ApiError (offline, timeout, http, invalid-response)
    H-->>W: run = error
    W-->>U: field message or error notice
  end
```

Rules enforced by the hook:

* **Explicit action only.** Typing never calls the backend.
* **Newest request wins.** A new call aborts an older one.
* **Results belong to their inputs.** If the inputs change after a run, the result stays visible but is marked *out of date*
  and no longer fills in numbers (for example the inverse) for different keys.

## 3. The shared session

The workspace and the lab are different pages but one investigation, so their state lives above the routes in
`SessionProvider` and survives navigation. Nothing is persisted: closing the tab ends it.

```mermaid
flowchart TB
  subgraph Session["SessionProvider (in memory)"]
    L["lab: cipher, operation, text,<br/>keys, keyword, last result"]
    A["analysis: ciphertext, active tab,<br/>frequency · Caesar · affine ·<br/>Vigenère lengths · Vigenère candidates"]
  end
  WS["Cipher Workspace"] <--> L
  AL["Analysis Lab"] <--> A
  L -- "Send to Analysis Lab (output or input text)<br/>sets text, opens lab, runs frequency analysis" --> A
  A -- "Send to Cipher Workspace (candidate)<br/>sets cipher, key, plaintext, operation = encrypt" --> L
```

| Transfer | What is set |
| --- | --- |
| Workspace → Analysis Lab | the analysis text becomes the chosen text; the tab becomes *Frequency Analysis*; the frequency analysis runs |
| Analysis Lab → Workspace | cipher and key from the candidate (Caesar `key`; affine `a`, `b`; Vigenère `shortest_equivalent_key`), the candidate's plaintext as the message, operation *encrypt* |
| Clear (lab) | text and all five results are emptied, tab returns to Frequency |
| Clear session (Settings) | the workspace returns to its initial inputs and the lab is cleared |

Each analysis stores the text it ran on. If the text differs from the current one the result is shown as *out of date*.

## 4. The Vigenère investigation

```mermaid
sequenceDiagram
  actor U as User
  participant T as Vigenère tab
  participant S as useAnalysisSession
  participant B as Backend /analysis
  U->>T: "Investigate key length"
  T->>S: run('vigenere')
  S->>B: POST /vigenere/lengths  {text}
  Note over B: letters only → IC, Kasiski repeats and votes,<br/>mean column IC for lengths 1..20
  B-->>S: ic, kasiski, ranked lengths, suggested_length (or null)
  alt a length is suggested
    S->>B: POST /vigenere/candidates  {text, key_length}
    Note over B: split into columns, χ² per shift,<br/>best-first combinations, decrypt each
    B-->>S: columns, up to 10 ranked candidate keys with plaintext
  else none suggested
    S-->>T: ask the user to choose a length
  end
  U->>T: "Analyse" on another length (optional)
  T->>S: investigateLength(m)
  S->>B: POST /vigenere/candidates  {text, key_length: m}
  U->>T: Inspect a key, "Send to Cipher Workspace"
```

## 5. Errors and limits

Every client error has one shape, `{"detail": [{"loc", "msg", "type"}]}`, never echoes the input, and lists at most 20
problems. The frontend turns it into one of these states:

| Situation | Backend | Frontend |
| --- | --- | --- |
| backend not running | no response | "The backend is not reachable" with the start command |
| no answer in time | timeout (5 s; 15 s for the affine search and Vigenère calls) | "took too long" |
| invalid field | 422 with `loc` | the message appears next to that field |
| body too large | 413 | "The message is too large" |
| unexpected reply | 200 with a different shape | "Unexpected reply from the backend"; nothing is shown |

## 6. Theme and navigation

* **Navigation** is one floating taskbar with four links (`navItems` in `layouts/navigation.ts`); there is no sidebar or top bar.
  Old addresses `/cipher-lab` and `/frequency-analyzer` redirect to the new pages; any other unknown path shows a not-found page.
* **Theme** is held by `ThemeProvider`: a choice of system, light or dark stored in `localStorage` (failures ignored), mirrored on
  `<html data-theme>`, applied before first paint by an inline script, and following the operating system live while *system*
  is selected.
* **Background** is a decorative fixed layer behind the page: `pointer-events: none`, hidden from assistive technology, paused in a
  hidden tab and static under reduced motion. See the [design system](design-system.md).
