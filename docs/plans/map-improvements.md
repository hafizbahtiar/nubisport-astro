# Peta aktiviti: penambahbaikan (selepas map-3d)

Status: **cadangan** (2026-10-24). Asas yang sudah dibina: [map-3d.md](./map-3d.md) (MapLibre GL 6.15 +
OpenFreeMap + DEM Mapterhorn, 3D, terrain, profil ketinggian, animasi laluan).

## Intermap (kredit "intermap.com" di peta Strava) - disemak 2026-10-24

- **Apa:** Intermap Technologies (Kanada) = pembekal data ketinggian komersial dari radar udara.
  Produk utama **NEXTMap** (NEXTMap One: DSM/DTM 1 m; NEXTMap World 30: 30 m global). Pelanggan:
  kerajaan, insurans, penerbangan, telekom. Pernah dilesen kepada Garmin dan Tele Atlas.
- **Kenapa ada di Strava:** peta Strava dibina atas Mapbox; Mapbox menyebut data terrain global
  Strava datang dari Intermap dan lebih 10 sumber lain. Kredit itu untuk **hillshade/terrain**, bukan
  jalan atau label.
- **Boleh guna untuk Nubi? Tidak (buat masa ini):**
  - Tiada API tile web layan diri, tiada pakej percuma, tiada harga awam. Laman Intermap hanya ada
    "Schedule Personalized Demo" / hubungi jualan. NEXTMap One dijual melalui UP42 (marketplace data,
    tiada harga pada dokumentasi). Ini lesen data enterprise, bukan perkhidmatan peta.
  - Strava dapat melalui Mapbox (berbayar, ada kunci API). Nubi sengaja guna sumber tanpa kunci.
  - Kita **sudah ada data setaraf** untuk Malaysia: Mapterhorn di Malaysia = **Copernicus GLO-30**
    (30 m, lesen "Copernicus full, free and open"; disemak dalam
    `download.mapterhorn.com/attribution.json`, tiada sumber khusus Malaysia/Asia Tenggara). Sama kelas
    dengan NEXTMap World 30. Beza sebenar hanya NEXTMap One 1 m - tidak berbaloi untuk laluan larian.
- **Kesimpulan:** rupa "Strava" datang dari cara terrain dilukis (hillshade halus, kontur, warna
  laluan), bukan dari data Intermap. Itu semua boleh dibuat dengan DEM yang kita ada.

## Vantor (kredit "vantor.com" di peta Strava) - disemak 2026-10-24

- **Apa:** Vantor = nama baharu **Maxar Intelligence** (Oktober 2025, selepas Maxar dipecah kepada
  Vantor + Lanteris). Pembekal imej satelit komersial (WorldView, basemap **Vivid** 15/30 cm, terrain
  3D, platform Tensorglobe). Pelanggan utama: perisikan/pertahanan AS, kerajaan, perusahaan.
- **Kenapa ada di Strava:** lapisan **satelit** Strava = Mapbox Satellite. Mapbox guna Maxar (kini
  Vantor) untuk kebanyakan liputan dunia: z9-12 sumber utama, z13-16 produk Vivid. Kredit itu untuk
  imej satelit, bukan jalan.
- **Boleh guna untuk Nubi? Tidak terus:**
  - Tiada API tile web layan diri / harga awam - hanya "Contact Us" dan Vantor Hub (tiada syarat awam).
  - **Vantor Open Data Program** (AWS Open Data) = **CC BY-NC 4.0** (bukan komersial) dan hanya imej
    sebelum/selepas bencana di kawasan tertentu, bukan basemap global. Tidak sesuai.
  - Jalan sebenar ke imej Vantor = **Mapbox Satellite** (token Mapbox, kuota percuma kemudian
    berbayar, ikut terma Mapbox). Ini satu-satunya pilihan realistik jika satelit benar-benar mahu.
- **Kesimpulan:** satelit kekal "bukan sekarang" (sama seperti map-3d.md). Jika mahu kemudian:
  pilihan "Satelit" bergantung token Mapbox, dimuat hanya bila dipilih, atribusi Mapbox + Vantor
  wajib; sahkan dulu terma Mapbox untuk tile raster dalam MapLibre dan kos ikut jumlah paparan.

## Cadangan (ikut nilai / kos)

### 1. Laluan berwarna ikut pace / nadi / kecerunan - kecil, nilai tertinggi

**Dibina (2026-10-24): Pace sahaja.** Butang toggle **Pace** di sebelah 3D (bukan dalam dialog Gaya peta -
dua pilihan tak perlu dialog), diingat `nubi/peta-warna`. `paceGradient(track)` dalam
`src/lib/activity-file.ts` (hentian 100 m, skala persentil 5-95, biru perlahan -> kuning -> merah laju;
semak `bun scripts/check-activity-file.ts`). Legenda atas-kiri dengan pace laju/perlahan dalam teks. Tiada
track (tiada masa GPS) = butang tiada. Nadi / Cerun: belum - fungsi warna lain atas hentian yang sama.

