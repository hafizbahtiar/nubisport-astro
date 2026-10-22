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
- **Hubungan** (`src/data/site.ts` `CONTACT`): biar `""` sampai pautan sebenar wujud - tiada URL contoh.
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
- **Asas UI**: semua gaya kongsi dalam `src/styles/global.css` (token warna/radius, butang `.btn-*`, borang
  `.form/.field/.input/.chips`, `.card`, `.alert-*`, `.surface-dark`, `.prose`, `[hidden]` menang). Komponen
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
  **Nama kod = English**: fungsi, jenis dan pemalar yang dieksport dari `src/lib/*.ts` / `src/data/*.ts`
  (contoh `buildPlan`, `sessionDate`, `matchActivities`, `ENGINE_VERSION`, `Week`, `Level`). Medan yang disimpan
  atau dihantar (payload awan, JSON localStorage, param URL, token tanda siap) dan nilai union yang masuk ke data
  (`"sifar"`, `"jalan-lari"`, `"tak-realistik"`) kekal Melayu - jangan tukar.
- **Login** (`/login`): `src/lib/api.ts` (`api()` = `/api/v1` + satu refresh dikongsi bila 401, `fetchMe()` =
  `/me` kalau cookie `session_active`). Turnstile widget yang sama dengan portfolio (kunci tapak dalam
  `src/data/site.ts`, action `login`). Daftar di `/register`, urus profil di `/account/profile`. Header tukar
  "Log masuk" -> "Akaun" bila `session_active`. Kebenaran sebenar sentiasa di backend.
- **Penafian / info**: setiap halaman pelan ada "bukan nasihat perubatan" + "belum disemak jurulatih bertauliah"
  (`docs/training-review.md`); login/daftar menyebut 3 slot awan. Tukar teks itu bila had atau status semakan berubah.
- **Daftar / sahkan** (`/register`, `/verify`): daftar hantar `app: "nubi"`, jadi pautan e-mel ke
  `nubisport.hafizbahtiar.com/verify`. Alamat pautan datang dari senarai `APP_SITES` di backend
  (`services/registration.ts`) - laman baru = entri baru di situ; URL tak pernah diterima dari klien
  (kod app tak dikenali = 400). Hantar semula pautan hanya dari `/verify` (Turnstile action `register`).
- **Ahli ≠ berdaftar**: ahli = peranan app `nubi/ahli` (migration 026), diluluskan owner/admin di
  portfolio `/admin/app-access`. Berdaftar + disahkan saja = "Pengguna berdaftar - belum ahli".
- **Kalendar** (`src/lib/ics.ts`, generik - guna semula untuk 10K/21K): `.ics` RFC 5545, masa Malaysia
  (UTC+8) disimpan UTC, UID tetap `pelan-5k-<kunci>-m<w>s<i>@nubisport.hafizbahtiar.com`, peringatan
  30 min. Semak `bun scripts/check-ics.ts`.
- **Had pelan tanpa akaun**: 3 pelan berbeza (`GUEST_PLAN_LIMIT`, localStorage `pelan-5k:dibuat`; buka
  semula tak dikira; `session_active=1` = tiada had). Had LEMBUT saja (incognito memintas) - had
  keras perlu pelan dijana di server.
- **Akaun (`/account/*`)**: `AccountLayout.astro` - sidebar (laci bawah 64rem: Esc / scrim tutup), navbar,
  kandungan lebar penuh. Layout = satu-satunya pengawal sesi (tiada sesi -> `/login?next=`); halaman ambil
  pengguna dengan `currentUser()` (`lib/api.ts`, satu /me dikongsi). `/login` lencong ke `?next=` (laluan
  dalaman saja) atau `/account`. Header awam: "Akaun" -> `/account`. `<head>` dikongsi = `Head.astro`.
  Item yang dijana skrip perlu `:global(...)` dalam `<style>` halaman (tiada atribut skop Astro).
