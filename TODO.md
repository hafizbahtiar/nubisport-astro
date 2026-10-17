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
- **Akaun dikongsi** dengan portfolio (satu jadual `users`). Cookie API (`api.hafizbahtiar.com`)
  SameSite=Lax - Nubi subdomain yang sama, jadi `credentials: "include"` berfungsi.
- Palet: navy `#0A1A33`, oren `#FF5A1F`, oren teks atas putih `#C2410C`. Font paparan Barlow Condensed.
- **Pelan 5K** (`/pelan-5k`): logik tulen dalam `src/lib/pelan-5k.ts` (dikira dalam browser - laman statik,
  jadi `?bulan=&tahap=&masa=&hari=&mula=` dibaca oleh skrip page). Tukar logik = jalankan
  `bun scripts/check-pelan-5k.ts` (setiap gabungan input: bilangan minggu, lonjakan ≤ 10%, minggu ringan
  setiap ke-4, minggu akhir ujian, kes tak munasabah ditolak). Gaya page `is:global` sebab hasil
  dirender dengan `innerHTML`. Tanda siap = localStorage `pelan-5k:<bulan>-<tahap>-<masa>-<hari>`.
- `Header.astro` / `Footer.astro` dikongsi semua page.
- Semak: `bun run build` + `bun scripts/check-pelan-5k.ts`. Belum ada lint.

## 🚀 Owner - langkah manual

- [ ] Backend: `wrangler d1 export`, `bun run db:migrate:remote` (025 per-app roles), `wrangler deploy`
  (CORS untuk domain Nubi ikut deploy ini).
- [ ] Isi `CONTACT` (WhatsApp group / Instagram / e-mel) - seksyen "Sertai" kosong sampai ini diisi.
- [ ] Lantik admin Nubi di portfolio `/admin/app-access`.
- [ ] Bila Nubi ada login: tambah domain ke `TURNSTILE_HOSTNAMES` (backend) + hostname widget Turnstile.
- [ ] Semak pratonton pautan selepas deploy (WhatsApp / Facebook debugger) - `og.png`.

## 🛠 Frontend - seterusnya

- [ ] Favicon 16px: dua garis N terlalu halus di tab - minta pereka versi favicon garis lebih tebal.
- [ ] Label hero "Running Community · Est. 2026" - kekal atau buang (wordmark kini "NUBI SPORT").
- [ ] Gambar sebenar komuniti (larian kumpulan) - laman kini teks + jata sahaja. Perlu kebenaran orang
  dalam gambar.
- [ ] `robots.txt` + `sitemap` (bila ada lebih dari satu page).
- [ ] Analitik ringkas tanpa cookie (Cloudflare Web Analytics) - jika perlu.
- [ ] Mod gelap? Laman kini sengaja terang + navy; buat hanya jika diminta.

## 💡 Idea (belum diputuskan - bincang dulu sebelum bina)

Disusun ikut nilai untuk pemula, yang paling murah dulu.

### Tanpa backend (statik)
- **Jadual larian mingguan** - hari, masa, lokasi (pautan Google Maps), jarak, pace "santai". Data
  dalam `src/data/` - admin edit melalui git sehingga ada CMS.
- **Panduan pemula** - kasut, pemanasan, hidrasi, cuaca panas Malaysia, keselamatan larian malam.
- **Kalkulator pace** - masa ↔ pace ↔ jarak (5K/10K/21K), dikira dalam browser.
- **Kod etika kumpulan** - tiada siapa ditinggalkan, sweeper di belakang, hormat laluan awam.

### Dengan backend (`hono-workers`, guna `requireAppRole`)
- **Acara + RSVP** - admin Nubi cipta sesi larian; ahli tekan "Saya datang". Jadual `nubi_events`,
  `nubi_rsvps`. Kiraan hadir untuk penganjur.
- **Pendaftaran ahli** - guna akaun sedia ada (login dikongsi) + profil Nubi (nama panggilan, tahap:
  pemula / 5K / 10K). Perlu Turnstile.
- **Log larian peribadi** - jarak + masa setiap sesi, graf kemajuan. Data peribadi: privasi dulu
  (lalai: hanya diri sendiri nampak).
- **Lencana pencapaian** - 5K pertama, 10 sesi hadir, sebulan konsisten. Motivasi untuk pemula.
- **Pengumuman** - admin Nubi hantar notis (batal sebab hujan, tukar lokasi). Boleh sambung bot
  Telegram sedia ada di backend.
- **Peranan `coach`** - boleh urus acara tapi bukan ahli lain. Migration baru menambah ke `app_roles`.

### Integrasi
- **Strava** - kelab Strava + pautan, atau import aktiviti (OAuth, kerja besar - tangguh).
- **Cuaca** - ramalan MET untuk lokasi larian (portfolio dah ada `lib/ramalan-cuaca.ts`; boleh jadi
  endpoint kongsi di backend).
- **Kualiti udara** - amaran IPU jerebu sebelum sesi (portfolio `lib/ipu.ts`).
- **Kalendar** - fail `.ics` untuk jadual mingguan.

## Pelan 5K bawah 30 minit (`/pelan-5k`) - susulan

- [ ] **Semakan kandungan latihan** oleh jurulatih bertauliah sebelum dipromosi. Ambang "munasabah"
  (`MINGGU_MIN`, `MINGGU_SETIAP_MINIT`) dan zon pace ialah anggaran kasar.
- [ ] Unit: kini minit (+ pace /km). Tambah km bagi yang ada jam GPS?
- [ ] Fail `.ics` (satu acara setiap sesi, dari tarikh mula).
- [ ] Sasaran lain (bawah 28 / 25 minit, 10K) - `buatPelan` kini tetap 30 minit.
- [ ] Perlu backend: simpan pelan ke akaun, log larian sebenar vs pelan, coach pantau ahli.

## Soalan terbuka
- Nama: "Nubi Sport" kekal larian sahaja, atau nanti sukan lain (badminton, kayuh)?
- Yuran / jersi kumpulan? Jika ya, jangan kendalikan bayaran di laman - pautan ke pihak ketiga.
- Bahasa: Melayu sahaja, atau tambah English?
