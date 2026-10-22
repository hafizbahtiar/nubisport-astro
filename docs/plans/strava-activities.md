# Pelan: import aktiviti dari fail Strava (FIT + GPX)

Status: **dibina** (2026-10-22): `/account/activities`, `lib/activity-file.ts`, semak
`bun scripts/check-activity-file.ts`. Belum diuji di pelayar dengan backend sebenar. Bahagian backend:
`hono-workers/docs/plans/nubi-activities.md` (jadual, R2, API, privasi, hasil ujian fail sebenar).

## Kenapa

Ahli nak larian mereka masuk dalam app, untuk kemajuan Pelan 5K dan jumlah mingguan. Nubi pula
nak data ini untuk analitik sendiri. Integrasi Strava terus (OAuth + API) ditolak sebab kos. Jadi
ahli **muat turun fail aktiviti dari Strava dan muat naik di sini**. Ringkasan disimpan kekal dalam D1. Fail asal
disimpan dalam R2 **sehingga ahli memadamnya**, sebagai data mentah untuk analitik.

## Siapa

**Ahli ke atas saja**: `nubi/ahli`, `nubi/admin` dan owner. Pengguna berdaftar yang belum ahli
nampak kotak "Ciri untuk ahli" dengan cara memohon, tanpa borang muat naik. Sekatan sebenar ada di
backend (403). Sekatan di frontend hanyalah untuk UX.

## Fail: satu aktiviti = FIT (wajib) + GPX (pilihan)

| Fail | Dari Strava | |
|---|---|---|
| **`.fit`** | aktiviti → **⋯** → *Export Original* | **wajib**: semua nilai ringkasan datang dari sini |
| `.gpx` | aktiviti → **⋯** → *Export GPX* | **pilihan**: disimpan untuk analitik, tak mengubah ringkasan |

- Kedua-dua fail ialah larian yang sama, dan **dipadankan ikut masa mula**. Dalam fail contoh,
  masanya sama tepat (`2026-10-21T13:12:07Z`).
- Dua zon seret-lepas (`.fit` wajib, `.gpx` pilihan) yang **mengumpul** fail: pilih FIT dulu, GPX
  kemudian (atau sebaliknya) tetap berpasangan. Fail masuk ikut sambungan, bukan zon. Banyak
  aktiviti sekali gus. Pelayar mengumpulkan semua fail ikut masa mula:
  - FIT saja: OK.
  - FIT + GPX yang sepadan: OK.
  - GPX tanpa FIT yang sepadan: ditolak dengan mesej "Perlukan fail .fit untuk aktiviti ini".
- Muat naik semula aktiviti yang sama mengemas kini rekod yang sama, jadi tiada pendua.

## Aliran

1. Halaman `/account/activities` dalam `AccountLayout`, dengan item sidebar baru.
2. **Cara muat turun**: langkah ringkas di atas.
3. **Persetujuan** (sekali, wajib sebelum muat naik pertama). Checkbox:

   > Saya faham fail asal (termasuk laluan GPS) disimpan dan digunakan untuk analitik Nubi secara
   > agregat. Saya boleh padam bila-bila masa.

   Disimpan di backend (`nubi.consent`), bukan localStorage.
4. Pilih fail. **Pelayar yang menghurai FIT** untuk ringkasan (`lib/activity-file.ts`). Pratonton untuk
   setiap aktiviti: tarikh, jenis, jarak, masa, pace, dan lencana "+ GPX" kalau ada GPX. Fail yang
   gagal atau GPX yang tiada pasangan disenaraikan dengan sebabnya.
5. Tekan "Import". **Satu aktiviti setiap request** (multipart: `fit`, `gpx` yang dah di-gzip, dan
   `summary`) ke `POST /api/v1/me/apps/nubi/activities`, dengan bar kemajuan. Keputusan: baru /
   dikemas kini.
6. **Senarai**: tapis 30 / 90 hari / semua, jumlah jarak dan masa minggu ini, dan jenis sukan.
   Padam satu aktiviti, atau "Padam semua data aktiviti saya", melalui `confirmDialog({ danger: true })`.
   Padam membuang ringkasan **dan fail** serta-merta.

## Penghurai (`lib/activity-file.ts`)

- **FIT**: `@garmin/fitsdk` (SDK rasmi Garmin, pakej baru). **Muat secara malas** dengan
  `await import("@garmin/fitsdk")` hanya di halaman ini.
  - `session.startTime`, `sport`, `totalDistance`, `totalTimerTime` (masa bergerak) dan
    `totalElapsedTime`.
  - Nadi purata dan maks, serta ketinggian naik, dikira dari `recordMesgs` (`heartRate`,
    `enhancedAltitude`). Session Strava tiada nilai ini.
  - Nama: dari GPX `<trk><name>` kalau ada, kalau tiada guna nama fail (`Night_Run.fit` → "Night Run").
- **GPX**: `DOMParser` (tiada pustaka). Baca masa mula (`<trkpt><time>` pertama) untuk padanan, dan
  `<trk><name>`. Kemudian gzip dengan `CompressionStream("gzip")` sebelum dihantar.
- Jenis → `run | walk | hike | ride | other`.
- Semakan: `bun scripts/check-activity-file.ts`. Gunakan fail contoh **tanpa lokasi rumah**, dan
  pastikan:
  - FIT memberi 2,663 m / 1,876 s / nadi 140 / 164;
  - GPX yang sepadan dipasangkan;
  - GPX yang tiada pasangan ditolak;
  - fail rosak ditolak.

## Teks yang perlu ada di halaman

- **Seksyen alert**: "Hanya fail dari Strava disokong. Fail dari app lain (Garmin, Coros dan
  lain-lain) mungkin tak dapat dipadankan atau nilainya kurang tepat."
- "Laluan GPS boleh mendedahkan alamat rumah. Tetapkan *privacy zones* di Strava sebelum eksport."
  Kesannya pada fail eksport belum disahkan, jadi jangan janji lebih dari itu.
- "Bukan sambungan terus ke Strava. Muat naik setiap aktiviti baru."
- Had: 5,000 aktiviti setiap ahli (respons 409 → "Had penuh").

## Halaman detail (`/account/activities/view?id=`)

Nama aktiviti dalam senarai = pautan. Halaman detail: peta laluan (MapLibre GL dimuat malas, gaya vektor
OpenFreeMap Positron - percuma, tiada kunci/had, atribusi wajib; tukar penyedia = tukar `GAYA`), penanda
mula/tamat, ringkasan 6 nilai, butang Padam. Laluan dilukis dari `.fit` asal (`GET …/:id/file`,
milik sendiri) dengan `fitRoute()` - tiada storan baru, aktiviti lama terus ada peta. Tiada GPS
(treadmill) = mesej, tiada peta. Peta hanya untuk ahli itu.

## Bukan v1

- Halaman analitik. Data dikumpul dari hari pertama, dan halaman dibina bila dah ada data (lihat pelan
  backend, "Analytics").
- Eksport pukal Strava (zip dengan `activities/*.fit.gz`): penghurai FIT yang sama, ditambah
  `DecompressionStream("gzip")`.
- Perkongsian dengan ahli lain dan leaderboard (ditolak, lihat `IDEA.md`).
- Kaitan dengan Pelan 5K, contohnya menandakan sesi siap secara automatik.