- **Pelan 5K awam vs penuh**: `components/Plan5k.astro` (kandungan saja; halaman pilih layout).
  `/plan-5k` = pelan + label "Realistik tak?" + kotak promosi; log masuk -> lencong ke `/account/plan-5k`
  (`full`: pecahan analisis, ikut nadi MAF, .ics, tiada had 3 pelan). Sekatan di pelayar saja.
  Storan pelan = `lib/saved-plans.ts` (`readList`/`writeList`/`deletePlan`); Dashboard baca `pelan-5k:dibuat` - pelan per pelayar, bukan per akaun (simpan di D1 = kemudian).
  Padam pelan: Dashboard + pelan penuh saja (di awam ia membuka semula slot had 3 pelan).
- **Akaun lain**: `/account/maf` (`components/Maf.astro full`: simpan `maf:terakhir` untuk Dashboard + butang
  Pelan 5K ikut nadi; `/maf` lencong ke situ bila log masuk), `/account/profile` (Maklumat: nama `PATCH /me`) +
  `/account/profile/password` (`PUT /me/password` - tamatkan semua sesi); navigasi = card dalam `components/ProfileShell.astro` (tab segmen bawah 48rem). Sidebar: X tutup laci (telefon) / lipat (desktop, `akaun:sidebar`).
- **Simpan awan**: akaun percuma 3 slot (`lib/cloud-sync.ts`, backend `/me/apps/nubi/plan`, migration 029).
  Pelayar = salinan kerja, awan = ikut akaun; Dashboard: lencana Awan / Peranti ini, meter slot, "Ganti"
  bila penuh. Naikkan `ENGINE_VERSION` bila enjin pelan berubah. Langganan: `docs/plans/cloud-sync.md`.
- **Aktiviti** (`/account/activities`, ahli ke atas): fail Strava `.fit` (wajib) + `.gpx` (pilihan) dihurai
  **di pelayar** (`lib/activity-file.ts`; SDK `@garmin/fitsdk` dimuat malas, lesen FIT Protocol Garmin),
  dipadankan ikut masa mula, satu POST multipart setiap aktiviti ke `/me/apps/nubi/activities`.
  Persetujuan sebaris dengan Simpan (`nubi/consent/aktiviti`). Detail + peta: `/account/activities/view?id=` (MapLibre malas + OpenFreeMap, laluan dari `.fit` asal). Nama aktiviti = `textContent` saja. Backend + R2:
  `hono-workers/docs/plans/nubi-activities.md`. Pelan: `docs/plans/strava-activities.md`.
- **Pelan aktif** (2026-10-22, ahli): satu pelan awan bertarikh mula = `app_items` `nubi/active/plan`
  (`data.plan` = kunci). `lib/plan-sync.ts`: `matchActivities` (tulen, `bun scripts/check-plan-sync.ts`) tanda sesi
  siap dari aktiviti Strava (hanya menambah, enjin mesti `ENGINE_VERSION`); butang "Jadikan pelan aktif" di page
  pelan, panel dashboard, mesej lepas muat naik, baris "Sesi pelan" di detail. Spec: `docs/plans/active-plan-sync.md`.
- **Jadual data**: `<Table id columns empty variant>` (`components/ui/Table.astro`) + `createTable(id, { columns, search? })`
  (`lib/table.ts`), di pelayar atas data dimuat. `variant`: `compact` (padat, tiada cari/kaki, `limit` baris pertama,
  lalai 5 - panel kecil), `standard` (lalai: cari + halaman, 10 sehalaman), `full` (cari, slot `filters` (`.filter(fn)`),
  papar 10/20/50, halaman). Bawah 40rem baris jadi kad berlabel. `full` di `/account/activities`. Jangan buat jadual sendiri dalam halaman.
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
- **Sesuai lari + Ramadan** (2026-10-18): kad "Sesuai lari hari ini?" pada kedua-dua halaman pelan -
  IPU (JAS) + ramalan (MET Malaysia) melalui endpoint awam backend kongsi:
  `GET /api/v1/public/air-quality?state=` dan `GET /api/v1/public/weather/:id`
  (`hono-workers/src/services/{air-quality,weather}.ts` + `routes/v1/public/` - repo itu semua Inggeris;
  memo cache 15/60 min). Nubi: `src/lib/run-check.ts` (16 negeri, id MET `St###`; negeri pilihan =
  localStorage `nubi:lokasi`) - nama negeri mesti sama dengan `STATE_NAME` JAS. Teks nasihat Melayu hidup
  dalam `lib/run-check.ts`, bukan backend. Sesi dalam Hijri 9 dapat tag "Puasa" + banner (`lib/ramadan.ts`,
  anggaran Umm al-Qura ±1 hari; JAKIM = kemudian). Kad senyap bila endpoint gagal - pelan tetap berfungsi.
