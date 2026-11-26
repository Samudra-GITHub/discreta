"""Regenerates the report's architecture figures as SVG.

    python build_figures.py

Writes architecture.svg, session-flow.svg and vigenere-pipeline.svg next to this file. The figures are
plain SVG (no scripts, no external fonts) so they render in GitHub, in browsers and in the PDF.
"""

from __future__ import annotations

from html import escape
from pathlib import Path

INK = "#242620"
MUTED = "#626359"
LINE = "#8f8d80"
PANEL = "#f7f6f0"
PANEL2 = "#ebe9df"
ACCENT = "#bc4a27"
FONT = "Inter, 'Segoe UI', Helvetica, Arial, sans-serif"
MONO = "'IBM Plex Mono', Consolas, 'Courier New', monospace"

OUT = Path(__file__).parent


class Svg:
    def __init__(self, w: int, h: int, title: str, desc: str):
        self.w, self.h = w, h
        self.parts: list[str] = []
        self.title, self.desc = title, desc

    def add(self, s: str) -> None:
        self.parts.append(s)

    def box(self, x, y, w, h, title, lines=(), fill=PANEL, stroke=LINE, accent=False, mono=False):
        self.add(
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{fill}" '
            f'stroke="{ACCENT if accent else stroke}" stroke-width="{1.6 if accent else 1.2}"/>'
        )
        self.add(
            f'<text x="{x + 12}" y="{y + 22}" font-family="{FONT}" font-size="13.5" font-weight="700" fill="{INK}">{escape(title)}</text>'
        )
        for i, line in enumerate(lines):
            fam = MONO if mono else FONT
            self.add(
                f'<text x="{x + 12}" y="{y + 42 + i * 17}" font-family="{fam}" font-size="11.5" fill="{MUTED}">{escape(line)}</text>'
            )

    def label(self, x, y, text, size=11.5, anchor="start", fill=MUTED, weight=400, mono=False):
        fam = MONO if mono else FONT
        self.add(
            f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="{fam}" font-size="{size}" '
            f'font-weight="{weight}" fill="{fill}">{escape(text)}</text>'
        )

    def arrow(self, x1, y1, x2, y2, dashed=False, color=INK, label=None, lx=None, ly=None):
        dash = ' stroke-dasharray="5 4"' if dashed else ""
        self.add(
            f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="1.4"{dash} marker-end="url(#a)"/>'
        )
        if label:
            self.label(lx if lx is not None else (x1 + x2) / 2, ly if ly is not None else (y1 + y2) / 2 - 6, label, 11, "middle")

    def path_arrow(self, d, dashed=False, color=INK):
        dash = ' stroke-dasharray="5 4"' if dashed else ""
        self.add(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="1.4"{dash} marker-end="url(#a)"/>')

    def group(self, x, y, w, h, title):
        self.add(
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="none" stroke="{LINE}" stroke-width="1" stroke-dasharray="6 5"/>'
        )
        self.label(x + 14, y + 20, title, 12, weight=700, fill=INK)

    def write(self, name: str) -> None:
        body = "\n  ".join(self.parts)
        svg = (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}" width="{self.w}" height="{self.h}" role="img" '
            f'aria-labelledby="t d">\n  <title id="t">{escape(self.title)}</title>\n  <desc id="d">{escape(self.desc)}</desc>\n'
            f'  <defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
            f'<path d="M0,0 L10,5 L0,10 z" fill="{INK}"/></marker></defs>\n'
            f'  <rect width="{self.w}" height="{self.h}" fill="#ffffff"/>\n  {body}\n</svg>\n'
        )
        (OUT / name).write_text(svg, encoding="utf-8")


def architecture() -> None:
    s = Svg(
        940,
        470,
        "DISCRETA system architecture",
        "The React frontend (pages, shared session, services) sends JSON over HTTP to the FastAPI backend (middleware, routers, "
        "the algebra and analysis packages). The analysis package calls the algebra package. The browser performs no cryptography.",
    )
    s.group(20, 20, 400, 430, "Browser: React 19 + TypeScript + Vite + Tailwind")
    s.box(40, 52, 360, 78, "Pages", ["Overview · Cipher Workspace · Analysis Lab · Settings", "floating glass taskbar (the only navigation)"])
    s.box(40, 152, 360, 100, "Shared session (in memory)", ["workspace state: cipher, keys, keyword, result", "analysis state: text, tab, five results", "transfers in both directions"])
    s.box(40, 274, 360, 78, "Services", ["api.ts: request, timeout, abort, error parsing", "cipher.ts · analysis.ts: reply shape guards"])
    s.box(40, 374, 360, 56, "Theme and background", ["system / light / dark · decorative layer"], fill=PANEL2)
    s.group(520, 20, 400, 430, "Backend: Python 3.12 + FastAPI")
    s.box(540, 52, 360, 64, "Middleware", ["CORS (explicit origins) · request body limit 256 KiB"])
    s.box(540, 134, 360, 64, "Routers and schemas", ["/api/v1/algebra · /api/v1/analysis", "Pydantic validation · uniform error body"])
    s.box(540, 216, 360, 96, "analysis", ["frequency · χ² · Caesar and affine ranking", "index of coincidence · Kasiski", "Vigenère key length and key letters"], accent=True)
    s.box(540, 330, 360, 100, "algebra", ["gcd · extended Euclid · modular inverse", "Caesar · affine · Vigenère ciphers", "key validation (no FastAPI imports)"], accent=True)
    s.path_arrow("M400 300 H448 V150 H538")
    s.label(470, 142, "POST JSON", 10.5, "middle")
    s.path_arrow("M538 180 H494 V330 H402", dashed=True)
    s.label(470, 346, "JSON or error", 10.5, "middle")
    s.arrow(720, 312, 720, 330)
    s.label(727, 326, "decrypt, inverses", 10.5)
    s.label(470, 462, "The browser validates input and presents results; every cipher operation and statistic is computed by the backend.", 11.5, "middle")
    s.write("architecture.svg")


