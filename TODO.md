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
  semak peranan di frontend sahaja. Peranan baru (contoh `coach`) = migration baru di backend, bukan page.
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
  `src/components/ui/`: `PageHero` (kepala page gelap + slot borang), `Section`, `ChipGroup` (radio pil,
  `stacked` untuk label panjang), `Checkbox` (kelas `.check`; medan bergantung = `<fieldset class="form-group"
  hidden disabled>` ditogol skrip), `Field` (label + input + petunjuk; `for` untuk kawalan berbilang
  elemen), `Alert`, `DatePicker` (dd/mm/yyyy + kalendar, hantar ISO dari input tersembunyi `id`/`name`;
  isi dari skrip = set nilai + `change`; logik `src/lib/tarikh.ts`, semak `bun scripts/check-tarikh.ts`).
  Jangan guna `<input type="date">` - format ikut locale pelayar, bukan dd/mm/yyyy.
  **Ikon = Lucide sahaja** (`lucide-static`): `<Ikon nama="..." />` dalam Astro, `ikon("...")` dalam skrip
  (`src/lib/ikon.ts` - daftar ikon baru di situ). Jangan lukis path SVG sendiri; pengecualian = jenama dan
  tanda semak `.check` (path Lucide `check` dalam CSS). `Layout.astro` sudah ada
  `Header` + `<main>` + `Footer` (`src/components/layout/`) - page hanya tulis kandungan. HTML dari skrip
  (`innerHTML`) guna kelas global yang sama. Jangan buat warna/butang baru dalam page - tambah ke global.
  Formatter memecah baris sebelum `<strong>`/`<a>` dan Astro buang ruang itu - tulis `{" "}` di hujung baris.
- **Login** (`/login`): `src/lib/api.ts` (`api()` = `/api/v1` + satu refresh dikongsi bila 401, `saya()` =
  `/me` jika cookie `session_active`). Turnstile widget yang sama dengan portfolio (kunci tapak dalam
  `src/data/site.ts`, action `login`). Daftar di `/register`, urus profil di `/account/profil`. Header tukar
  "Log masuk" -> "Akaun" bila `session_active`. Kebenaran sebenar sentiasa di backend.
- **Penafian / info**: setiap page pelan ada "bukan nasihat perubatan" + "belum disemak jurulatih bertauliah"
  (`docs/semakan-latihan.md`); login/daftar menyebut 3 slot awan. Tukar teks itu bila had atau status semakan berubah.
- **Daftar / sahkan** (`/register`, `/verify`): daftar hantar `app: "nubi"`, jadi pautan e-mel ke
  `nubisport.hafizbahtiar.com/verify`. Alamat pautan datang dari senarai `APP_SITES` di backend
  (`services/registration.ts`) - laman baru = entri baru di situ; URL tidak pernah diterima dari klien
  (kod app tak dikenali = 400). Hantar semula pautan hanya dari `/verify` (Turnstile action `register`).
- **Ahli ≠ berdaftar**: ahli = peranan app `nubi/ahli` (migration 026), diluluskan owner/admin di
  portfolio `/admin/app-access`. Berdaftar + disahkan sahaja = "Pengguna berdaftar - belum ahli".
- **Kalendar** (`src/lib/ics.ts`, generik - guna semula untuk 10K/21K): `.ics` RFC 5545, masa Malaysia
  (UTC+8) disimpan UTC, UID tetap `pelan-5k-<kunci>-m<w>s<i>@nubisport.hafizbahtiar.com`, peringatan
  30 min. Semak `bun scripts/check-ics.ts`.
- **Had pelan tanpa akaun**: 3 pelan berbeza (`HAD_TANPA_AKAUN`, localStorage `pelan-5k:dibuat`; buka
  semula tidak dikira; `session_active=1` = tiada had). Had LEMBUT sahaja (incognito memintas) - had
  keras perlu pelan dijana di server.
- **Akaun (`/account/*`)**: `AccountLayout.astro` - sidebar (laci bawah 64rem: Esc / scrim tutup), navbar,
  kandungan lebar penuh. Layout = satu-satunya pengawal sesi (tiada sesi -> `/login?next=`); page ambil
  pengguna dengan `sesiSaya()` (`lib/api.ts`, satu /me dikongsi). `/login` lencong ke `?next=` (laluan
  dalaman sahaja) atau `/account`. Header awam: "Akaun" -> `/account`. `<head>` dikongsi = `Head.astro`.
  Item yang dijana skrip perlu `:global(...)` dalam `<style>` page (tiada atribut skop Astro).