- **Waktu lari terbaik + kalkulator peluh** (2026-10-18): kad "Sesuai lari hari ini?" juga tunjuk Pagi (Subuh -> 11:00)
  dan Petang (16:00 atau Asar kalau lewat -> Maghrib) - 11 pagi-4 petang dari Kenyataan Media Cuaca Panas KKM
  25 Mac 2026; waktu solat zon JAKIM ibu negeri (`STATES[].zon`) dari `GET /api/v1/public/prayer-times/:zone`
  (backend `services/prayer-times.ts`, memo 6 j); tetingkap tamat dibuang, ribut petir MET disusun ke belakang
  (`runWindows` dalam `lib/run-check.ts`). Kalkulator peluh `/guide#peluh` (`lib/sweat.ts`, ACSM 2007: timbang
  sebelum/lepas, had 2%) - dalam pelayar, tiada simpanan.
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
  dirender dengan `innerHTML`. Tanda siap = localStorage `pelan-5k:<bulan>-<tahap>-<masa>-<hari>`.
  Hari sesi tetap (`SESSION_DAYS`: 3 hari = Isn/Rab/Sab, 4 hari = Isn/Rab/Jum/Ahd - sesi akhir hujung
  minggu); `mula` dianjak ke Isnin (`startMonday`) dan minggu semasa + sesi hari ini diserlahkan.
- Semak: `bun run build` + `bun scripts/check-plan-5k.ts` + `bun scripts/check-maf.ts` +
  `bun scripts/check-ics.ts` + `bun scripts/check-date.ts` + `bun scripts/check-run-check.ts` +
  `bun scripts/check-ramadan.ts` + `bun scripts/check-sweat.ts` + `bun scripts/check-profile.ts` + `bun scripts/check-races.ts`. Belum ada lint. Tanda taip: `bunx tsc --noEmit -p .` saja tak
  membaca skrip dalam `.astro` - jalankan `npx -y -p @astrojs/check -p typescript@5 astro-check`
  (`@astrojs/check` belum sokong TS 7, jadi tak dipasang).

## 🚀 Owner - langkah manual

- [ ] Isi `CONTACT` (WhatsApp group / Instagram / e-mel) - seksyen "Sertai" kosong sampai ini diisi.
- [ ] Lantik admin Nubi di portfolio `/admin/app-access`.
- [ ] **Login / daftar production - ikut urutan**: (1) dashboard Cloudflare -> Turnstile -> widget
  portfolio -> tambah hostname `nubisport.hafizbahtiar.com`; (2) `bun run db:migrate:remote` dalam
  `hono-workers` (026, peranan `ahli`); (3) deploy `hono-workers` - mesti SEBELUM push Nubi, backend lama
  tolak `app` (daftar jadi 400); (4) push repo ini; (5) deploy portfolio (dropdown peranan App Access kini
  tiada pilihan lalai).
- [ ] Uji import `.ics` pada iPhone (Safari: terus "Tambah semua" atau simpan ke Files?), Samsung Calendar,
  Google Calendar (web) dan Outlook - nota platform di halaman belum diuji pada peranti sebenar.