def session_flow() -> None:
    s = Svg(
        940,
        330,
        "Moving results between the Cipher Workspace and the Analysis Lab",
        "A workspace result or message is sent to the Analysis Lab, which opens and runs the frequency analysis. A candidate from the "
        "Analysis Lab is sent back to the workspace, set to encrypt the candidate plaintext with the candidate key.",
    )
    s.box(30, 40, 300, 150, "Cipher Workspace", ["cipher: Caesar · affine · Vigenère", "operation: encrypt · decrypt", "key controls, message, result", "swap output into input"])
    s.box(610, 40, 300, 150, "Analysis Lab", ["one ciphertext shared by four tabs", "Frequency · Caesar · Affine · Vigenère", "inspect candidates", "results kept while you navigate"])
    s.arrow(332, 90, 608, 90, label="Send to Analysis Lab", lx=470, ly=78)
    s.label(470, 106, "text, tab = Frequency, runs frequency analysis", 10.5, "middle")
    s.arrow(608, 150, 332, 150, color=ACCENT, label="Send to Cipher Workspace", lx=470, ly=138)
    s.label(470, 166, "cipher + key + plaintext, operation = encrypt", 10.5, "middle")
    s.box(215, 218, 510, 84, "Shared session, in memory", ["provided above the routes; survives navigation; never saved", "Clear (lab) empties text and results · Clear session (Settings) resets both"], fill=PANEL2)
    s.arrow(180, 190, 300, 218, dashed=True)
    s.arrow(760, 190, 640, 218, dashed=True)
    s.write("session-flow.svg")


def vigenere_pipeline() -> None:
    s = Svg(
        940,
        380,
        "The Vigenère investigation pipeline",
        "Ciphertext letters feed the index of coincidence, Kasiski examination and a mean-column-IC table of key lengths 1 to 20. A key "
        "length is suggested or chosen; each column is then analysed with chi-squared to give key letters and ranked candidate keys, "
        "which can be sent to the Cipher Workspace. Sections are labelled measured, calculated or suggestion.",
    )
    xs = [20, 200, 380, 560, 740]
    heads = [
        ("1 Letters", ["ASCII letters only,", "case ignored", "positions from 0"], "measured"),
        ("2 IC and Kasiski", ["IC = Σ f(f−1)/(N(N−1))", "repeats ≥ 3 letters,", "distances, votes"], "measured"),
        ("3 Key lengths", ["mean column IC for", "m = 1 … 20", "plausible = ≥ 0.055 and", "within 0.005 of best"], "calculated"),
        ("4 Key letters", ["column j = Caesar", "χ² per shift 0 … 25", "best shift = key letter"], "calculated"),
        ("5 Candidate keys", ["best-first sums of", "column χ², ≤ 10 keys", "decrypt, whole-text χ²"], "suggestion"),
    ]
    for x, (title, lines, kind) in zip(xs, heads):
        s.box(x, 60, 170, 130, title, lines, accent=(kind == "suggestion"))
        s.label(x + 12, 176, kind.upper(), 10.5, fill=ACCENT if kind == "suggestion" else MUTED, weight=700, mono=True)
    for a, b in zip(xs, xs[1:]):
        s.arrow(a + 170, 125, b, 125)
    s.box(20, 230, 420, 100, "Honest by construction", ["every result carries a reliability flag by text length;", "multiples of the true key length also look plausible,", "so the shortest plausible length is suggested first."])
    s.box(470, 230, 450, 100, "Then", ["Inspect any candidate · Copy its text · Send to Cipher Workspace", "(set to encrypt the plaintext with the key: it should", "reproduce the ciphertext)."], fill=PANEL2)
    s.label(470, 360, "Measured = counted from the text · Calculated = derived by a formula · Suggestion = an estimate, not proof.", 11.5, "middle")
    s.write("vigenere-pipeline.svg")


if __name__ == "__main__":
    architecture()
    session_flow()
    vigenere_pipeline()
    print("wrote 3 figures")
