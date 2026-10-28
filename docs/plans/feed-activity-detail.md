# Feed: buka detail aktiviti ahli lain

Status: **cadangan** (2026-10-28). Aktiviti sendiri dalam feed dah dipautkan ke
`/account/activities/view?id=` (tajuk kad). Dokumen ini untuk aktiviti **ahli lain**.

## Kenapa tak boleh guna page detail sedia ada

- `GET /me/apps/nubi/activities/:id` dan `/:id/file` dicari ikut `user.id` pemilik
  (`hono-workers/src/routes/v1/account/nubi-activities.ts`) - aktiviti orang lain = 404. Betul, jangan buka.
- Page detail dibina dari fail `.fit` asal. Fail itu ada laluan GPS penuh, setiap bacaan nadi, cuaca dan
  peranti. Hantar fail itu kepada ahli lain = memintas `shareHr` dan sempadan privasi feed
  (`hono-workers/src/services/nubi-feed.ts`: tiada fail asal, laluan hanya preview, tiada cuaca/split/nadi
  kecuali `shareHr`).
- Backend tiada parser FIT, jadi data awam mesti dikira **di pelayar pemilik** masa upload, macam `preview`.

## Reka bentuk

### Data (backend, migration baru)

Kolum baru `nubi_activities.shared_detail` (JSON, nullable), ditulis masa upload bila `visibility = members`:

| Medan | Isi | Had |
|---|---|---|
| `route` | `downsampledRoute(routeOf(rekod), 500)` (5 titik perpuluhan, sama dengan `preview`) | ≤ 500 titik |
| `splits` | `activitySplits(rekod)` - km, pace, ketinggian naik | ≤ 100 |
| `elevation` | profil ketinggian dijarangkan `[jarakM, m]` | ≤ 200 titik |
| `bestEfforts` | `bestEfforts(rekod)` (run saja) | ≤ 5 |
| `hr` | purata nadi setiap split - **hanya bila `shareHr`** | ≤ 100 |

Tak masuk: timestamp sebenar setiap titik, cuaca, kadens, peranti, fail asal.

Backend validate bentuk + had saiz (`validators/`), sama tegas dengan `preview`. Bila owner tukar
`visibility` ke private atau padam aktiviti, `shared_detail` ikut (dipadam / tak dipulangkan).

### API

`GET /me/apps/nubi/feed/:id` - `requireAppRole("nubi", "ahli", "admin")`, guna semula semakan
`visible()` dalam `nubi-feed.ts` (members, bukan sendiri, pengarang tak di-ban dan masih ahli). Pulang DTO
sama macam item feed + `sharedDetail`. Tak dapat dilihat = 404 yang sama untuk semua sebab (jangan bocor
wujud/tidak).

### Frontend

- Page baru `/account/feed/view?id=` - **baca saja**: kepala (nama pengarang, tarikh), statistik, peta 2D
  dari `route`, jadual split, profil ketinggian, best effort, nadi kalau ada, butang Sokong.
  Tiada: padam, pelan aktif, semakan sesi, animasi (tiada masa setiap titik), cuaca, 3D.
- Jangan tambah mod "orang lain" dalam `activities/view.astro` - page itu bergantung pada FIT dari awal
  hingga akhir. Guna semula fungsi dari `lib/` (split, pace, ketinggian), bukan page.
- Kad feed: tajuk + peta preview jadi pautan ke `/account/feed/view?id=` untuk aktiviti ahli lain.
- Upload (`activities/new.astro`): kira `sharedDetail` dari rekod yang dah dihurai, hantar dalam multipart
  yang sama dengan `preview`.

### Aktiviti lama

Aktiviti dikongsi sebelum migration tiada `shared_detail`. Page detail tunjuk preview + statistik saja dengan
nota "Detail penuh tak tersedia untuk aktiviti ini". Tiada backfill (backend tak boleh baca FIT).

## Keputusan owner (sebelum bina)

1. **Zon privasi mula/tamat**: laluan 500 titik lebih jelas daripada preview 150 - rumah pengarang lebih
   mudah dikenal. Cadangan: potong 200 m pertama dan terakhir dari `route` (dan `preview`) sebelum dihantar.
   Ya / tidak?
2. Profil ketinggian + split = cukup, atau perlu best effort juga?
3. `/privacy` mesti dikemas kini (data yang ahli lain nampak bertambah).

## Urutan

1. Backend: migration + validator + simpan `shared_detail` + `GET /feed/:id` + `verify-nubi-feed` (privasi:
   private/sendiri/bukan ahli/ban = 404; tiada `hr` bila `shareHr` off).
2. Deploy backend (owner) - backend lama tolak medan baru, jadi backend dulu, macam migration 041.
3. Frontend: hantar `sharedDetail` masa upload, page `/account/feed/view`, pautan kad, `/privacy`.
4. Semak: skrip `check-shared-detail.ts` (had saiz, tiada `hr` tanpa `shareHr`, potongan zon privasi).
