# Design system: Aurora

DISCRETA looks like one product on every page. This note records where the look comes from,
what each part is for, and the rules that keep it restrained.

## The reference

The visual direction comes from a six-second Dribbble motion piece, "UI Animation" (720 × 540,
60 fps, silent), supplied as a video. It was studied frame by frame (contact sheets extracted
with ffmpeg), not from a thumbnail. What it shows:

- **Sequence.** It opens on a finished health dashboard, then cuts to a pale grey scene: a
  frosted, translucent glass card floats over a glossy, fluid blob that swells and ripples.
  The card blurs away, the blob shrinks, crumples and morphs into a 3D brain on a pale
  lavender-and-peach gradient. The brain rises onto a frosted white bowl with a thin orbit
  line. Interface chrome then fades in: an icon-only rail, a search circle and tabs,
  pale ghost panels that fill with content, a headline that reveals, hairline connectors and
  small labelled pills. There are no bounces or flashes.
- **Material.** The 3D object is reflective and iridescent, shifting between blue, violet,
  electric purple, magenta, pink and cyan with the viewing angle, with a soft highlight and
  depth. It is the one saturated thing on screen.
- **Ground and surfaces.** Lavender-grey ground (about `#dadbed`) washed with lavender
  (`#d4cfed`), pale pink (`#f1cdda`) and icy grey-blue (`#e4e8ec`). Panels are near-white with
  a lavender tint (`#efeff8` to `#f1f0f5`), borderless in feel, with soft diffuse shadows.
- **Type.** A bold, squared, techno sans for the headline; a small rounded humanist sans for
  everything else.
- **Layout.** A floating window; an icon-only left rail; one hero object in the middle with
  small widget tiles either side, tied to it by hairlines.

## What was kept from the existing DISCRETA

The Cipher Laboratory's lavender identity, mathematical typography (italic serif variables,
`ℤ₂₆`, `a⁻¹`), the alphabet-disc visualisation, the formula and worked-example panels and the
educational tone all stay. The original dark theme was replaced: the reference is light, and
a half-dark, half-light product would not feel like one thing.

## Tokens (`frontend/src/index.css`)

Components use semantic tokens only; no component hard-codes a colour.

| Token | Value | Use |
| --- | --- | --- |
| `canvas` | `#dadbed` | page ground |
| `surface` / `raised` | `#eef0f9` / `#f6f7fc` | panels, controls |
| `line` / `line-strong` | `#cdd0e8` / `#b4b8da` | hairlines |
| `fg` / `fg-muted` / `fg-subtle` | `#23263a` / `#4c506a` / `#555a75` | text |
| `accent` / `accent-strong` | `#4f3fc4` / `#3b2d9e` | links, emphasis |
| `ok` / `warn` / `err` | `#08665b` / `#8a5200` / `#a8231b` | status text |
| `iris-blue` / `violet` / `pink` / `mint` | `#64a2d9` / `#7b5cd6` / `#e879a6` / `#5fd0c2` | illustration and highlights only |

Text colours meet WCAG AA (4.5:1) on `canvas`, `surface` and `raised`.

**Typography.** Display: Rajdhani (headings, hub numbers). Text: Nunito. Mathematics: the
system serif in italic for variables. Both web fonts are self-hosted through `@fontsource`.
They are open fonts chosen to match the *character* of the reference; they are not claimed to
be its exact typefaces.

## Surfaces: used sparingly

| Class | Meaning |
| --- | --- |
| `aurora-tile` | the one soft panel: translucent near-white, faint top highlight, long diffuse shadow |
| `aurora-chip` | small raised control: buttons, pills, selected options |
| `aurora-inset` | pressed-in control: text fields, tracks |
| `aurora-primary` | the single primary-action style: iridescent gradient |

Rules: panels that belong together share **one** tile and are separated by hairlines (the
Cipher Laboratory's controls and its mathematics column are one tile each); explanatory text
sits directly on the page, not in a box; blur is used on exactly one element (the glass
card over the dashboard sculpture). No decorative controls: every button does something.

## Shell

A slim floating icon rail, as in the reference. Hovering or tabbing into it widens it so every
label is readable, which keeps all five modules, the three cryptography tools and the theory
page easy to find; on small screens it becomes a labelled drawer. The header carries only the
page title and the live backend status. Pages ease in on navigation.

## Sculptures: the 3D focal object

Each page has one focal 3D form, rendered by `components/sculpture/`:

- **How.** A small raymarching fragment shader (signed distance functions) on a `<canvas>`.
  There is **no 3D library**: three.js would add several hundred kilobytes for one effect, while
  the renderer here is two small files. Shading imitates the reference: thin-film iridescence
  from the viewing angle, soft ambient occlusion, a specular highlight, rim light, an
  environment gradient and a faint contact shadow so the form floats.
- **Per page.** Dashboard: a fluid, lobed ring. Logic: an AND gate. Sets: three interlocked
  rings in a Venn arrangement. Combinatorics: three layers on which three spheres stand in
  different orders. Graphs: spheres joined by rods. Algebra: a ring of 26 beads for ℤ₂₆ with
  0 and 3 emphasised. Frequency Analyzer: bars for the twelve most common English letters,
  E T A O I N S H R D L U, at their real relative frequencies. Secure Message Journey: two
  spheres joined by an arc, with a floating glass card. Theory & Proofs: stacked proof slabs.
  The Cipher Laboratory's focal object is its interactive SVG cipher wheel.
- **Cost control.** One canvas per page; resolution capped (720 px longest side, device pixel
  ratio at most 1.5); 30 frames per second; no drawing while the canvas is off screen or the
  tab is hidden; a single still frame when reduced motion is requested.
- **Fallback.** If WebGL or the shader is unavailable, a static SVG illustration of the same
  idea is shown, so the page never has an empty hole.

## Motion

Panels fade up out of a soft blur in sequence on load; the cipher wheel's inner ring turns to
the new shift; result letters appear one after another (only for short output); the sculpture
drifts a few pixels. All of it is disabled by `prefers-reduced-motion`.

## Limits

- The cipher wheel is driven by the key controls; it cannot yet be dragged to set the key.
- Sculptures are decorative: they carry no data except where stated (the frequency bars).
- Dialogs and data tables do not exist in the application yet, so there is no component for
  them; they should be built from the surfaces above when they are first needed.
