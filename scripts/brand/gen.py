"""Generate every Nubi Sport brand asset from this one file.

The original artwork (scripts/brand/original-*.png: neon shield + running shoe)
is kept for reference only. This redraws it as a clean, flat, scalable system:
a shield crest with a forward-leaning "N" + speed lines, an outlined wordmark,
and the lockups built from them.

Writes public/brand/{crest,wordmark,wordmark-dark,logo,logo-dark}.svg,
public/favicon.svg, public/apple-touch-icon.png and public/og.png.

    python3 -m venv .venv-brand && .venv-brand/bin/pip install fonttools
    .venv-brand/bin/python scripts/brand/gen.py

macOS only: outlines the system Avenir Next Condensed (so the SVGs need no fonts
at runtime) and rasterises the PNGs with a headless Chromium (Chrome, else Brave).
"""
import os, subprocess, tempfile
from fontTools.ttLib import TTCollection
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PUBLIC = os.path.join(ROOT, "public")
OUT = os.path.join(PUBLIC, "brand")
BROWSERS = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
]
BROWSER = next((b for b in BROWSERS if os.path.exists(b)), None)

_AVENIR = TTCollection("/System/Library/Fonts/Avenir Next Condensed.ttc").fonts
HEAVY_ITALIC = next(f for f in _AVENIR if f["name"].getDebugName(4) == "Avenir Next Condensed Heavy Italic")
DEMI = next(f for f in _AVENIR if f["name"].getDebugName(4) == "Avenir Next Condensed Demi Bold")

# Palette (also in src/styles/global.css): deep navy + energy orange.
NAVY, ORANGE, WHITE, MUTED = "#0A1A33", "#FF5A1F", "#FFFFFF", "#94A3B8"


def text(font, s, size, x, y, tracking=0.0, anchor="start"):
    """Single-line text as a path `d`; returns (d, width)."""
    gs, cmap = font.getGlyphSet(), font.getBestCmap()
    k = size / font["head"].unitsPerEm
    names = [cmap[ord(c)] for c in s]
    adv = [gs[n].width * k for n in names]
    width = sum(adv) + tracking * (len(s) - 1)
    cx = x - width / 2 if anchor == "middle" else x
    pen = SVGPathPen(gs)
    for n, a in zip(names, adv):
        gs[n].draw(TransformPen(pen, (k, 0, 0, -k, cx, y)))
        cx += a + tracking
    return pen.getCommands(), width


def svg(w, h, body, title):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:g} {h:g}" role="img">'
        f"<title>{title}</title>{body}</svg>\n"
    )


# --- Crest: 100 x 112 ------------------------------------------------------
SHIELD = "M16 4H84L96 16V58C96 82 77 98 50 109C23 98 4 82 4 58V16Z"
KEYLINE = "M19 11H81L89 19V58C89 78 72 92 50 101C28 92 11 78 11 58V19Z"


def crest_body(est=True):
    """Shield, orange keyline, the forward-leaning N with speed lines, EST. 2026."""
    est_d, _ = text(DEMI, "EST. 2026", 7.5, 50, 88, tracking=1.1, anchor="middle")
    return (
        f'<path d="{SHIELD}" fill="{NAVY}"/>'
        f'<path d="{KEYLINE}" fill="none" stroke="{ORANGE}" stroke-width="2.5"/>'
        # Everything inside leans forward 12 degrees around the shield centre.
        '<g transform="translate(50 50) skewX(-12) translate(-50 -50)">'
        # Speed lines: shorter as they trail off.
        f'<g fill="{ORANGE}">'
        '<rect x="14" y="36" width="13" height="4.5" rx="1"/>'
        '<rect x="18" y="47" width="9" height="4.5" rx="1"/>'
        '<rect x="22" y="58" width="5" height="4.5" rx="1"/>'
        "</g>"
        # N: two white uprights, orange diagonal.
        f'<g fill="{WHITE}">'
        '<rect x="31" y="27" width="11" height="44"/>'
        '<rect x="59" y="27" width="11" height="44"/>'
        "</g>"
        f'<path d="M31 27H42L70 71H59Z" fill="{ORANGE}"/>'
        "</g>"
        + (f'<path d="{est_d}" fill="{WHITE}"/>' if est else "")
    )


