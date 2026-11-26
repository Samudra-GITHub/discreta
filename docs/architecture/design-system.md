# Design system: "Instrument"

DISCRETA looks like a precision instrument with the restraint of a case file. The aim is a tool for
serious analysis: warm paper-like neutrals, one orange accent, monospaced data, fine rules instead of
boxes, and almost no decoration. It replaces the earlier "Aurora" look (lavender surfaces, glass cards,
WebGL sculptures, icon rail), which was retired in v0.4.0 together with the dashboard layout.

## Principles

1. **Work first.** Input, key, result, chart and table get the space. Nothing is there to fill space.
2. **One navigation:** a floating glass taskbar at the bottom. No sidebar, no top bar.
3. **Few surfaces.** A boxed panel (`.panel`) is used only for text being edited or a result being read.
   Everything else is grouped by headings and thin rules (`Section`).
4. **Glass only where it floats.** The taskbar is the one glass element; it is translucent because it sits
   over scrolling content.
5. **Orange means something.** The accent marks the primary action, the active destination, the English
   reference in charts, and the single most important finding (best candidate, widest gap).
6. **Colour never carries meaning alone.** Status uses an icon and words; chart series differ in shape
   (bars against marker lines); the active destination also has an underline bar and `aria-current`.

## Tokens

Defined in `frontend/src/index.css` as CSS variables, switched by `data-theme="light|dark"` on `<html>`.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `canvas` | `#EAE8E0` | `#171A19` | page |
| `surface` | `#F7F6F0` | `#222725` | editors, panels |
| `surface-2` | `#E2E0D7` | `#292F2C` | hover and selected rows |
| `fg` | `#242620` | `#E9E8DF` | text |
| `fg-muted` | `#626359` | `#A1A69D` | secondary text |
| `accent` | `#D45B37` | `#E47B50` | indicators, chart reference, graphics |
| `accent-ink` | `#A93F1E` | `#EE8F67` | accent as text |
| `accent-solid` | `#BC4A27` | `#E47B50` | primary button fill (`on-accent` text) |
| `slate` | `#777F78` | `#91A49A` | chart bars |
| `line`, `line-strong` | `#D0CEC2`, `#B9B6A8` | `#353C39`, `#48514D` | rules and borders |

Deviations from the brief's suggested values, made for contrast: secondary text is `#626359`, not
`#77786F` (which is about 4.1 : 1 on the surface), and the orange is split into a graphic value, a text
value and a button value, because `#D45B37` alone reaches only about 3.6 to 3.9 : 1 with small text. The
dark theme is designed separately: the accent is lighter, button text is dark, and shadows are heavier.

## Type

* Headings: **Space Grotesk** (variable). Body: **Inter** (variable). Data: **IBM Plex Mono**
  (400, 500), used for ciphertext, keys, formulas, counts and scores, and for the eyebrow labels.
* All three are self-hosted through `@fontsource` packages (no network request to a font service).
* Only the Overview headline is large; page titles are about 28 to 32 px.

## Floating taskbar

`components/Taskbar.tsx`. Fixed at the bottom centre, offset by `env(safe-area-inset-bottom)`. Four
destinations: Overview, Cipher Workspace, Analysis Lab, Settings. From 640 px up the icon and the full
label sit in a row; below that the icon sits above a short label (Workspace, Analysis) so all four fit
in 375 px with 44 px or taller touch targets. The active item has a slightly stronger background, an
accent icon and a 2 px accent bar. Hover lifts the icon by 1 px (only if motion is allowed). Page content
has bottom padding of 7.5 rem plus the safe area so the taskbar never covers the last line.

## Motion

Pages ease in over 240 ms (opacity and 6 px). Results ease in over 200 ms. Hover and selection transitions
last 150 ms. `prefers-reduced-motion` reduces every animation and transition to nothing. Apart from the background layer below there is no
continuous animation, no parallax and no 3D.

## Evidence labels

In the Vigenère tab each section carries a small label: **Measured** (counted directly from the text: letters, IC,
repeated sequences and their positions), **Calculated** (derived by a formula: mean IC, χ²) or **Suggestion** (a
statistical estimate such as the suggested key length or a candidate key). Charts show real values only: the IC
gauge marks the random value, the English value and the text's own value on one scale, and the length chart
marks the English and random values as reference lines (dashed and dotted, so the two differ without colour).

## Atmosphere (background layer)

A supporting layer that gives the app the feel of a cryptographic investigation room without competing with
the tools (`components/atmosphere/`, styles `.atmo-*` in `index.css`).

* **Everywhere:** a very faint static grid (64 px, about 5 % opacity).
* **Only in the empty side margins of wide screens** (from 1300 px; annotations from 1500 px): a column of
  hexadecimal bytes on each side scrolling very slowly (150 s per loop), a margin annotation that changes
  every 7 s, and a few binary groups that fade in and out. Nothing animated is ever placed behind the
  content column, an editor, a chart or a control.
* **Per page:** Overview adds a quiet network diagram (right-angled lines, nodes, slow pulses, three labels)
  beside the headline; Workspace rotates modular-arithmetic annotations (`x + k mod 26`, `gcd(a, 26) = 1`,
  `a · a⁻¹ ≡ 1`); Analysis Lab adds a faint bar motif and the labels `FREQUENCY`, `χ² · 25 DOF`,
  `KEYSPACE 26`, `KEYSPACE 312`; Settings has the grid only.
* **Truthful:** every annotation is a true statement about the mathematics. The small status tag reads
  `STANDBY` or `PROCESSING` from the real request state of the workspace and the lab. There are no logs, alerts
  or invented activity. The hex columns and binary groups are texture only.
* **Colour:** light theme uses warm grey ink and a muted orange; dark theme uses muted green-grey and a
  warm orange. Opacity is kept low in both (tokens `--atmo-*`).
* **Safe by construction:** `position: fixed`, `pointer-events: none`, `aria-hidden`, nothing focusable,
  `contain: layout paint`, only `transform` and `opacity` animate, no JavaScript per frame (the label rotation
  is one 7 s timer). Animations pause while the tab is hidden and are switched off under
  `prefers-reduced-motion`, which leaves the static grid and text. On phones and tablets only the static grid
  renders.
* **The taskbar sits on top of it:** blurred, with a fine border, a soft shadow, an inset top highlight and a
  faint top sheen (`--glass-sheen`), tuned separately for each theme.

## Themes

Light, dark, or system. The choice is stored in `localStorage` (`discreta-theme`; failures are ignored),
applied by an inline script in `index.html` before first paint (no flash), and followed live when the
operating system changes while "System" is selected.
