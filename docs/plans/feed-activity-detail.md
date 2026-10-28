# Feed: buka detail aktiviti ahli lain (macam Strava)

Status: **dibina** (2026-10-28), belum deploy. Owner pilih laluan penuh (tiada potongan zon privasi
mula/tamat - pengguna guna privacy zones Strava, `/privacy` menyebutnya).

## Cara ia berfungsi

- Tajuk kad feed = pautan. Aktiviti sendiri -> `/account/activities/view?id=`; ahli lain ->
  `/account/activities/view?id=<id>&source=feed` (page yang sama, mod baca saja).
- Fail `.fit` asal tak pernah dihantar kepada ahli lain (ada cuaca, peranti, nadi setiap saat). Pelayar pemilik
  buat **salinan rekod** (`sharedRecords` dalam `lib/activity-file.ts`): 11 medan, lajur sama panjang -
  `timestamp, positionLat, positionLong, distance, altitude, enhancedAltitude, speed, enhancedSpeed, cadence,
  fractionalCadence, heartRate`. Dihantar `PUT /me/apps/nubi/activities/:id/shared` bila:
  - muat naik dengan "Kongsi ke feed ahli" ditanda (`activities/new.astro`), atau
  - pemilik hidupkan kongsi di page detail (dari private -> members).
- Backend simpan di R2 `nubi/activities/u<id>/<stamp>.shared.json` (tiada migration). Padam aktiviti / padam semua
  data = salinan ikut dipadam.
- `GET /me/apps/nubi/feed/:id` (item feed + `elapsedS`) dan `GET /me/apps/nubi/feed/:id/records` - peraturan
  sama dengan feed (`SHARED` dalam `services/nubi-feed.ts`), satu 404 untuk semua sebab. `heartRate` dibuang masa
  dihidang bila `shareHr` off - tukar tetapan nadi berkuat kuasa serta-merta tanpa muat naik semula.
- Page detail (`source=feed`): `recordsFromShared` -> rekod bentuk FIT, jadi peta, animasi, split, best effort,
  GAP, kadens, ketinggian, nadi (kalau dikongsi) guna fungsi yang sama. Disembunyikan: Padam, panel kongsi,
  padanan pelan / semakan sesi, cuaca, kalori, % lari. Pengarang dalam baris tarikh; pautan balik ke Feed.

## Had

- Aktiviti dikongsi sebelum ciri ini tiada salinan -> detail tunjuk ringkasan + mesej "Laluan dan split tak
  tersedia". Pemilik boleh buka aktiviti, matikan dan hidupkan semula kongsi untuk menghantar salinan.
- Aktiviti > 50,000 rekod (~14 j pada 1 s) tiada salinan (`shortcut:` dalam `sharedRecords`).
- Tiada kudos di page detail (ada di feed).

## Deploy (owner)

Backend dulu (route baru), kemudian frontend. Tiada migration. Semak:
`bun scripts/check-activity-file.ts`, backend `bun scripts/verify-nubi-feed.ts` (13 semakan).
