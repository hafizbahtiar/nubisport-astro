# TODO - Nubi Sport

Laman komuniti larian untuk pemula (`nubisport.hafizbahtiar.com`). Astro 7, statik buat masa ini.
Push ke `main` (GitHub `hafizbahtiar/nubisport-astro`) = Cloudflare auto deploy.
Backend dikongsi dengan portfolio: `/Users/hafiz/Developments/hono-workers` (Hono + D1).
Item yang dah siap dibuang (lihat git history).

---

## ⚠️ Penting - baca dulu (untuk agent lain)

- **Jangan jalankan apa-apa remote** (`db:migrate:remote`, `wrangler deploy`, secret) dan **jangan push**
  tanpa diminta - push terus deploy ke production. Itu kerja owner.
- **Jenama**: sumber ialah SVG pereka dalam `scripts/brand/source/` - jangan edit. Tukar logo = ganti
  fail di situ, jalankan `python3 scripts/brand/gen.py`. Jangan edit `public/brand/`, `favicon.svg`,
  `apple-touch-icon.png`, `og.png` dengan tangan.
- **Domain** ada di `astro.config.mjs` `site`. `canonical` / `og:*` dibina dari situ - jangan tulis URL
  penuh dengan tangan.
- **Hubungan** (`src/data/site.ts` `CONTACT`): e-mel `hafiz@hafizbahtiar.com`; WhatsApp/Instagram biar `""` sampai pautan sebenar wujud.
- **Peranan**: akses Nubi diurus owner di portfolio `/admin/app-access` (backend `/owner/apps/*`,
  migration 025). Endpoint Nubi baru wajib guna `requireAppRole("nubi", ...)` di backend - jangan
  semak peranan di frontend saja. Peranan baru (contoh `coach`) = migration baru di backend, bukan halaman.
- **API = `/api/*` di domain sendiri** melalui service binding (`wrangler.jsonc` `services` -> Worker
  `hono-workers`, `worker.ts` hanya forward). Panggil `fetch("/api/v1/...")` - same-origin, tiada CORS,
  cookie login melekat pada `nubisport.hafizbahtiar.com`. Akaun dikongsi dengan portfolio (satu jadual
  `users`), tapi sesi login berasingan (cookie ikut domain). Semua laluan lain = aset statik `dist/`.
- **Uji lokal**: `npx wrangler dev --port 8787` dalam `hono-workers`, kemudian di sini `bun run build &&
  npx wrangler dev --port 8790 --local-upstream localhost:8790` - binding bersambung sendiri. Tanpa
  `--local-upstream`, wrangler tulis semula `Origin` ke `http://nubisport.hafizbahtiar.com` dan CSRF backend
  tolak semua POST (403). `.dev.vars` backend mesti ada `ALLOWED_ORIGINS=http://localhost:8790`.
- **Asas UI**: `src/styles/global.css` (token, asas, butang `.btn-*`, kad, alert, `.surface-dark`, `.prose`,
  `.back-link`, `.grid-cards`/`.card-grid`, `[hidden]` menang), `forms.css` (borang `.form/.field/.input/.chips/.check`,
  `.form-narrow`, `.form-grid`), `overlays.css` (DatePicker/TimePicker/Dropdown), `panel.css` (`.stat/.panel`, diimport
  oleh `AccountLayout`), `plan.css` (hasil pelan + `.plan-form`). Komponen
  `src/components/ui/`: `PageHero` (kepala halaman gelap + slot borang), `Section`, `ChipGroup` (radio pil,
  `stacked` untuk label panjang), `Checkbox` (kelas `.check`; medan bergantung = `<fieldset class="form-group"
  hidden disabled>` ditogol skrip), `Field` (label + input + petunjuk; `for` untuk kawalan berbilang
  elemen), `Alert`, `DatePicker` (dd/mm/yyyy + kalendar, hantar ISO dari input tersembunyi `id`/`name`;
  isi dari skrip = set nilai + `change`; logik `src/lib/date.ts`, semak `bun scripts/check-date.ts`).
  Jangan guna `<input type="date">` - format ikut locale pelayar, bukan dd/mm/yyyy.
  **Ikon = Lucide saja** (`lucide-static`): `<Icon name="..." />` dalam Astro, `icon("...")` dalam skrip
  (`src/lib/icon.ts` - daftar ikon baru di situ). Jangan lukis path SVG sendiri; pengecualian = jenama dan
  tanda semak `.check` (path Lucide `check` dalam CSS). `Layout.astro` dah ada
  `Header` + `<main>` + `Footer` (`src/components/layout/`) - halaman hanya tulis kandungan. HTML dari skrip
  (`innerHTML`) guna kelas global yang sama. Jangan buat warna/butang baru dalam halaman - tambah ke global.
  Formatter memecah baris sebelum `<strong>`/`<a>` dan Astro buang ruang itu - tulis `{" "}` di hujung baris.
