# Peta aktiviti: zoom, 3D dan terrain

Status: **dibina** (2026-10-22). **Pemilih gaya dibuang 2026-10-24** - satu peta Liberty + bukit, lihat
[map-improvements.md](./map-improvements.md). Halaman: `/account/activities/view` (MapLibre GL + OpenFreeMap).

Apa yang dibina (v2, 2026-10-22 - kawalan dalam kanvas, ganti ChipGroup "Jenis peta"):
- `cooperativeGestures: true` + teks bantuan MapLibre dalam BM (`locale`).
- Semua kawalan **dalam kanvas**, satu gaya (kumpulan `maplibregl-ctrl-group`, butang 44px, `:focus-visible` oren):
  - atas-kanan: **3D** (toggle, `aria-pressed`) + **Gaya peta** (ikon Layers, `aria-haspopup`/`aria-expanded`),
    kemudian **Skrin penuh** (`FullscreenControl`);
  - bawah-kanan: **Pusat semula** (LocateFixed: `fitBounds` laluan, bearing 0, pitch ikut mod 2D/3D) di atas
    zum +/− (`NavigationControl`, tanpa kompas - pusat semula kembalikan utara), atribusi paling bawah.
- 3D = pitch 60 pada gaya semasa (2D = pitch 0 + bearing 0). Bangunan 3D hanya bila gaya ada `fill-extrusion`
  (Terperinci/Liberty sahaja - disemak dengan curl). Terrain + 3D = relief; Terrain + 2D = hillshade sahaja.
- Pilih gaya = `<dialog>` di dalam bekas peta (kekal kelihatan dalam skrin penuh). Desktop: `show()` = popover
  di sebelah lajur kawalan; Esc / klik di luar / butang Tutup tutup. Telefon (`max-width: 40rem`): `showModal()` =
  bottom sheet (`:modal` - melekat di bawah viewport, pemegang, scrim, safe-area); fokus terperangkap + Esc +
  klik scrim secara native. Fokus kembali ke butang Gaya peta. Klik pilihan = tukar + tutup; anak panah papan
  kekunci = tukar (pratonton), kekal buka.
- Gaya (semua 200, tiada kunci API):

  | Pilihan | URL |
  |---|---|
  | Standard (lalai) | `https://tiles.openfreemap.org/styles/positron` |
  | Terperinci | `https://tiles.openfreemap.org/styles/liberty` (bangunan 3D) |
  | Cerah | `https://tiles.openfreemap.org/styles/bright` |
  | Gelap | `https://tiles.openfreemap.org/styles/dark` |
  | Fiord | `https://tiles.openfreemap.org/styles/fiord` |
  | Terrain | Positron + DEM Mapterhorn `https://tiles.mapterhorn.com/{z}/{x}/{y}.webp` |

  Satelit **tiada**: tiada sumber percuma tanpa kunci yang jelas boleh guna komersial (EOX s2cloudless 2018+ =
  CC BY-NC-SA; Esri World Imagery perlu akaun/syarat).
- Terrain: terrarium, tileSize 512, maxzoom 12 (z13 404 di KL), atribusi "© Mapterhorn". Dua sumber (`dem` untuk
  terrain, `dem-bukit` untuk hillshade). Exaggeration 1.5. Ganti: AWS Terrain Tiles (URL dalam komen kod).
- Tukar gaya = `setStyle(url, { diff: false })`; `style.load` lukis semula laluan (dan DEM). Penanda DOM kekal.
- Gaya / DEM gagal (`error` tanpa `sourceId` atau sumber `dem*`) = kembali Standard + mesej kecil.
- Diingat dalam localStorage (try/catch): `nubi/peta-gaya` + `nubi/peta-3d`; lalai Standard 2D. Kunci lama
  `nubi/peta-varian` diabaikan.
- **Nadi** (seksyen bawah ringkasan, tersembunyi jika fail tiada nadi): carta nadi ikut masa (SVG sebaris, garis
  oren) + masa dalam 5 zon ikut % nadi maks aktiviti (Z1 < 60, Z2 60-70, Z3 70-80, Z4 80-90, Z5 >= 90; asas dilabel).
  Dari record FIT yang sama dengan laluan - fail diambil dan diurai sekali (`fitRecords`, `routeOf`,
  `heartSeries`, `hrZones` dalam `src/lib/activity-file.ts`; semak `bun scripts/check-activity-file.ts`).
  MAF tidak digunakan: MAF = satu had atas, bukan 5 zon.
- Profil ketinggian: dibina (SVG, `altitudeSeries`). Penambahbaikan seterusnya: [map-improvements.md](./map-improvements.md).

## Boleh terus (kecil)

- **Zoom dalam kotak peta**: sekarang `scrollZoom: false` supaya halaman tak tersekat. Tukar ke
  `cooperativeGestures: true` - desktop: Ctrl/⌘ + scroll zoom dalam peta; telefon: dua jari. Butang
  +/− kekal. Tambah `FullscreenControl` untuk lihat peta besar.

## Varian peta (2D / 3D / Terrain)

Satu kawalan kecil di penjuru peta (ChipGroup / butang toggle): **2D**, **3D**, **Terrain**.

| Varian | Cara | Sumber | Kunci API |
|---|---|---|---|
| 2D (lalai) | Gaya Positron sekarang | OpenFreeMap | Tiada |
| 3D | `pitch` ~60°, bangunan 3D (`fill-extrusion`) | Gaya OpenFreeMap **Liberty** sudah ada bangunan 3D | Tiada |
| Terrain | `raster-dem` + `map.setTerrain({ exaggeration })` + lapisan `hillshade` | DEM Terrarium percuma: **Mapterhorn** (Copernicus GLO-30, global sehingga z12) atau **AWS Terrain Tiles** (Tilezen, `elevation-tiles-prod/terrarium`) | Tiada |

Nota pelaksanaan:
- `encoding: "terrarium"` wajib untuk kedua-dua sumber - salah encoding = permukaan bising, bukan ralat.
- Atribusi DEM wajib (USGS/SRTM/Copernicus mengikut sumber) - tambah pada `attribution` sumber.
- Laluan dalam mod terrain: lukis sebagai garis yang ikut permukaan (MapLibre buat sendiri bila
  terrain aktif) - semak penanda mula/tamat tak tenggelam.
- Ketinggian naik (`elevationGainM`) dah ada; mod terrain boleh tunjuk profil ketinggian kemudian
  (carta kecil di bawah peta, dari record FIT `altitude`).
- Ketersediaan: kedua-dua DEM percuma tanpa SLA. Simpan URL dalam satu pemalar; gagal muat = kekal 2D
  dengan mesej kecil.
- Prestasi: 3D/terrain berat pada telefon lama - lalai 2D; pilihan diingat dalam localStorage.

## Bukan sekarang

- Peta flyover/animasi laluan.
- Gaya gelap ikut tema (Nubi belum ada mod gelap).