- [ ] E-mel pengesahan untuk `app=nubi` masih teks English dari pengirim portfolio - nak versi Melayu?
- [ ] Deploy `hono-workers` untuk kad "Sesuai lari hari ini?" (`/api/v1/public/air-quality`, `/api/v1/public/weather/:id`,
  `/api/v1/public/prayer-times/:zone`) dan kuota `nubi.profil` (maklumat latihan - tanpanya simpan gagal 404)
  - SEBELUM push Nubi; tanpa itu kad hanya kata data tak dapat diambil.
- [ ] Semak pratonton pautan lepas deploy (WhatsApp / Facebook debugger) - `og.png`.

## 🛠 Frontend - seterusnya

- [ ] Favicon 16px: dua garis N terlalu halus di tab - minta pereka versi favicon garis lebih tebal.
- [ ] Label hero "Running Community · Sejak 2026" - kekal atau buang (wordmark kini "NUBI SPORT").
- [ ] Gambar sebenar komuniti (larian kumpulan) - laman kini teks + jata saja. Perlu kebenaran orang
  dalam gambar.
- [ ] `robots.txt` + `sitemap` (bila ada lebih dari satu halaman).
- [ ] Analitik ringkas tanpa cookie (Cloudflare Web Analytics) - kalau perlu.
- [ ] Mod gelap? Laman kini sengaja terang + navy; buat hanya kalau diminta.

## 💡 Idea

Semua idea (belum diputuskan, disusun ikut gelombang) dalam **`IDEA.md`**. Yang diputuskan -> pindah ke sini.

## Pelan 5K bawah 30 minit (`/plan-5k`) - susulan

- [ ] **Semakan kandungan latihan** oleh jurulatih bertauliah sebelum dipromosi. Semakan dalaman
  (sumber awam) siap 2026-10-18: `docs/training-review.md` - 3 pembetulan (langkah 25 min, puncak
  10K 10 km, 21K 16 km); senarai semak untuk jurulatih di situ. Ambang munasabah + zon pace masih anggaran.
- [ ] Unit: kini minit (+ pace /km). Tambah km bagi yang ada jam GPS?
- [ ] Sasaran lain (bawah 28 / 25 minit) - `buildPlan` kini tetap 30 minit. (10K/21K: `/account/distance-plan`.)
- [ ] Perlu backend: simpan pelan ke akaun, log larian sebenar vs pelan, coach pantau ahli.

## Soalan terbuka
- Nama: "Nubi Sport" kekal larian saja, atau nanti sukan lain (badminton, kayuh)?
- Yuran / jersi kumpulan? Kalau ya, jangan kendalikan bayaran di laman - pautan ke pihak ketiga.
- Bahasa: Melayu saja, atau tambah English?

## Pelan 10K / 21K (akaun saja) - siap

- `/account/distance-plan` (`components/DistancePlan.astro`, enjin `lib/distance-plan.ts`, semak
  `bun scripts/check-distance-plan.ts`). Bertangga: 10K dari masa 5K, 21K dari masa 10K; 10K 8/10/12
  minggu, 21K 12/16/20 (puncak larian panjang 10 / 16 km); sasaran lalai habis, masa sasaran pilihan (sesi laju + "Realistik tak?",
  anggaran Riegel - kasar). Kad minggu + analisis dikongsi dengan 5K (`lib/plan-render.ts`,
  `styles/plan.css`). Kunci storan `pelan-10k|21k:<minggu>-<masa>-<sasaran>-<hari>`.

## Sambungan, sesi, kos (2026-10-18)

- `components/ui/ConnectionNotice.astro` (Layout + AccountLayout): notis luar talian / kembali dalam talian.
- Salinan `/me` dalam sessionStorage `nubi:saya` (`lib/api.ts` `cacheMe`): sidebar dilukis sebelum
  lukisan pertama; `/me` dipanggil semula hanya lepas 5 min. Log keluar / tiada cookie = dibuang.
- Kos: Worker hanya `/api/*` (aset statik percuma); `public/_headers` simpan `/_astro/*` setahun;
  `prefetch` (hover) hanya aset statik; `@view-transition` (CSS, tanpa JS), sidebar akaun kekal.

