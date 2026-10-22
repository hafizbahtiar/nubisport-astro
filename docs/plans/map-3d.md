# Peta aktiviti: zoom, 3D dan terrain

Status: **dibina** (2026-10-22). Halaman: `/account/activities/view` (MapLibre GL + OpenFreeMap).

Apa yang dibina (dan beza dari rancangan):
- `cooperativeGestures: true` + teks bantuan MapLibre dalam BM (`locale`), `NavigationControl` (kini dengan
  kompas/pitch untuk 3D) + `FullscreenControl`.
- Pilihan **2D / 3D / Terrain** = `ChipGroup` (radio, legend "Jenis peta") **di atas** peta, bukan di
  penjuru. Diingat dalam localStorage `nubi/peta-varian` (try/catch), lalai 2D.
- 3D = gaya `https://tiles.openfreemap.org/styles/liberty` (lapisan `building-3d`), pitch 60. Tiada gaya "3d"
  berasingan di OpenFreeMap.
- Terrain = asas Positron + DEM **Mapterhorn** `https://tiles.mapterhorn.com/{z}/{x}/{y}.webp` (terrarium,
  tileSize 512, maxzoom 12 - z13 404 di KL), atribusi "© Mapterhorn" (pautan ke mapterhorn.com/attribution,
  sama seperti TileJSON mereka). Dua sumber (`dem` untuk terrain, `dem-bukit` untuk hillshade - amaran
  MapLibre kalau dikongsi). Exaggeration 1.5, pitch 60. Ganti: AWS Terrain Tiles (URL dalam komen kod).
- Tukar gaya = `setStyle(url, { diff: false })`; `style.load` lukis semula laluan (dan DEM). Penanda DOM kekal.
- Gaya 3D / DEM gagal (`error` tanpa `sourceId` atau sumber `dem*`) = kembali 2D + mesej kecil. Pilihan
  tersimpan tak ditukar (cuba lagi lain kali).
- Profil ketinggian belum dibuat.

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