- **Bahasa UI = BM Malaysia santai** (2026-10-22, kata owner: "jangan terlalu baku sebab ni larian, sport.
  even formal perlu relax") - Bahasa Melayu Malaysia yang mesra dan jelas, macam kelab larian bercakap; bukan
  surat kerajaan, bukan bahasa Indonesia, bukan slanga chat. Huruf besar di awal ayat saja, jangan banyak tanda
  seru. Ralat = apa yang jadi + apa nak buat ("Tak dapat simpan sekarang. Cuba lagi sekejap."). Teks privasi,
  persetujuan dan amaran padam kekal sopan dan tepat, tapi tetap santai. Satu perkataan, satu bentuk - guna sama
  di semua halaman, alert, label butang, `aria-label`, placeholder, `.ics`:
  | Guna | Bukan |
  |---|---|
  | tak, dah, dulu, nak, bila, kalau, tapi, lepas, sekejap, sebab, saja, baru | tidak, sudah/telah, dahulu, mahu/hendak, apabila, jika, tetapi, selepas, sebentar, kerana, sahaja, baharu |
  | Tak apa. | Tidak mengapa. |
  | tak dapat simpan / hantar / tukar / daftar | tidak dapat menyimpan / menghantar / menukar / mendaftar |
  | perlukan, guna, beri, cadangkan | memerlukan, menggunakan, memberi, mencadangkan (bila kata dasar cukup jelas) |
  | Sesuai lari hari ini? / Realistik tak? | Sesuaikah berlari hari ini? / Realistikkah? |
  | Ulang kata laluan | Sahkan kata laluan |
  | Dashboard | papan pemuka |
  | halaman | page |
  | muat naik / muat turun | upload / download |
  | fail | file |
  | simpan / padam / kongsi / cetak | save / delete / share / print |
  | aplikasi | app |
  | pentadbir / pemilik | admin / owner (label UI; nilai peranan dalam kod kekal `admin`/`owner`) |
  | anda | awak, kau, korang |
  | aktiviti, larian, sesi, pelan | - |
  Elak: "bro", "lah" berlebihan, singkatan chat ("x", "nk", "dgn"), English bila ada perkataan Melayu biasa.
  "jom" boleh, sekali-sekala (contoh 404). Kekal English: **Dashboard**, **pace** (bukan "rentak" - "rentak"
  hanya untuk rasa, contoh "rentak santai"), tempo, interval, fartlek, joging, bib, 5K/10K/21K, MAF. Label rasmi
  luar kekal seperti sumber (band IPU JAS "Tidak sihat" / "Sangat tidak sihat"). Jenama dan format kekal: Strava,
  Garmin, Nubi Sport, FIT, GPX, label menu Strava ("Export Original"). Unit kekal: km, m, bpm, min.
  Kunci data (`nubi/consent/aktiviti`, `nubi/plan`, `pelan-5k:...`, UID `.ics` `lumba-<id>`, nilai
  `tak-realistik`, param URL `mula`/`bulan`/`tahap`) jangan diterjemah.
  **Nama fail/URL/eksport = English** (2026-10-22): route dan fail baharu guna English (contoh
  `/account/plans`, `plans/5k/new`, `plans/5k/view`, `plan-list.ts`, `SavedPlan.key/kind/name/detail`).
  **Nama kod = English**: fungsi, jenis dan pemalar yang dieksport dari `src/lib/*.ts` / `src/data/*.ts`
  (contoh `buildPlan`, `sessionDate`, `matchActivities`, `ENGINE_VERSION`, `Week`, `Level`). Medan yang disimpan
  atau dihantar (payload awan, JSON localStorage, param URL, token tanda siap) dan nilai union yang masuk ke data
  (`"sifar"`, `"jalan-lari"`, `"tak-realistik"`) kekal Melayu - jangan tukar.
- **Login** (`/login`): `src/lib/api.ts` (`api()` = `/api/v1` + satu refresh dikongsi bila 401, `fetchMe()` =
  `/me` kalau cookie `session_active`). Turnstile widget yang sama dengan portfolio (kunci tapak dalam
  `src/data/site.ts`, action `login`). Daftar di `/register`, urus profil di `/account/profile`. Bila log masuk, Header awam tunjuk avatar
  (`UserMenu`: Dashboard, Profil & tetapan, Log keluar) ganti "Log masuk". Kebenaran sebenar sentiasa di backend.
- **Penafian / info**: setiap halaman pelan ada "bukan nasihat perubatan" + "belum disemak jurulatih bertauliah"
  (`docs/training-review.md`); login/daftar menyebut had awan (1, ahli 5). Tukar teks itu bila had atau status semakan berubah.
- **Daftar / sahkan** (`/register`, `/verify`): daftar hantar `app: "nubi"`, jadi pautan e-mel ke
  `nubisport.hafizbahtiar.com/verify`. Alamat pautan datang dari senarai `APP_SITES` di backend
  (`services/registration.ts`) - laman baru = entri baru di situ; URL tak pernah diterima dari klien
  (kod app tak dikenali = 400). Hantar semula pautan hanya dari `/verify` (Turnstile action `register`).
- **Ahli ≠ berdaftar**: ahli = peranan app `nubi/ahli` (migration 026), diluluskan owner/admin di
  portfolio `/admin/app-access`. Berdaftar + disahkan saja = "Pengguna berdaftar - belum ahli".
- **Peranan app segar**: `currentUser()` sentiasa `GET /me` (`cache: no-store`) pada setiap page load;
  sessionStorage hanya untuk lukisan pertama (sidebar + header di-paint sebelum paint, tiada loading
  state). Jangan pulangkan cache 5 min untuk peranan - perubahan ahli/admin mesti nampak selepas
  refresh/log masuk semula.
- **Kalendar** (`src/lib/ics.ts`, generik - guna semula untuk 10K/21K): `.ics` RFC 5545, masa Malaysia
  (UTC+8) disimpan UTC, UID tetap `pelan-5k-<kunci>-m<w>s<i>@nubisport.hafizbahtiar.com`, peringatan
  30 min. Semak `bun scripts/check-ics.ts`.
- **Had pelan tanpa akaun**: 3 pelan berbeza (`GUEST_PLAN_LIMIT`, localStorage `pelan-5k:dibuat`; buka
  semula tak dikira; `session_active=1` = tiada had). Had LEMBUT saja (incognito memintas) - had
  keras perlu pelan dijana di server.
- **Akaun (`/account/*`)**: `AccountLayout.astro` - sidebar (laci bawah 64rem: Esc / scrim tutup), navbar,
  kandungan lebar penuh. Layout = satu-satunya pengawal sesi (tiada sesi -> `/login?next=`); halaman ambil
  pengguna dengan `currentUser()` (`lib/api.ts`, satu /me dikongsi). `/login` lencong ke `?next=` (laluan
  dalaman saja, `internalPath` dalam `lib/api.ts` - semak origin dengan `URL`, bukan regex) atau `/account`. Sidebar berkumpulan (`NAV`: Utama / Latihan / Akaun); item `members: true`
  (contoh Aktiviti) tersembunyi bagi bukan ahli. Profil + log keluar dalam `components/ui/UserMenu.astro`
  (bawah sidebar `up`, navbar akaun, Header awam) - satu komponen, jangan buat menu lain. `<head>` dikongsi = `Head.astro`.
- **CSP ketat** (`scripts/security-headers.ts`, jalan dalam `bun run build`): skrip sebaris di-hash automatik, tapi
  sumber luar baru (skrip, `fetch`, tile, font) dan handler sebaris baru (`onclick=` selain `print()`) DISEKAT
  sampai ditambah dalam skrip itu. Guna `addEventListener`, bukan atribut `on*`.
  Item yang dijana skrip perlu `:global(...)` dalam `<style>` halaman (tiada atribut skop Astro).
- **Pelan 5K awam vs penuh**: `components/Plan5k.astro` (kandungan saja; halaman pilih layout).
  `/plan-5k` = pelan + label "Realistik tak?" + kotak promosi; log masuk -> `/account/plans/5k/new`
  (`full`: pecahan analisis, ikut nadi MAF, .ics, tiada had 3 pelan). Sekatan di pelayar saja.
  Storan pelan = `lib/saved-plans.ts` (`readList`/`writeList`/`deletePlan`) + awan (`lib/cloud-sync.ts`).
  Padam pelan: Dashboard + pelan penuh saja (di awam ia membuka semula slot had 3 pelan).
- **Kemas kini pelan** (2026-10-22): buka pelan dari dashboard (URL bawa `kunci`), ubah masa/pace/tarikh pada borang, tekan "Kemas kini pelan" - params ditulis bawah kunci yang sama (progress/awan/aktif kekal), tanda siap sesi yang dah tiada dipangkas, dan pelan yang sudah di awan dihantar semula. "Buat pelan" di `/new` mencipta pelan baru dalam page (submit, tiada muat semula) - link berparam hanya mengisi borang, tak pernah mencipta. View hanya buka kunci yang ada dalam senarai pelan (`savedPlanParams`); kunci asing/tiada -> `/account/plans`. Kunci jadi pengecam - nilai di dalam teksnya mungkin lama. Semak: `bun scripts/check-plan-update.ts`.
- **Akaun lain**: `/account/maf` (`components/Maf.astro full`: simpan `maf:terakhir` untuk Dashboard + butang
  Pelan 5K ikut nadi; `/maf` lencong ke situ bila log masuk), `/account/profile` (Maklumat: nama,
  username, bio, lokasi, profil awam `PATCH /me`; Zon bahaya: padam akaun `DELETE /me` dengan kata laluan dalam
  `confirmDialog({ passwordLabel, action })`, lepas itu `localStorage.clear()` -> `/?akaun=dipadam`) +
  `/account/profile/password` (`PUT /me/password` - tamatkan semua sesi); navigasi = card dalam `components/ProfileShell.astro` (tab segmen bawah 48rem). Sidebar: X tutup laci (telefon) / lipat (desktop, `akaun:sidebar`).
- **Simpan awan**: had ikut peranan - percuma 1, ahli 5, admin/owner 10 (`lib/cloud-sync.ts`, backend `/me/apps/nubi/plan`, migration 029).
  Pelayar = salinan kerja, awan = ikut akaun; Dashboard: lencana Awan / Peranti ini, meter slot, "Ganti"
  bila penuh. Naikkan `ENGINE_VERSION` bila enjin pelan berubah. Langganan: `docs/plans/cloud-sync.md`.
- **Aktiviti** (`/account/activities`, ahli ke atas): fail Strava `.fit` (wajib) + `.gpx` (pilihan) dihurai
  **di pelayar** (`lib/activity-file.ts`; SDK `@garmin/fitsdk` dimuat malas, lesen FIT Protocol Garmin),
  dipadankan ikut masa mula, satu POST multipart setiap aktiviti ke `/me/apps/nubi/activities`.
  Persetujuan sebaris dengan Simpan (`nubi/consent/aktiviti`). Detail + peta: `/account/activities/view?id=` (MapLibre malas, laluan dari `.fit` asal; 2D Positron / 3D
  Liberty (OpenFreeMap) / Terrain (DEM Mapterhorn), zoom Ctrl/⌘+skrol atau dua jari, skrin penuh;
  `docs/plans/map-3d.md`). Nama aktiviti = `textContent` saja. "Padam semua data aktiviti" ada di
  Profil > Keselamatan (Zon bahaya), bukan halaman Aktiviti. Detail: split setiap km (KM/Pace/Elev +
  bar) di sebelah peta pada desktop, bawah peta pada telefon; card Cuaca berasingan (suhu, rasa macam,
  kelembapan, angin, arah) bila fail FIT ada `weather_conditions`. Backend + R2:
  `hono-workers/docs/plans/nubi-activities.md`. Pelan: `docs/plans/strava-activities.md`.
- **Rekod & ramalan** (2026-10-24): detail aktiviti ada split setiap km + best effort 1K/5K/10K/21K/42K
  dari rekod FIT (`lib/activity-analysis.ts`, `activitySplits`/`bestEfforts`); `/account/activities` ada
  panel "Rekod & ramalan" - PR 5K/10K/21K/42K dari ringkasan D1 + Riegel (`lib/activity-records.ts`),
  label anggaran. PR tepat (best effort dalam larian, bukan pace purata) perlu simpan masa upload +
  migration backend; belum. Semak: `check-session-analysis`, `check-activity-records`.
- **Pelan aktif** (2026-10-22, ahli): satu pelan awan bertarikh mula = `app_items` `nubi/active/plan`
  (`data.plan` = kunci). `lib/plan-sync.ts`: `matchActivities` (tulen, `bun scripts/check-plan-sync.ts`) tanda sesi
  siap dari aktiviti Strava (hanya menambah, enjin mesti `ENGINE_VERSION`); butang "Jadikan pelan aktif" di page
  pelan, panel dashboard, mesej lepas muat naik, baris "Sesi pelan" di detail. Padanan (2026-10-22, v2): mana-mana sesi
  belum siap dalam minggu pelan sama (Isnin-Ahad, hari sama dahulu, kemudian paling hampir); `runRatio` (kadens >= 140
  langkah/min, dari `.fit`, migration 033) mesti >= 0.7 untuk sesi lari, >= 0.15 untuk jalan-lari - kalau gagal sebab
  itu saja, mesej `walkedNote` ("kebanyakannya jalan"). Butang "Sync aktiviti" di page pelan (pelan
  aktif) dan dashboard memanggil `syncActivePlan()` - padankan semula semua aktiviti sejak tarikh mula,
  selamat ditekan berulang (hanya menambah). Spec: `docs/plans/active-plan-sync.md`.
- **Pelan v2** (2026-10-22, `docs/plans/training-plan-v2.md`): param `lumba` (tarikh lumba) -> `racePlan` kira
  `minggu` + `mula` dan tulis ke URL (pelan tak berubah bila dibuka minggu lain); 5K `minggu` 8-24 (kunci `pelan-5k:<N>w-...`),
  10K/21K mana-mana minggu dalam julat pilihan (10K 8-16, lalai 10; 21K 12-24, lalai 16 -
  `DISTANCES.mingguLalai`; dua fieldset kongsi `name="minggu"`, jadi lalai ditanda oleh `ikutJarak()`). `pace` (s/km) = sasaran sendiri (5K ganti 6:00/km; 10K/21K
  ganti `sasaran`, kunci `p<pace>`); mudah/panjang kekal dari masa sekarang. Pelan lama (tanpa `lumba`/`pace`) terbina
  sama - `check-plan-5k` / `check-distance-plan` semak cincangan output, jadi `ENGINE_VERSION` tak dinaikkan. Pelan lumba
  tak ada "Sambung" (tarikh lumba tetap). Data sebenar di kad sesi + bar beban = `mountActuals` (pelan aktif saja).
  Profil kali pertama = `fillEmptyProfile` (medan kosong saja; gagal baca = tak tulis).
- **Jadual data**: `<Table id columns empty emptyHint emptyIcon variant>` (`components/ui/Table.astro`) + `createTable(id, { columns, search? })`
  (`lib/table.ts`), di pelayar atas data dimuat. `createTable` terus tunjuk baris rangka (loading) sampai `data(baris)` dipanggil;
  panggil `jadual.loading()` sebelum muat semula (contoh tukar tempoh). Empty state = ikon + `empty` + `emptyHint`; bila carian
  tiada padanan tajuk bertukar sendiri. `variant`: `compact` (padat, tiada cari/kaki, `limit` baris pertama,
  lalai 5 - panel kecil), `standard` (lalai: cari + halaman, 10 sehalaman), `full` (cari, slot `filters` (`.filter(fn)`),
  papar 10/20/50, halaman). Bawah 40rem baris jadi kad berlabel. `full` di `/account/activities`. Jangan buat jadual sendiri dalam halaman.
- **Halaman undang-undang + Harga** (2026-10-22): `/privacy`, `/terms` (awam, pautan di Footer; ditulis
  ikut data yang betul-betul disimpan - ubah storan/pembekal = ubah `/privacy`), `/account/pricing` (akaun
  saja buat masa ini, sidebar "Akaun"): Percuma + Ahli aktif, tier lain kelabu "Akan datang" (`aktif: false`
  dalam `PELAN`). Daftar = baris setuju Terma + Privasi.
- **Dialog sahkan**: `await confirmDialog({ title, message, confirmLabel, danger })` (`lib/confirm.ts`) atas `ConfirmDialog.astro`
  (dipasang sekali dalam `Layout` + `AccountLayout`). Untuk padam pelan dan log keluar; jangan guna `confirm()`.
- **Pelan 5K dinamik**: dengan masa 5K (wajib tahap "5k", pilihan "jalan"), pace interval/tempo
  turun setiap sesi laju dari pace sekarang ke 6:00/km; sesi mudah seminggu berbeza panjang; Daya
  tahan ada langkah laju; fasa Asas ulang langkah lama di sesi pertama. "Realistik tak?" = `analyzePlan()`
  (munasabah >= 100% minggu perlu, mencabar >= 75%, selain itu tak realistik) - anggaran kasar, sama
  dengan ambang `weeksNeeded`.
- **Pelan 5K + MAF**: kotak semak "Ikut nadi" (`?maf=1&umur=&keadaan=`) -> `buildPlan({ nadi })`: sesi mudah /
  panjang / jalan-lari bawa julat nadi, interval/tempo diberi nota "melebihi had". Minit sesi tak berubah
  (kunci tanda siap sama).
- **MAF** (`/maf`): formula 180 Maffetone dalam `src/lib/maf.ts` (16 ke bawah = 165; +10 untuk >65 hanya
  nota, bukan automatik), disemak `bun scripts/check-maf.ts` terhadap philmaffetone.com/180-formula.
  Julat "MAF-10 hingga MAF" dilabel amalan biasa - sumber hanya kata had atas.
- **Sesuai lari + Ramadan** (2026-10-18, kad pelan dibuang 2026-10-24): kad "Sesuai lari hari ini?"
  (IPU/cuaca/waktu) tidak lagi dipaparkan pada halaman pelan. `src/lib/run-check.ts` kekal untuk tool
  AI - IPU (JAS) + ramalan (MET Malaysia) + waktu solat (JAKIM) melalui endpoint awam backend kongsi:
  `GET /api/v1/public/air-quality?state=`, `GET /api/v1/public/weather/:id` dan
  `GET /api/v1/public/prayer-times/:zone` (`hono-workers/src/services/{air-quality,weather,prayer-times}.ts`;
  memo cache 15/60 min/6 j). 16 negeri, id MET `St###`; nama negeri mesti sama dengan `STATE_NAME` JAS.
  Sesi dalam Hijri 9 dapat tag "Puasa" + banner (`lib/ramadan.ts`, anggaran Umm al-Qura ±1 hari; JAKIM = kemudian).
- **Kalkulator peluh** (2026-10-18): `/guide#peluh` (`lib/sweat.ts`, ACSM 2007: timbang sebelum/lepas, had 2%) -
  dalam pelayar, tiada simpanan. `runWindows` masih dalam `lib/run-check.ts` untuk AI; tiada lagi kad
  "waktu lari terbaik" pada halaman pelan.
- **Maklumat latihan** (2026-10-18): `/account/profile/training` (tab "Latihan" dalam `ProfileShell`) simpan tarikh lahir, keadaan MAF, hari seminggu, masa 5K/10K
  sebagai `app_items` kind `profil` (satu rekod `saya`, kuota 1 di `hono-workers services/app-items.ts`) - tiada
  jadual/migration baru. `prefillForm` (`lib/profile.ts`) isi borang MAF / Pelan 5K (akaun) / Pelan Jarak; medan dalam
  URL tak disentuh. Umur dikira dari tarikh lahir pada hari ini (waktu Malaysia).
- **Kalendar lumba** (2026-10-18): `/races` dari `src/data/races.ts` (susun tangan - laman rasmi penganjur /
  halaman pendaftaran rasmi saja, `disemak` setiap acara), `/races/<id>.ics` statik, acara lepas disembunyikan dalam
  pelayar (`todayMY`), lencana "Pendaftaran ditutup" ikut `tutup`. `bun scripts/check-races.ts` gagal bila acara
  akan datang disemak > 3 bulan lalu - buka pautan, semak, kemas kini `disemak`. Buang acara lama sesekali.
- **Pembaikan UI** (2026-10-18): seksyen `narrow` ikut garis kiri bekas (tak ke tengah); halaman `404` (Assets
  `not_found_handling: "404-page"` - dulu laluan tiada jatuh ke worker -> "hono-workers not found"); footer di bawah
  skrin pada halaman pendek; bar `<progress>` Dashboard bertrek (dulu nampak penuh pada 0%); 3 kad statistik sebaris di
  telefon; jarak bawah kepala pelan; julat pace `~8:27-8:57/km` tak dipatahkan.
- **Semakan sesi + ketinggian** (2026-10-22): detail aktiviti ada panel "Semakan sesi" untuk
  interval/tempo - banding blok `laju` sebenar dari FIT dengan pace sasaran dalam teks sesi
  (`src/lib/activity-analysis.ts`, `check-session-analysis.ts`), dan profil ketinggian dari record
  `altitude`. Anggaran, bukan penilaian jurulatih.
- **Kalendar automatik** (2026-10-22): `PUT /me/calendar` simpan snapshot `.ics` di backend (hono 035,
  `docs/calendar-feed.md`); butang "Hidupkan kalendar automatik" pada pelan 5K akaun (webcal + https),
  auto kemas kini bila ICS berubah (Sambung/ubah pelan), "Batal kalendar automatik" revoke. Satu feed
  per akaun; 10K/21K belum disambung.
- **Sasaran 5K** (2026-10-22): pilihan Bawah 30/28/25 minit (`pace` chip; 336/300 s/km), masuk kunci
  `-pPace` supaya dua sasaran tak berkongsi tanda siap.
- **PWA + SEO + lawatan** (2026-10-22): `public/manifest.webmanifest` + `public/sw.js` (cache halaman
  awam; `/api/*` dan `/account/*` tidak dicache; `/plan-5k` + pemasa boleh dibuka luar talian selepas
  lawatan pertama), `public/robots.txt` + `src/pages/sitemap.xml.ts`, beacon `POST /api/v1/public/visit`
  dari `Layout.astro` (Nubi) dan portfolio `PublicLayout` (panel visits admin).
- **Menu header** (2026-10-18): butang "Alat" buka panel 4 kad (MAF, Pace, Lumba, Panduan - `ALAT` dalam
  `Header.astro`). Telefon: logo + Log masuk + butang menu; panel tambah Pelan 5K + Tentang / Cara sertai (dulu
  telefon hanya boleh capai Pelan 5K). Esc / klik luar / klik pautan menutup. Alat baru = satu entri `ALAT`.
- **Risiko kos Cloudflare (pelan percuma, semakan 2026-10-18)** - Nubi sendiri murah: halaman + `.ics` + 404 = aset
  statik (tiada invocation worker); pemasa, pelan, MAF, pace, peluh = dalam pelayar; `/api/*` dicache sessionStorage
  (IPU 15 min, cuaca/waktu 60 min), tanda siap dikumpul 1.5 s. Risiko sebenar di backend dikongsi (hono-workers):
  (1) **bcrypt cost 12** = ~270 ms CPU setiap login/daftar/tukar kata laluan vs had 10 ms CPU percuma - semak
  dashboard Workers (CPU time / "exceeded CPU"); pilihan: kos 10 (~70 ms) atau PBKDF2 WebCrypto, perlu keputusan owner.
  (2) `?noCache=1` / `Cache-Control: no-cache` sesiapa boleh pintas memo endpoint awam -> panggil JAS/MET/JAKIM
  setiap kali; hadkan kepada owner. (3) Had 100k permintaan/hari dikongsi seluruh akaun - portfolio SSR guna paling
  banyak. Bila had dilepasi, worker gagal (tiada bil), aset statik Nubi tetap hidup.
- Palet: navy `#0A1A33`, oren `#FF5A1F`, oren teks atas putih `#C2410C`. Font paparan Barlow Condensed.
- **Pelan 5K** (`/plan-5k`): logik tulen dalam `src/lib/plan-5k.ts` (dikira dalam browser - laman statik,
  jadi `?bulan=&tahap=&masa=&hari=&mula=` dibaca oleh skrip halaman). Tukar logik = jalankan
  `bun scripts/check-plan-5k.ts` (setiap gabungan input: bilangan minggu, lonjakan ≤ 10%, minggu ringan
  setiap ke-4, minggu akhir ujian, kes tak munasabah ditolak). Gaya halaman `is:global` sebab hasil
  dirender dengan `innerHTML`. Tanda siap = localStorage `pelan-5k:<bulan>-<tahap>-<masa>-<hari>[-pPace]`.
  Hari sesi tetap (`SESSION_DAYS`: 3 hari = Isn/Rab/Sab, 4 hari = Isn/Rab/Jum/Ahd - sesi akhir hujung
  minggu); `mula` dianjak ke Isnin (`startMonday`) dan minggu semasa + sesi hari ini diserlahkan.
- Semak: `bun run build` + semua `bun scripts/check-*.ts` (29 skrip, termasuk `check-deficit`,
  `check-session-analysis`, `check-activity-records`, `check-public-profile`, `check-plan-list`, `check-login-next`) + `npx -y -p @astrojs/check -p typescript@5 astro-check`. CI: `.github/workflows/verify.yml` (push/PR: astro-check, semua `check-*.ts`, build). Belum ada lint.
  `bunx tsc --noEmit -p .` saja tak membaca skrip dalam `.astro` - guna astro-check
  (`@astrojs/check` belum sokong TS 7, jadi tak dipasang).

## 🚀 Owner - langkah manual

- [ ] `CONTACT` WhatsApp group / Instagram (e-mel dah diisi: hafiz@hafizbahtiar.com) - "Sertai" kini tunjuk e-mel saja.
- [ ] **Migration 035** (`nubi_calendar_feeds`) remote + deploy backend/frontend sebelum butang
  "Hidupkan kalendar automatik" digunakan.
- [ ] **Migration 039** (`nubi_badges`) remote + deploy backend/frontend sebelum `/account/badges`
  dan panel lencana dashboard digunakan.
- [ ] Uji import `.ics` pada iPhone (Safari: terus "Tambah semua" atau simpan ke Files?), Samsung Calendar,
  Google Calendar (web) dan Outlook - nota platform di halaman belum diuji pada peranti sebenar.
- [ ] Uji kalendar automatik (iPhone Calendar + Google Calendar "From URL") dan PWA (install + buka
  `/plan-5k` offline) selepas deploy.
- [ ] **Halaman undang-undang** (2026-10-22): `/privacy`, `/terms`, `/account/pricing` (dalam akaun sahaja buat masa ini) dah ada - semak dengan peguam
  SEBELUM tier berbayar dibuka. Buka tier = `aktif: true` dalam `PELAN` (`src/pages/account/pricing.astro`).
  Ubah data yang disimpan / pembekal (backend) = ubah `/privacy` juga.
- [ ] Semak pratonton pautan lepas deploy (WhatsApp / Facebook debugger) - `og.png`.
- [ ] Uji dengan fail Strava sebenar (deploy aktiviti v2 dah live 2026-10-22): padanan pelan aktif, % lari,
  semua gaya peta, bottom sheet + zoom dua jari di telefon, seksyen Nadi.
- [ ] **Cloudflare Bot Fight Mode / JavaScript Detections**: ia menyuntik `<script>__CF$cv$params</script>`
  selepas response dengan token berubah, jadi CSP hash strict akan blok (console). Pilih satu: matikan
  ciri itu untuk Nubi (kekalkan CSP strict), atau terima `'unsafe-inline'` pada `script-src` (kurang selamat).
- [ ] **Header keselamatan** (pentest 2026-10-22 F-02 - dah dibuat): `bun run build` kini jalankan
  `scripts/security-headers.ts` -> HSTS, `X-Frame-Options: DENY`, nosniff, Referrer/Permissions-Policy dan CSP
  ber-hash (tiada `unsafe-inline` skrip) dalam `dist/_headers`. Lepas deploy: `curl -sI
  https://nubisport.hafizbahtiar.com/login/` mesti tunjuk header ini; buka Dashboard, aktiviti (peta semua gaya),
  login (Turnstile) - Console tiada "Content Security Policy". Sumber luar baru (skrip/tile/API) = tambah dalam
  skrip itu, kalau tak ia disekat. Isu DNS/TLS (DMARC, TLS 1.2, SPF, CAA) = `hono-workers/TODO.md` Security.

## 🛠 Frontend - seterusnya

- [x] **Dashboard aktiviti + lencana/misi** (2026-10-22): panel aktiviti 8 minggu (KPI, bar jarak,
  3 terbaru), `/account/badges`, sidebar "Lencana", 6 lencana + 2 misi. Backend `nubi_badges`
  (migration 039), service `nubi-badges.ts`; spec `docs/plans/badges-missions.md`. Semak:
  `bun scripts/check-activity-summary.ts`, `bun scripts/check-badges.ts`, backend
  `bun scripts/verify-nubi-badges.ts`.

- [x] **Animasi laluan aktiviti** (2026-10-23, dipermudah 2026-10-24): peta detail ada animasi dari track FIT
  (`trackOf`/`trackAt`) - intro auto ~3 s selepas peta load + buffer 600 ms, dan butang Main
  mengulanginya. Tiada replay masa sebenar, slider atau kelajuan. Marker bergerak + arrowhead ikut
  bearing + progress line; reduced motion = terus penuh. Semak `bun scripts/check-activity-file.ts`.
- [x] **Detail aktiviti lambat** (`/account/activities/view`, didiagnosis 2026-10-23, dibaiki): `mula()`
  berjalan satu demi satu - `/me` -> baris aktiviti -> fail `.fit` (R2) -> parser FIT 430 KB baru dimuat ->
  tunggu pelan -> **baru** maplibre 1.1 MB + gaya + tiles. Baiki: (1) mula `import("maplibre-gl")` + parser FIT
  serta-merta bila page dibuka; (2) baris aktiviti + `.fit` serentak (id dari URL); (3) lukis peta dulu,
  padanan pelan kemudian. Backend: `Cache-Control: private, max-age=31536000, immutable` pada
  `/activities/:id/file` (fail tak pernah berubah) - dah ditambah. Senarai aktiviti diukur laju secara tempatan (180-225 ms,
  300 baris) - kalau perlahan di production, itu rangkaian/API (`/me` dulu, kemudian 3 panggilan).
- [x] **Navigasi akaun** (2026-10-23, owner pilih A: kekal MPA). Spinner tab = normal untuk laman statik
  berbilang page; yang lambat ialah data selepas page dibuka. Senarai aktiviti, detail aktiviti, senarai
  larian dan detail larian kini mula ambil data **serentak dengan `/me`**, bukan selepasnya (senarai larian
  ikut peranan dari `cachedMe()` - petunjuk sahaja, backend tetap semak). Diuji dengan API mock 300 ms.
- [ ] Kalau page akaun masih perlahan di production: sahkan lokasi D1 (`bunx wrangler d1 info hono_workers_db`)
  dan pertimbang Smart Placement untuk hono-workers (`"placement": { "mode": "smart" }`).
- [ ] Ditolak buat masa ini: `<ClientRouter />` (setiap skrip page perlu ditulis semula ke `astro:page-load`)
  dan `clientPrerender` (skrip page berjalan masa hover - panggil API, dan ada page yang menulis bila dibuka).
- [ ] Favicon 16px: dua garis N terlalu halus di tab - minta pereka versi favicon garis lebih tebal.
- [ ] Label hero "Running Community · Sejak 2026" - kekal atau buang (wordmark kini "NUBI SPORT").
- [ ] Gambar sebenar komuniti (larian kumpulan) - laman kini teks + jata saja. Perlu kebenaran orang
  dalam gambar.
- [ ] Analitik ringkas tanpa cookie (Cloudflare Web Analytics) - kalau perlu.
- [ ] Mod gelap? Laman kini sengaja terang + navy; buat hanya kalau diminta.
- [ ] Uji pemasa pada telefon sebenar: bunyi iOS (suis senyap mematikan Web Audio), getaran (iOS tiada
  `navigator.vibrate`), Wake Lock Safari 16.4+.

## 📈 Rekod & ramalan dari aktiviti (2026-10-24)

- [x] **Split + best effort** di detail aktiviti: `activitySplits` (km, pace, ketinggian naik) dan
  `bestEfforts` (1K/5K/10K/21K/42K) dalam `lib/activity-analysis.ts`; dirender dari FIT yang sudah
  dimuat turun (tiada request/storan baru). Semak `bun scripts/check-session-analysis.ts`.
- [x] **PR + ramalan** di `/account/activities`: `lib/activity-records.ts` ambil larian terpantas yang
  meliputi 5K/10K/21K/42K (PR konservatif = pace purata), kemudian Riegel untuk jarak yang belum ada.
  Panel hanya muncul bila ada larian >= 3 km; walk/ride tidak dikira. Semak
  `bun scripts/check-activity-records.ts`.
- [ ] **PR tepat**: kira best effort masa upload (bukan pace purata) dan simpan kolum D1 di backend
  `hono-workers` + backfill aktiviti lama. Buat bila angka anggaran tak cukup; jangan mula dengan ini.
- [x] **GAP, kadens, drift nadi** (2026-10-24): `gradeAdjustedPace` (Minetti 2002, gred split dihadkan
  ±30%), `cadenceStats` (FIT satu kaki x2) dan `heartRateDrift` (separuh kedua vs pertama, ikut masa
  bergerak) dalam `lib/activity-analysis.ts`. GAP/kadens untuk run/walk di ringkasan detail, drift dalam
  panel Nadi. Semak `bun scripts/check-session-analysis.ts`.
- [ ] Training load / fitness-fatigue - tangguh (perlu snapshot harian, nilai tak jelas untuk pelari baru).
- [ ] Uji dengan aktiviti sebenar: split mesti berjumlah jarak aktiviti (termasuk split akhir separa),
  best 5K/10K hanya muncul bila rekod cukup panjang, PR dikemas kini selepas aktiviti dipadam.
- **Jangan buat**: segmen/leaderboard, kudos, feed, kelab, foto, gear, Beacon - bukan gap Nubi,
  keputusan owner kekal tiada ciri sosial.

## 🗂 Struktur pelan - index / view / new (2026-10-22)

- [x] **Satu senarai semua pelan**: `/account/plans` (label "Pelan larian") = index Table
  (5K, 10K, 21K, 42K) -> `/account/plans/<jarak>/view`. Nama/detail/href = `describePlan` (`lib/plan-list.ts`),
  dikongsi dengan Dashboard.
- [x] **5K dulu** (experiment): `/account/plans/5k/new` = borang, `/account/plans/5k/view?kunci=`
  = paparan + mod edit. Borang awam `/plan-5k` kekal tanpa akaun.
- [x] **Borang awam vs akaun berbeza**: awam dalam `PageHero` (ringkas, tanpa MAF); akaun dalam panel
  `plan-form` (header + back link, MAF, "Kemas kini" dalam view). Markup dikongsi `Plan5kForm.astro`,
  layout berasingan - jangan gabung.
- [x] **View terus**: `pullCloud()` bila params tiada (bookmark/peranti baru) sebelum papar pelan.
- [x] **10K / 21K / 42K** (2026-10-22): `/account/plans/<jarak>/new` + `/view?kunci=` (borang panel,
  view/edit, `DistancePlan` `mode`); index + Dashboard paut ke view. Halaman lama dibuang.
- URL lama `/account/plan-5k`, `/account/distance-plan`, `/account/plan-42k` dibuang - tiada redirect.
  Pautan dalam app guna `/account/plans/...`; nav "Pelan larian" = satu-satunya pintu senarai.
- [x] **Audit + pembaikan** (2026-10-23): open redirect `?next=` (tab/baris baru) -> `internalPath`; kunci
  prototaip dari URL (`tahap=constructor`, `jarak=__proto__`) -> `Object.hasOwn` dalam enjin; link berparam
  (`hantar=1`) dan `view?kunci=` asing tak lagi cipta pelan; "Kemas kini" = butang submit (validasi pelayar,
  Enter = kemas kini); "Sambung dari Minggu N" Dashboard kini bawa `kunci`; view tiada auto-scroll, skrol
  ikut reduced motion; butang tindakan 2 lajur sama lebar di telefon. Formula 5K/10K/21K/42K, MAF, Riegel,
  ics, Ramadan, plan-sync disemak bebas - tiada perubahan.
- [ ] **Keputusan owner**: param URL mengatasi params tersimpan di view (borang pace/ujian bergantung padanya)
  - link dengan kunci anda boleh ubah pelan + pangkas tanda siap di pelayar (awan kekal). Biar, atau params
  tersimpan menang?
- [x] **`nextPlan` tepat 30:00** (2026-10-24): tepat 30:00 = "tepat 30 minit" + pautan 10K; 29:59 =
  "bawah 30 minit". Guna masa sebenar, bukan minit bundar. Semak `bun scripts/check-pace.ts`.
- [x] **`Maf.astro`, `pace.astro`** (2026-10-24): buang `behavior: "smooth"` - CSS `html` dan reduced
  motion dah uruskan.
- [ ] Uji "Sambung dari Minggu N" Dashboard dengan akaun ahli + pelan aktif sebenar; uji flow pelan di
  Safari/telefon.

## 🍽 Kalkulator defisit (v1 dibina 2026-10-23)

Diminta kawan owner. Pelan penuh: **`docs/plans/deficit-calculator.md`** (formula, had keselamatan, privasi,
luar skop). Akaun sahaja, dikira dalam pelayar, diisi dari profil latihan; keputusan tak disimpan.

- [x] **v1** (2026-10-23): `/account/deficit` - akaun sahaja (owner), pautan sidebar "Latihan" (bukan `ALAT`/sitemap); README, `lib/deficit.ts`
  (`calcDeficit`, `DIET_TEMPLATES`), `scripts/check-deficit.ts` (fixture kira tangan dalam pelan). Input tak
  masuk URL/storan/API (submit dalam JS), jadi `/privacy` tak berubah. Tiada table DB: jantina/berat/tinggi
  tak disimpan di mana-mana; tarikh lahir saja ada (`app_items` `nubi/profil`).
- [x] Formula disemak 2026-10-23: Mifflin-St Jeor (umur 19-78), PAL FAO 2004 (1.40/1.55/1.75/2.00 - faktor
  1.2-1.725 dibuang), larian 1.0 kcal/kg/km (ACSM), lantai 1,200/1,500 (Harvard), ≤ 1% seminggu (Helms 2014),
  defisit ≤ 25%, rendah karbo < 26% (Feinman 2015).
- [x] Templat makro: Seimbang, Pelari (1.6 g/kg), Protein tinggi (2.0 g/kg), Rendah karbo (+ amaran).
- [ ] Owner putuskan **keto** (tidak dimasukkan - bukti tak cukup untuk prestasi, AND/DC/ACSM 2016). Kalau masuk:
  satu entri `DIET_TEMPLATES` (karbo 30 g tetap, lemak baki) + amaran.
- [ ] Siapa semak kandungan (dietitian)? Sampai disemak, penafian "belum disemak" kekal.
- [ ] Belum disahkan (jangan petik di page): teks MDG 2020 KKM (0.5-1 kg seminggu), RNI 2017 (julat lemak),
  julat karbo g/kg AND/DC/ACSM 2016.
- [x] **Profil badan** (2026-10-23, owner minta): `jantina`, `tinggi`, `berat` dalam `profil` (`app_items`, tiada
  migration - validator dah terima kunci baru) di Profil > Latihan; `/account/deficit` isi umur/jantina/tinggi/berat dari
  profil (baca saja - kalkulator tak pernah menulis). `/privacy` dikemas kini (23 Okt).
- [ ] Nanti kalau diminta: km dari pelan aktif, anggaran minggu ke berat sasaran.

## 👤 Profil awam (2026-10-24)

- [x] **Profil sendiri**: `/account/profile` ada ringkasan (initial, nama, @username, status) + form
  nama/username/bio/lokasi/checkbox Profil awam (`PATCH /me`). `CurrentUser` bawa
  `username`/`profilePublic`/`profile`.
- [x] **Profil awam** `/u/<username>`: Worker frontend rewrite `/u` + `/u/*` -> `dist/u/index.html`;
  shell fetch `GET /api/v1/public/profiles/:username/nubi`; papar nama/username/bio/lokasi/ahli
  sejak/lencana + agregat larian & jalan. Tiada laluan/pelan/kesihatan/pace; 404 sama untuk
  private/unknown; `noindex`. Backend: `services/nubi-public-profile.ts` + route profiles.
- [x] **Privasi**: `/privacy` senarai fields awam; opt-in guna `profile_public` sedia ada (sama
  dengan profil awam portfolio - statistik agregat Nubi ikut nampak bila flag itu on).
- [x] **Semakan**: `bun scripts/check-public-profile.ts` (worker rewrite), semua check frontend,
  astro-check + build; backend `bun run type-check` + `bun scripts/verify-public-profile.ts`
  (17 checks).
- [ ] Opt-in Nubi berasingan jika owner tak mahu statistik larian ikut flag portfolio.
- [ ] SSR/SEO profil awam (v1 client-render, `noindex`).

## 🤖 Pembantu AI - chat (fasa 1c dibina 2026-10-23)

Diminta kawan owner. Fail utama: **`hono-workers/docs/plans/ai/README.md`**; frontend: `docs/plans/ai/frontend-platform.md` (fasa 1) dan `docs/plans/ai/frontend-byok.md` (fasa 2). Keputusan owner: chat yang
faham konteks dan boleh baca / cipta / ubah data **ahli itu sahaja**; ahli ke atas; AI platform dulu, kunci
API sendiri (Claude, OpenAI, OpenRouter, Command Code) fasa 2.

- [ ] Dulu untuk tool tulis: `lib/plan-save.ts` (`savePlan`) - satu laluan simpan pelan untuk borang dan tool AI.
- [x] `/account/ai` "Pembantu AI" (sidebar, ahli+): chat, persetujuan `nubi/aiconsent` (berasingan daripada persetujuan aktiviti), baris kuota.
- [x] `lib/ai-tools.ts` + `scripts/check-ai-tools.ts`: tool **baca** berjalan dalam pelayar guna API `/me`
  sedia ada (profil, pelan, aktiviti, larian kumpulan); tool tulis masih ditolak.
- [x] Fasa 1c: tool tulis + kad Sahkan / Batal (tiada tool padam).
- [x] **Kad `open_plan` + prompt** (2026-10-24): `list_plans` pulangkan `href`; kad navigasi guna
  `title` (bukan "Selesai"), ditangguh sampai jawapan akhir siap supaya keluar serentak; prompt
  backend larang URL placeholder dan wajib `open_plan`; `get_training_summary` pulangkan `mingguIni`.
  Semak `check-ai-tools` + backend `verify-ai`. Deploy backend untuk prompt berkuat kuasa.
- [x] **Peta + cuaca aktiviti** (2026-10-24): `get_activity_detail` pulangkan `view` peta UI-only
  (route tidak masuk mesej model); kad peta snapshot MapLibre malas, tiada animation/kawalan, pautan
  detail. Cuaca FIT ikut masuk result AI. Semak `check-activity-file` (cuaca) + `check-ai-tools`.
- [x] Copy button pada setiap bubble user/assistant.
- [x] Teks AI dipapar dengan `textContent`, bukan `innerHTML`.
- [x] `/privacy` + `/terms`: bahagian AI.
- [ ] Fasa 2 (bila diminta): bahagian "Guna kunci API sendiri" dalam `/account/ai` - lihat `frontend-byok.md`.

## 💡 Idea

Semua idea (belum diputuskan, disusun ikut gelombang) dalam **`IDEA.md`**. Yang diputuskan -> pindah ke sini.

## Pelan 5K bawah 30 minit (`/plan-5k`) - susulan

- [ ] **Semakan kandungan latihan** oleh jurulatih bertauliah sebelum dipromosi. Semakan dalaman
  (sumber awam) siap 2026-10-18: `docs/training-review.md` - 3 pembetulan (langkah 25 min, puncak
  10K 10 km, 21K 16 km); senarai semak untuk jurulatih di situ. Ambang munasabah + zon pace masih anggaran.
- [ ] Unit: kini minit (+ pace /km). Tambah km bagi yang ada jam GPS?
- [ ] Coach pantau ahli (peranan `coach` = migration backend baru).

## Soalan terbuka
- Nama: "Nubi Sport" kekal larian saja, atau nanti sukan lain (badminton, kayuh)?
- Yuran / jersi kumpulan? Kalau ya, jangan kendalikan bayaran di laman - pautan ke pihak ketiga.
- Bahasa: Melayu saja, atau tambah English?