## Pemasa jalan-lari (2026-10-18) - siap

- Butang "Mula pemasa" pada setiap sesi (bukan ujian/lumba - ikut jarak) dalam semua pelan, awam + akaun.
  Skrin penuh `components/Timer.astro`: langkah dari `Sesi.segmen` (enjin `plan-5k.ts` / `distance-plan.ts`
  - tambah `segmen` bila buat jenis sesi baru), masa dari jam dinding (`lib/timer.ts`), bunyi + getaran
  setiap tukar langkah, detik 3-2-1, Wake Lock, Jeda / Langkau, Esc atau X tanya dulu di tengah sesi.
  Tamat -> "Tanda siap" = event `change` pada kotak sesi (simpan + segerak awan seperti biasa).
  Semak: `bun scripts/check-timer.ts` (jalan-lari = tepat minit kad).
- [ ] Uji pada telefon sebenar: bunyi iOS (suis senyap mematikan Web Audio), getaran (iOS tiada
  `navigator.vibrate`), Wake Lock Safari 16.4+.

## Terlepas sesi -> sambung (2026-10-18) - siap

- Pelan bertarikh (5K + 10K/21K, awam + akaun): notis "Terlepas sesi? Tak apa." bila ada minggu sebelum
  minggu semasa yang terlepas (lepas sesi terakhir yang ditanda). Butang "Sambung dari Minggu N" = buka
  semula pelan dengan `mula` baru supaya minggu N mula Isnin depan (hari ini kalau Isnin). Tanda siap ikut
  nombor minggu jadi kekal; awan ikut sendiri (`mountCloudBox`: param berubah -> pelayar menang).
  Logik `resumePoint` dalam `lib/plan-5k.ts`, notis `mountResume` dalam `lib/plan-render.ts`,
  semak dalam `bun scripts/check-plan-5k.ts`.
- [ ] Fail `.ics` lama tak berubah sendiri - notis menyuruh muat turun semula. Langganan `webcal` (IDEA.md) selesaikan ini.

## Kalkulator pace + pelan seterusnya (2026-10-18) - siap

- `/pace` (awam, statik, pautan header desktop): jarak (5K/10K/21K/42K/lain km) + masa atau pace ->
  pace, masa, km/j, anggaran jarak lain (Riegel, dilabel kasar). Logik `src/lib/pace.ts`.
- Kad hari ujian 5K / lumba 10K / 21K: borang "Masa sebenar anda" -> tanda sesi itu siap + cadangan
  `nextPlan`: 5K <= 30 min -> 10K; 5K > 30 -> pelan 5K baru dari masa itu (atau 10K); 10K -> 21K;
  21K -> ramalan maraton saja. Masa dibundar ke atas. Pautan 10K/21K = akaun.
- Semak: `bun scripts/check-pace.ts` (setiap pautan pelan seterusnya membuka pelan yang sah).

## Kongsi pelan + panduan pemula (2026-10-18) - siap

- "Kongsi" (5K dan kini 10K/21K): `shareLink` dalam `lib/plan-render.ts` - 5K berkongsi halaman awam
  `/plan-5k` (kawan tak perlu akaun), 10K/21K `/account/distance-plan` (kawan perlu akaun). Param MAF
  (`maf`, `umur`, `keadaan`) dibuang - peribadi. Tarikh mula kekal supaya jadual sama untuk lari berdua.
- `/guide` (statik, pautan header desktop + "Sebelum mula" dalam kedua-dua pelan): asas setiap larian,
  kasut, cuaca panas (KKM), keselamatan, bila berhenti, senarai semak hari lumba (cetak senarai saja:
  `body.cetak-senarai`). **Setiap nasihat kesihatan mesti dari sumber rasmi yang disenaraikan di halaman**
  (NHS, KKM melalui Berita RTM - moh.gov.my menyekat bacaan automatik). Angka tanpa sumber rasmi (contoh
  jarak tukar kasut) sengaja tak ditulis. Semak semula pautan sumber setiap 6 bulan.
