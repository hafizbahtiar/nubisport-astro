# Nubi Sport

Laman komuniti larian untuk pemula (newbie, est. 2026) - https://nubisport.hafizbahtiar.com.
Astro 7 (statik) + satu Worker kecil yang menghantar `/api/*` ke backend dikongsi
([hono-workers](../hono-workers), Hono + D1) melalui service binding. CSS biasa, tiada framework UI; ikon Lucide.

Peraturan untuk agent dan butiran teknikal: **`TODO.md` → "Penting"** (wajib baca dulu) dan `AGENTS.md`. Idea belum diputuskan: `IDEA.md`.

```sh
bun install
bun dev          # localhost:4321 (tanpa API)
bun run build    # dist/
```

Uji dengan API (lokal): dalam `hono-workers` jalankan `npx wrangler dev --port 8787`, kemudian di sini
`bun run build && npx wrangler dev --port 8790 --local-upstream localhost:8790`.

Push ke `main` = Cloudflare deploy ke production. Backend dideploy (dan migration remote dijalankan)
oleh owner, **sebelum** Nubi bila Nubi bergantung pada endpoint baru.

## Apa ada

| Laluan | Siapa | Isi |
|---|---|---|
| `/` | awam | Page utama: tentang, cara sertai, soalan lazim |
| `/pelan-5k` | awam | Pelan "5K bawah 30 minit" + label "Realistik ke?" + pemasa jalan-lari; had lembut 3 pelan dalam pelayar |
| `/maf` | awam | Kira had nadi MAF (formula 180 Maffetone) |
| `/pace` | awam | Kalkulator pace: masa ↔ pace, km/j, anggaran 5K-maraton (Riegel) |
| `/panduan` | awam | Panduan pemula (NHS, KKM) + senarai semak hari lumba boleh cetak |
| `/login`, `/register`, `/verify` | awam | Akaun dikongsi dengan hafizbahtiar.com (Turnstile) |
| `/account` | akaun | Dashboard: pelan saya (lencana **Awan** / **Peranti ini**, meter slot, Ganti), profil, MAF |
| `/account/pelan-5k` | akaun | Pelan 5K penuh: pecahan analisis, ikut nadi, kalendar `.ics`, simpan ke awan |
| `/account/pelan-jarak` | akaun | Pelan 10K / 21K (bertangga dari masa 5K / 10K, masa sasaran pilihan) |
| `/account/maf` | akaun | MAF + butang buat Pelan 5K ikut nadi |
| `/account/profil`, `/account/profil/kata-laluan` | akaun | Maklumat (nama) dan tukar kata laluan - card navigasi `ProfilShell` |

## Storan pelan

- Pelan dikira dalam pelayar (`src/lib/pelan-5k.ts`, `pelan-jarak.ts`). Pelayar = salinan kerja
  (`lib/pelan-tersimpan.ts`), jadi pelan berfungsi tanpa internet.
- **Awan**: akaun percuma simpan sehingga **3 pelan** (`lib/awan.ts` → `/api/v1/me/apps/nubi/plan`,
  migration 029 backend). Tanda siap disegerak (dikumpul 1.5 s), pelan muncul di peranti lain selepas
  log masuk. Had datang dari backend (`QUOTA`) - langganan nanti hanya menaikkannya
  (`docs/plans/simpan-awan.md`). Naikkan `VERSI_ENJIN` bila enjin pelan berubah.
- Had MAF terakhir (`maf:terakhir`) kekal dalam pelayar sahaja.

## Kandungan latihan

Pelan ialah panduan umum, bukan nasihat perubatan, dan **belum disemak jurulatih bertauliah** - setiap
page pelan menyatakannya. Semakan dalaman terhadap sumber awam (NHS Couch to 5K, Hal Higdon, Buist 2008,
Nielsen 2014, Riegel, Maffetone) + senarai semak untuk jurulatih: `docs/semakan-latihan.md`.

## Semakan

```sh
bunx tsc --noEmit -p .
bun scripts/check-pelan-5k.ts      # setiap gabungan input pelan 5K
bun scripts/check-pelan-jarak.ts   # pelan 10K / 21K (lonjakan larian panjang, tirus, analisis)
bun scripts/check-pemasa.ts        # segmen pemasa setiap sesi + kedudukan masa
bun scripts/check-pace.ts          # kalkulator pace + pautan pelan seterusnya
bun scripts/check-maf.ts
bun scripts/check-ics.ts           # fail kalendar RFC 5545
bun scripts/check-tarikh.ts        # DatePicker dd/mm/yyyy
bun run build
```

## Struktur

- `src/layouts/` - `Layout` (awam: Header + Footer), `AccountLayout` (sidebar akaun, satu-satunya pengawal
  sesi; nama/e-mel dilukis dari salinan `/me` sebelum lukisan pertama).
- `src/components/` - `Pelan5k`, `PelanJarak`, `Pemasa` (pemasa jalan-lari skrin penuh), `Maf`, `ProfilShell`; `ui/` = atom (`PageHero`, `Section`,
  `ChipGroup`, `Field`, `Checkbox`, `DatePicker`, `Alert`, `ConfirmDialog` + `lib/sahkan.ts`, `Sambungan` =
  notis luar talian, `Ikon` = ikon Lucide).
- `src/lib/` - `ikon.ts` (semua ikon UI = Lucide, `lucide-static`; tiada path SVG tulisan tangan), logik tulen (pelan, MAF, tarikh, ics), `api.ts` (fetch `/api/v1`, satu refresh dikongsi,
  salinan `/me` 5 min), `awan.ts`, `pelan-papar.ts` (HTML kad minggu dikongsi).
- `src/styles/` - `global.css` (token + atom), `pelan.css` (pelan dirender melalui `innerHTML`).
- `src/data/site.ts` - nama, pautan hubungan (**kosong hingga pautan sebenar wujud**), kunci tapak
  Turnstile, `NOTA_AWAN`.
- `worker.ts` + `wrangler.jsonc` - hanya `/api/*` menjalankan Worker; selainnya aset statik (percuma).
  `public/_headers` simpan `/_astro/*` setahun.
- `astro.config.mjs` - `site` (domain sebenar; `canonical` / `og:*` dibina darinya) dan prefetch hover.

## Jenama

Sumber: set SVG pereka dalam `scripts/brand/source/` (jangan edit). `python3 scripts/brand/gen.py` salin ke
`public/brand/` tanpa ubah dan terbitkan:

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