- MapLibre `line-gradient` (sumber GeoJSON dengan `lineMetrics: true`); warna diinterpolasi ikut
  `line-progress` (0..1 sepanjang laluan).
- Data sudah ada dalam record FIT yang sama (`fitRecords` -> jarak, masa, nadi, altitude). Kira
  hentian warna setiap ~100 m: pace (min/km), nadi (zon Z1-Z5 yang sedia ada) atau kecerunan (%).
- Kawalan: satu pilihan "Warna laluan: Biasa / Pace / Nadi / Cerun" dalam dialog Gaya peta yang sedia
  ada; diingat dalam localStorage (`nubi/peta-warna`, try/catch seperti kunci lain).
- Legenda kecil (min - maks) di bawah peta; warna mesti ada label teks (bukan warna sahaja).
- Nadi tiada dalam fail = pilihan Nadi disembunyikan.

### 2. Garis kontur - sederhana, paling dekat dengan rupa Strava

- `maplibre-contour` 0.1.1 (BSD-3-Clause, npm 2026-09-17): lukis kontur dari tile raster-dem di
  pelayar (web worker), **sumber DEM Mapterhorn yang sama** - tiada sumber/kunci baharu.
- Sasaran: kontur 10 m (z14+), 50 m (z12-13), label ketinggian pada garis utama; warna coklat lembut,
  di bawah garis laluan.
- **Sahkan dulu (spike):** kesesuaian dengan `maplibre-gl` 6.x (pakej tiada `peerDependencies`;
  uji `addProtocol`), saiz bundle (unpacked ~570 KB - mesti dimuat malas bersama maplibre, hanya bila
  kontur dihidupkan), kualiti 30 m di kawasan rata (KL) - kontur rata mungkin bising; mungkin hanya
  tunjuk dalam gaya Terrain.
- Mapterhorn maxzoom 12: kontur di z14+ = overzoom (interpolasi), cukup untuk 10 m tetapi tidak
  lebih halus.

### 3. Profil ketinggian <-> peta (hover / sentuh) - kecil

**Dibina (2026-10-24), satu arah: profil -> peta.** Tetikus / seret mendatar (`touch-action: pan-y`) /
anak panah (2% jarak, Esc sembunyi) pada profil = garis penunjuk + bacaan "km · m" (`aria-live`) + titik
oren di peta (`penunjukPeta`, hanya bila ada track). Peta -> profil: belum (nilai kecil).

- Profil ketinggian sudah ada (SVG). Tambah: gerak penunjuk di profil = titik bergerak di laluan
  (`Marker` sedia ada), dan sebaliknya. Papan kekunci: anak panah gerak penunjuk.
- Data: indeks jarak yang sama dengan `altitudeSeries`.

### 4. Hillshade lebih halus - sangat kecil

**Dibina (2026-10-24):** exaggeration 0.35, cahaya 315°, bayang navy 35%, sorotan putih 30% (gaya Terrain
sahaja; hillshade pada Standard tidak dibuat).

- Gaya Terrain sekarang: hillshade standard. Laras `hillshade-exaggeration` (~0.3-0.4),
  `hillshade-shadow-color` lebih lembut dan `hillshade-illumination-direction` 315 supaya tidak
  menenggelamkan laluan. Boleh juga hillshade nipis pada gaya Standard (pilihan, uji kontras).

## Bukan sekarang

- **Intermap / NEXTMap / Mapbox terrain**: lesen berbayar + kunci; tiada keperluan (lihat di atas).
- **Satelit (Vantor/Maxar)**: tiada sumber percuma tanpa kunci untuk guna komersial; Vantor Open Data =
  CC BY-NC + bencana sahaja. Satu-satunya jalan = Mapbox Satellite (token, berbayar selepas kuota) - lihat di atas.
- **Heatmap semua aktiviti ahli**: perlu banyak fail .fit dimuat di pelayar atau ringkasan laluan di
  server (data peribadi, privasi). Rancang berasingan jika perlu.
- **Hos tile sendiri** (Mapterhorn/OpenFreeMap PMTiles di R2): hanya jika tile awam lambat atau hilang;
  kedua-duanya tiada SLA. Pelan sandaran sudah ada (AWS Terrain Tiles dalam komen kod).

## Rujukan

- Mapbox, "Strava maps for runners and cyclists" (terrain Strava dari Intermap + >10 sumber).
- Intermap: https://www.intermap.com (produk; tiada harga/API awam).
- UP42 NEXTMap: https://docs.up42.com/data/nextmap
- Mapterhorn sumber: https://download.mapterhorn.com/attribution.json (`glo30`).
- Vantor: https://vantor.com ; Open Data: https://registry.opendata.aws/vantor-open-data/
- Mapbox Satellite sumber: https://docs.mapbox.com/data/tilesets/reference/mapbox-satellite
- maplibre-contour: https://www.npmjs.com/package/maplibre-contour