- **Pelan 5K awam vs penuh**: `components/Pelan5k.astro` (kandungan sahaja; page pilih layout).
  `/pelan-5k` = pelan + label "Realistik ke?" + kotak promosi; log masuk -> lencong ke `/account/pelan-5k`
  (`penuh`: pecahan analisis, ikut nadi MAF, .ics, tiada had 3 pelan). Sekatan di pelayar sahaja.
  Storan pelan = `lib/pelan-tersimpan.ts` (`baca`/`simpan`/`padamPelan`); dashboard baca `pelan-5k:dibuat` - pelan per pelayar, bukan per akaun (simpan di D1 = kemudian).
  Padam pelan: dashboard + pelan penuh sahaja (di awam ia membuka semula slot had 3 pelan).
- **Akaun lain**: `/account/maf` (`components/Maf.astro penuh`: simpan `maf:terakhir` untuk dashboard + butang
  Pelan 5K ikut nadi; `/maf` lencong ke situ bila log masuk), `/account/profil` (Maklumat: nama `PATCH /me`) +
  `/account/profil/kata-laluan` (`PUT /me/password` - tamatkan semua sesi); navigasi = card dalam `components/ProfilShell.astro` (tab segmen bawah 48rem). Sidebar: X tutup laci (telefon) / lipat (desktop, `akaun:sidebar`).
- **Simpan awan**: akaun percuma 3 slot (`lib/awan.ts`, backend `/me/apps/nubi/plan`, migration 029).
  Pelayar = salinan kerja, awan = ikut akaun; dashboard: lencana Awan / Peranti ini, meter slot, "Ganti"
  bila penuh. Naikkan `VERSI_ENJIN` bila enjin pelan berubah. Langganan: `docs/plans/simpan-awan.md`.
- **Dialog sahkan**: `await sahkan({ tajuk, mesej, ya, bahaya })` (`lib/sahkan.ts`) atas `ConfirmDialog.astro`
  (dipasang sekali dalam `Layout` + `AccountLayout`). Untuk padam pelan dan log keluar; jangan guna `confirm()`.
- **Pelan 5K dinamik**: dengan masa 5K (wajib tahap "5k", pilihan "jalan"), pace interval/tempo
  turun setiap sesi laju dari pace sekarang ke 6:00/km; sesi mudah seminggu berbeza panjang; Daya
  tahan ada langkah laju; fasa Asas ulang langkah lama di sesi pertama. "Realistik ke?" = `analisis()`
  (munasabah >= 100% minggu perlu, mencabar >= 75%, selain itu tak realistik) - anggaran kasar, sama
  dengan ambang `mingguPerlu`.
- **Pelan 5K + MAF**: kotak semak "Ikut nadi" (`?maf=1&umur=&keadaan=`) -> `buatPelan({ nadi })`: sesi mudah /
  panjang / jalan-lari bawa julat nadi, interval/tempo diberi nota "melebihi had". Minit sesi tak berubah
  (kunci tanda siap sama).
- **MAF** (`/maf`): formula 180 Maffetone dalam `src/lib/maf.ts` (16 ke bawah = 165; +10 untuk >65 hanya
  nota, bukan automatik), disemak `bun scripts/check-maf.ts` terhadap philmaffetone.com/180-formula.
  Julat "MAF-10 hingga MAF" dilabel amalan biasa - sumber hanya kata had atas.
- Palet: navy `#0A1A33`, oren `#FF5A1F`, oren teks atas putih `#C2410C`. Font paparan Barlow Condensed.
- **Pelan 5K** (`/pelan-5k`): logik tulen dalam `src/lib/pelan-5k.ts` (dikira dalam browser - laman statik,
  jadi `?bulan=&tahap=&masa=&hari=&mula=` dibaca oleh skrip page). Tukar logik = jalankan
  `bun scripts/check-pelan-5k.ts` (setiap gabungan input: bilangan minggu, lonjakan ≤ 10%, minggu ringan
  setiap ke-4, minggu akhir ujian, kes tak munasabah ditolak). Gaya page `is:global` sebab hasil
  dirender dengan `innerHTML`. Tanda siap = localStorage `pelan-5k:<bulan>-<tahap>-<masa>-<hari>`.
  Hari sesi tetap (`HARI_SESI`: 3 hari = Isn/Rab/Sab, 4 hari = Isn/Rab/Jum/Ahd - sesi akhir hujung
  minggu); `mula` dianjak ke Isnin (`isninMula`) dan minggu semasa + sesi hari ini diserlahkan.