def favicon_body():
    """Crest without the tiny EST line, which is unreadable at 16 px."""
    return crest_body(est=False)


# --- Wordmark: NUBI + SPORT, tagline ----------------------------------------
def wordmark(dark, tagline="RUNNING COMMUNITY · EST. 2026"):
    ink = WHITE if dark else NAVY
    tag_ink = MUTED if dark else "#475569"
    nubi, w1 = text(HEAVY_ITALIC, "NUBI", 64, 0, 56, tracking=1)
    sport, w2 = text(HEAVY_ITALIC, "SPORT", 64, w1 + 14, 56, tracking=1)
    width = w1 + 14 + w2
    tag, tw = text(DEMI, tagline, 15.5, 2, 84, tracking=3.2)
    width = max(width, tw + 2)
    body = (
        f'<path d="{nubi}" fill="{ink}"/>'
        f'<path d="{sport}" fill="{ORANGE}"/>'
        f'<path d="{tag}" fill="{tag_ink}"/>'
    )
    return body, width + 4, 92


def lockup(dark):
    """Crest + wordmark side by side (header, documents). EST. 2026 is on the crest."""
    wbody, ww, wh = wordmark(dark, "RUNNING COMMUNITY")
    scale = 96 / 112  # crest height = 96
    gap = 22
    cw = 100 * scale
    body = (
        f'<g transform="scale({scale:.4f})">{crest_body()}</g>'
        f'<g transform="translate({cw + gap:.1f} 6)">{wbody}</g>'
    )
    return body, cw + gap + ww, 96


def rasterise(svg_text, w, h, out, background="transparent"):
    if not BROWSER:
        print(f"skip {out}: no Chromium browser found")
        return
    html = (
        f"<html><body style='margin:0;background:{background};display:grid;"
        f"place-items:center;width:{w}px;height:{h}px'>{svg_text}</body></html>"
    )
    with tempfile.TemporaryDirectory() as tmp:
        page = os.path.join(tmp, "p.html")
        with open(page, "w") as f:
            f.write(html)
        subprocess.run(
            [BROWSER, "--headless=new", "--disable-gpu", "--hide-scrollbars",
             "--default-background-color=00000000", f"--window-size={w},{h}",
             f"--screenshot={out}", f"file://{page}"],
            check=True, capture_output=True,
        )


def main():
    os.makedirs(OUT, exist_ok=True)
    files = {
        "crest.svg": svg(100, 112, crest_body(), "Nubi Sport"),
    }
    for dark in (False, True):
        suffix = "-dark" if dark else ""
        body, w, h = wordmark(dark)
        files[f"wordmark{suffix}.svg"] = svg(round(w, 1), h, body, "Nubi Sport")
        body, w, h = lockup(dark)
        files[f"logo{suffix}.svg"] = svg(round(w, 1), h, body, "Nubi Sport - Running Community")
    for name, content in files.items():
        with open(os.path.join(OUT, name), "w") as f:
            f.write(content)
    with open(os.path.join(PUBLIC, "favicon.svg"), "w") as f:
        f.write(svg(100, 112, favicon_body(), "Nubi Sport"))

    # Apple touch icon: crest on navy, padded (iOS rounds the corners itself).
    icon = svg(100, 112, crest_body(), "Nubi Sport").replace("<svg ", '<svg width="132" height="148" ')
    rasterise(icon, 180, 180, os.path.join(PUBLIC, "apple-touch-icon.png"), background=NAVY)

    # Social card: dark lockup centred on navy.
    body, w, h = lockup(dark=True)
    scale = 900 / w
    og = svg(round(w, 1), h, body, "Nubi Sport").replace(
        "<svg ", f'<svg width="{w * scale:.0f}" height="{h * scale:.0f}" '
    )
    rasterise(og, 1200, 630, os.path.join(PUBLIC, "og.png"), background=NAVY)
    print("wrote", ", ".join(files), "favicon.svg, apple-touch-icon.png, og.png")


if __name__ == "__main__":
    main()
