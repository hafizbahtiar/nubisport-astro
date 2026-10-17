# Nubi Sport

Laman komuniti larian Nubi Sport (pemula / newbie, est. 2026). Astro, satu page statik, CSS biasa - tiada dependency lain.

```sh
bun install
bun dev        # localhost:4321
bun run build  # dist/
```

## Kandungan

- `src/pages/index.astro` - page utama (hero, tentang, cara sertai, soalan lazim, sertai).
- `astro.config.mjs` `site` - domain sebenar. **Selagi kosong, `canonical`, `og:url`, `og:image` tak dikeluarkan** (perlu URL penuh; domain rekaan merosakkan pratonton pautan WhatsApp/Facebook).
- `src/data/site.ts` - nama, tagline dan pautan hubungan. **Pautan WhatsApp/Instagram/e-mel muncul hanya bila diisi** - jangan letak URL contoh.
- `src/styles/global.css` - token warna dan atom (`.btn`, `.display`, `.eyebrow`).

## Jenama

Sumber: set SVG pereka dalam `scripts/brand/source/` (jangan edit). `python3 scripts/brand/gen.py` salin ke `public/brand/` tanpa ubah dan terbitkan:

- `logo-on-dark.svg` - `nubi-logo-reversed` tanpa latar navy tertanam, dipotong ke karya (header/hero).
- `symbol-on-dark.svg` - simbol dengan lorong navy jadi putih (footer).
- Jata: `nubi-crest-roundel{,-reversed,-black}.svg` disalin terus; hero guna `-reversed` (bulatan putih atas navy).
- `public/favicon.svg` (= `nubi-favicon.svg`), `apple-touch-icon.png` (dari avatar), `og.png` (logo reversed atas navy).

Tukar jenama = ganti fail dalam `source/`, jalankan skrip. PNG perlukan Chrome/Brave.

| Token | Hex | Guna |
|---|---|---|
| Navy | `#0A1A33` | latar, header, hero, footer, simbol |
| Oren | `#FF5A1F` | aksen, butang, jalur dalam simbol |
| Oren (teks atas putih) | `#C2410C` | label kecil atas latar putih (kontras AA) |

Karya asal (perisai neon + kasut) disimpan sebagai rujukan di `scripts/brand/original-*.png`.