- Semak: `bun run build` + `bun scripts/check-pelan-5k.ts` + `bun scripts/check-maf.ts` +
  `bun scripts/check-ics.ts` + `bun scripts/check-tarikh.ts`. Belum ada lint.

## 🚀 Owner - langkah manual

- [ ] Isi `CONTACT` (WhatsApp group / Instagram / e-mel) - seksyen "Sertai" kosong sampai ini diisi.
- [ ] Lantik admin Nubi di portfolio `/admin/app-access`.
- [ ] **Login / daftar production - ikut urutan**: (1) dashboard Cloudflare -> Turnstile -> widget
  portfolio -> tambah hostname `nubisport.hafizbahtiar.com`; (2) `bun run db:migrate:remote` dalam
  `hono-workers` (026, peranan `ahli`); (3) deploy `hono-workers` - mesti SEBELUM push Nubi, backend lama
  tolak `app` (daftar jadi 400); (4) push repo ini; (5) deploy portfolio (dropdown peranan App Access kini
  tiada pilihan lalai).
- [ ] Uji import `.ics` pada iPhone (Safari: terus "Tambah semua" atau simpan ke Files?), Samsung Calendar,
  Google Calendar (web) dan Outlook - nota platform di page belum diuji pada peranti sebenar.
- [ ] E-mel pengesahan untuk `app=nubi` masih teks English dari pengirim portfolio - mahu versi Melayu?
- [ ] Semak pratonton pautan selepas deploy (WhatsApp / Facebook debugger) - `og.png`.

## 🛠 Frontend - seterusnya

- [ ] Favicon 16px: dua garis N terlalu halus di tab - minta pereka versi favicon garis lebih tebal.
- [ ] Label hero "Running Community · Est. 2026" - kekal atau buang (wordmark kini "NUBI SPORT").
- [ ] Gambar sebenar komuniti (larian kumpulan) - laman kini teks + jata sahaja. Perlu kebenaran orang
  dalam gambar.
- [ ] `robots.txt` + `sitemap` (bila ada lebih dari satu page).
- [ ] Analitik ringkas tanpa cookie (Cloudflare Web Analytics) - jika perlu.
- [ ] Mod gelap? Laman kini sengaja terang + navy; buat hanya jika diminta.

## 💡 Idea

Semua idea (belum diputuskan, disusun ikut gelombang) dalam **`IDEA.md`**. Yang diputuskan -> pindah ke sini.

## Pelan 5K bawah 30 minit (`/pelan-5k`) - susulan

- [ ] **Semakan kandungan latihan** oleh jurulatih bertauliah sebelum dipromosi. Semakan dalaman
  (sumber awam) siap 2026-10-18: `docs/semakan-latihan.md` - 3 pembetulan (langkah 25 min, puncak
  10K 10 km, 21K 16 km); senarai semak untuk jurulatih di situ. Ambang munasabah + zon pace masih anggaran.
- [ ] Unit: kini minit (+ pace /km). Tambah km bagi yang ada jam GPS?
- [ ] Sasaran lain (bawah 28 / 25 minit) - `buatPelan` kini tetap 30 minit. (10K/21K: `/account/pelan-jarak`.)
- [ ] Perlu backend: simpan pelan ke akaun, log larian sebenar vs pelan, coach pantau ahli.

## Soalan terbuka
- Nama: "Nubi Sport" kekal larian sahaja, atau nanti sukan lain (badminton, kayuh)?
- Yuran / jersi kumpulan? Jika ya, jangan kendalikan bayaran di laman - pautan ke pihak ketiga.
- Bahasa: Melayu sahaja, atau tambah English?

## Pelan 10K / 21K (akaun sahaja) - siap

- `/account/pelan-jarak` (`components/PelanJarak.astro`, enjin `lib/pelan-jarak.ts`, semak
  `bun scripts/check-pelan-jarak.ts`). Bertangga: 10K dari masa 5K, 21K dari masa 10K; 10K 8/10/12
  minggu, 21K 12/16/20 (puncak larian panjang 10 / 16 km); sasaran lalai habis, masa sasaran pilihan (sesi laju + "Realistik ke?",
  anggaran Riegel - kasar). Kad minggu + analisis dikongsi dengan 5K (`lib/pelan-papar.ts`,
  `styles/pelan.css`). Kunci storan `pelan-10k|21k:<minggu>-<masa>-<sasaran>-<hari>`.

## Sambungan, sesi, kos (2026-10-18)

