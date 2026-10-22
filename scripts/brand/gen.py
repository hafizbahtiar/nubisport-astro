"""Publish the Nubi Sport brand set.

Source of truth: the designer's SVGs in scripts/brand/source/ (never edited).
This copies them to public/brand/ unchanged and derives what the site needs:

- logo-on-dark.svg   - nubi-logo-reversed without its baked navy background,
                       cropped to the artwork (header/hero sit on navy already)
- symbol-on-dark.svg - nubi-symbol with the navy lane in white
- public/favicon.svg (= nubi-favicon.svg), apple-touch-icon.png (from the avatar),
  og.png (reversed logo centred on navy)

    python3 scripts/brand/gen.py

Needs only Python + a Chromium browser (Chrome, else Brave) for the PNGs.
"""
import os, re, shutil, subprocess, tempfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(os.path.dirname(__file__), "source")
PUBLIC = os.path.join(ROOT, "public")
OUT = os.path.join(PUBLIC, "brand")
BROWSERS = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
]
BROWSER = next((b for b in BROWSERS if os.path.exists(b)), None)
NAVY = "#0a1a33"


def read(name):
    with open(os.path.join(SRC, name)) as f:
        return f.read()


def write(path, content):
    with open(path, "w") as f:
        f.write(content)


def crop(svg):
    """Drop the source's -24 padding: viewBox to the artwork's own box."""
    return re.sub(
        r'viewBox="-24 -24 ([\d.]+) ([\d.]+)"',
        lambda m: f'viewBox="0 0 {float(m[1]) - 48:g} {float(m[2]) - 48:g}"',
        svg,
        count=1,
    )


def rasterise(svg, w, h, out, background):
    if not BROWSER:
        print(f"skip {out}: no Chromium browser found")
        return
    html = (
        f"<html><body style='margin:0;background:{background};display:grid;"
        f"place-items:center;width:{w}px;height:{h}px'>{svg}</body></html>"
    )
    with tempfile.TemporaryDirectory() as tmp:
        page = os.path.join(tmp, "p.html")
        write(page, html)
        subprocess.run(
            [BROWSER, "--headless=new", "--disable-gpu", "--hide-scrollbars",
             f"--window-size={w},{h}", f"--screenshot={out}", f"file://{page}"],
            check=True, capture_output=True,
        )


def sized(svg, w, h):
    return svg.replace("<svg ", f'<svg width="{w}" height="{h}" ', 1)


def main():
    os.makedirs(OUT, exist_ok=True)
    for name in sorted(os.listdir(SRC)):
        if name.endswith(".svg"):
            shutil.copyfile(os.path.join(SRC, name), os.path.join(OUT, name))

    reversed_logo = read("nubi-logo-reversed.svg")
    on_dark = re.sub(r"<rect [^>]*/>", "", reversed_logo, count=1)
    assert on_dark != reversed_logo, "reversed logo no longer has its background rect"
    write(os.path.join(OUT, "logo-on-dark.svg"), crop(on_dark))

    symbol = read("nubi-symbol.svg")
    assert symbol.count(f'fill="{NAVY}"') == 1, "symbol colours changed - update gen.py"
    write(os.path.join(OUT, "symbol-on-dark.svg"), crop(symbol.replace(f'fill="{NAVY}"', 'fill="#ffffff"')))

    shutil.copyfile(os.path.join(SRC, "nubi-favicon.svg"), os.path.join(PUBLIC, "favicon.svg"))
    rasterise(sized(read("nubi-avatar.svg"), 180, 180), 180, 180,
              os.path.join(PUBLIC, "apple-touch-icon.png"), NAVY)
    # PWA icons: 80% of the canvas leaves the maskable safe zone around the avatar.
    for size in (192, 512):
        padding = round(size * 0.8)
        rasterise(sized(read("nubi-avatar.svg"), padding, padding), size, size,
                  os.path.join(OUT, f"icon-{size}.png"), NAVY)
    rasterise(sized(crop(on_dark), 760, 214), 1200, 630, os.path.join(PUBLIC, "og.png"), NAVY)
    print("wrote", ", ".join(sorted(os.listdir(OUT))), "+ favicon.svg, apple-touch-icon.png, og.png")


if __name__ == "__main__":
    main()