- `components/ui/Sambungan.astro` (Layout + AccountLayout): notis luar talian / kembali dalam talian.
- Salinan `/me` dalam sessionStorage `nubi:saya` (`lib/api.ts` `ingatSaya`): sidebar dilukis sebelum
  lukisan pertama; `/me` dipanggil semula hanya selepas 5 min. Log keluar / tiada cookie = dibuang.
- Kos: Worker hanya `/api/*` (aset statik percuma); `public/_headers` simpan `/_astro/*` setahun;
  `prefetch` (hover) hanya aset statik; `@view-transition` (CSS, tanpa JS), sidebar akaun kekal.

## Pemasa jalan-lari (2026-10-18) - siap

- Butang "Mula pemasa" pada setiap sesi (bukan ujian/lumba - ikut jarak) dalam semua pelan, awam + akaun.
  Skrin penuh `components/Pemasa.astro`: langkah dari `Sesi.segmen` (enjin `pelan-5k.ts` / `pelan-jarak.ts`
  - tambah `segmen` bila buat jenis sesi baru), masa dari jam dinding (`lib/pemasa.ts`), bunyi + getaran
  setiap tukar langkah, detik 3-2-1, Wake Lock, Jeda / Langkau, Esc atau X tanya dulu di tengah sesi.
  Tamat -> "Tanda siap" = event `change` pada kotak sesi (simpan + segerak awan seperti biasa).
  Semak: `bun scripts/check-pemasa.ts` (jalan-lari = tepat minit kad).
- [ ] Uji pada telefon sebenar: bunyi iOS (suis senyap mematikan Web Audio), getaran (iOS tiada
  `navigator.vibrate`), Wake Lock Safari 16.4+.

## Terlepas sesi -> sambung (2026-10-18) - siap

- Pelan bertarikh (5K + 10K/21K, awam + akaun): notis "Terlepas sesi? Tak apa." bila ada minggu sebelum
  minggu semasa yang terlepas (selepas sesi terakhir yang ditanda). Butang "Sambung dari Minggu N" = buka
  semula pelan dengan `mula` baru supaya minggu N mula Isnin depan (hari ini jika Isnin). Tanda siap ikut
  nombor minggu jadi kekal; awan ikut sendiri (`kotakAwan`: param berubah -> pelayar menang).
  Logik `sambungDari` dalam `lib/pelan-5k.ts`, notis `pasangSambung` dalam `lib/pelan-papar.ts`,
  semak dalam `bun scripts/check-pelan-5k.ts`.
- [ ] Fail `.ics` lama tak berubah sendiri - notis menyuruh muat turun semula. Langganan `webcal` (IDEA.md) selesaikan ini.

## Kalkulator pace + pelan seterusnya (2026-10-18) - siap

- `/pace` (awam, statik, pautan header desktop): jarak (5K/10K/21K/42K/lain km) + masa atau pace ->
  pace, masa, km/j, anggaran jarak lain (Riegel, dilabel kasar). Logik `src/lib/pace.ts`.
- Kad hari ujian 5K / lumba 10K / 21K: borang "Masa sebenar anda" -> tanda sesi itu siap + cadangan
  `pelanSeterusnya`: 5K <= 30 min -> 10K; 5K > 30 -> pelan 5K baru dari masa itu (atau 10K); 10K -> 21K;
  21K -> ramalan maraton sahaja. Masa dibundar ke atas. Pautan 10K/21K = akaun.
- Semak: `bun scripts/check-pace.ts` (setiap pautan pelan seterusnya membuka pelan yang sah).

## Kongsi pelan + panduan pemula (2026-10-18) - siap

- "Kongsi" (5K dan kini 10K/21K): `pautanKongsi` dalam `lib/pelan-papar.ts` - 5K berkongsi page awam
  `/pelan-5k` (kawan tak perlu akaun), 10K/21K `/account/pelan-jarak` (kawan perlu akaun). Param MAF
  (`maf`, `umur`, `keadaan`) dibuang - peribadi. Tarikh mula kekal supaya jadual sama untuk lari berdua.
- `/panduan` (statik, pautan header desktop + "Sebelum mula" dalam kedua-dua pelan): asas setiap larian,
  kasut, cuaca panas (KKM), keselamatan, bila berhenti, senarai semak hari lumba (cetak senarai sahaja:
  `body.cetak-senarai`). **Setiap nasihat kesihatan mesti dari sumber rasmi yang disenaraikan di page**
  (NHS, KKM melalui Berita RTM - moh.gov.my menyekat bacaan automatik). Angka tanpa sumber rasmi (contoh
  jarak tukar kasut) sengaja tidak ditulis. Semak semula pautan sumber setiap 6 bulan.
