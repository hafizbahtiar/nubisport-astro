# Idea - Nubi Sport

Belum diputuskan: bincang dulu sebelum bina. Disusun ikut nilai untuk **pemula**, kemudian kos
(Cloudflare, masa bina, risiko). Kerja yang dah diputuskan pergi ke `TODO.md`.
Semakan terakhir: 2026-10-22.

## Dah ada

Pelan 5K bawah 30 minit · Pelan 10K / 21K · **Pelan 42K maraton** (`/account/plans/42k/new`, bertangga dari masa 21K) (akaun) ·
**nasihat pemula** (pelan 10K/21K/42K: "Saya pemula" -> mula dari Pelan 5K tahap sifar) · **pemasa jalan-lari** · **sambung lepas terlepas sesi** · **kalkulator pace** (`/pace`) · **pelan seterusnya lepas hari ujian/lumba** · **kongsi pelan dengan kawan** · **panduan pemula + senarai semak hari lumba** (`/guide`) · MAF / lari ikut nadi · fail `.ics` · had 3 pelan
tanpa akaun · daftar + sahkan e-mel · profil (Maklumat / Latihan / Keselamatan) + tukar kata laluan · simpan ke awan
(percuma 1 slot, ahli 5, admin 10; segerak tanda siap) · **aktiviti Strava** (ahli muat naik `.fit` + `.gpx`,
peta laluan peribadi) · **pelan aktif + padanan Strava** (sesi ditanda sendiri; sesi laju perlukan nadi
vigorous ACSM; padam aktiviti tanya dulu sebelum buang tanda) · **bot Telegram** (`/bind` pautkan akaun,
`/nubiplan` lihat pelan, `/unbind`; nyahpaut juga dari profil) · **larian kumpulan + RSVP**
(`/account/events`: admin Nubi cipta, ahli "Saya datang", admin tanda **hadir sebenar** - RSVP ≠ hadir,
lencana kira hadir; had peserta pilihan; Google Maps, `.ics`)
· notis luar talian · **kad "Sesuai lari hari ini?"** (IPU JAS + ramalan MET ikut negeri) · **mod Ramadan**
(sesi dalam Hijri 9 ditag "Puasa" + banner nasihat) · **waktu lari terbaik hari ini** (JAKIM + MET, elak
11 pagi - 4 petang ikut KKM) · **kalkulator peluh** (`/guide#peluh`, ACSM) · **kalendar lumba** (`/races`, susun tangan
`src/data/races.ts`, `.ics` per acara).

## Peraturan untuk setiap idea

- **Pemula dulu.** Kalau ia hanya berguna kepada pelari laju, letak di bawah.
- **Kira dalam pelayar bila boleh.** Worker hanya untuk `/api/*`; halaman statik = percuma.
- **Data peribadi** (nadi, berat, log): lalai hanya pemilik nampak. Tiada PII dalam prompt AI.
- **Kesihatan:** sentiasa "panduan umum, bukan nasihat perubatan". Jangan diagnosis kecederaan.
- **Sumber rasmi saja** untuk data luar (MET, JAS, JAKIM, penganjur lumba) - bukan blog/berita.
- Storan akaun baru = jenis baru dalam `app_items` (`/me/apps/nubi/<kind>`) + had dalam `QUOTA`, bukan
  jadual baru, selagi data itu milik seorang pengguna.

## Gelombang 1 - siap (2026-10-18)

Semua dibina - lihat "Dah ada" dan `TODO.md`.

## Gelombang 2 - konteks Malaysia

| Idea | Kenapa | Nota bina |
|---|---|---|
| **Hantar acara lumba** | Senarai susun tangan lambat bertambah | Borang awam -> admin Nubi lulus -> masuk kalendar (perlu jadual kongsi, bukan `app_items`). Kini: owner tambah dalam `src/data/races.ts` |

## Gelombang 3 - komuniti (perlu backend, ikut `requireAppRole`)

| Idea | Kenapa | Nota bina |
|---|---|---|
| **Larian kumpulan - baki** | Asas dah dibina (lihat "Dah ada") | Belum: senarai awam tanpa log masuk, larian berulang mingguan, senarai menunggu bila penuh |
| **Pengumuman** | Batal sebab hujan / tukar lokasi | Admin Nubi hantar; sambung bot Telegram sedia ada. Hantar ke ramai RSVP = kerja latar -> Cloudflare Queues sesuai di sini (free: 10k operasi/hari, ~3 operasi setiap mesej). Push web tangguh (kos + kebenaran) |
| **Log larian ringkas** | Lihat kemajuan sebenar vs pelan | Sebahagian dah ada untuk ahli: aktiviti Strava + bar beban mingguan. Baki: log manual untuk bukan ahli / tanpa jam (`app_items` kind `log`: tarikh, jarak, masa, rasa 1-5) |
| **Lencana pencapaian** | Motivasi pemula | Dikira dari tanda siap + log + RSVP: 5K pertama, 10 sesi hadir, 4 minggu konsisten, MAF bertambah baik. Tiada jadual baru kalau dikira |
| **Peranan `coach`** | Jurulatih pantau ahli yang setuju | Role baru `app_roles`; ahli pilih "kongsi pelan dengan coach" (lalai tak). Bergantung pada semakan jurulatih bertauliah dulu |
| **Langganan kalendar** | `.ics` sekali tak ikut perubahan | `webcal://` dari backend ikut token peribadi (boleh ditarik balik). Kos rendah, cache |

## AI - owner & admin Nubi saja

Hari ini Nubi belum ada kandungan yang ditulis admin (pelan, MAF, pace, panduan semua dikira atau statik), jadi
AI masuk **bersama** modul Gelombang 3 / kalendar lumba - bukan sebelum. Ahli biasa tak nampak AI.

| Modul | AI buat apa | Nota |
|---|---|---|
| **Pengumuman** | Admin tulis poin ringkas ("batal, hujan, 7 pagi Sabtu") -> draf pengumuman Melayu + versi Telegram pendek | Fakta = medan borang saja; tiada nama ahli |
| **Jadual larian + RSVP** | Draf penerangan acara dari tarikh, lokasi, jarak, pace kumpulan: "apa perlu dibawa", titik kumpul, sweeper | Lokasi/masa dari borang, AI tak teka parkir atau laluan |
| **Kalendar lumba** | Admin tampal teks dari laman **rasmi** penganjur -> AI isi medan (nama, tarikh, jarak, yuran, tarikh tutup, pautan) untuk disemak | AI hanya ekstrak dari teks yang ditampal, tak pernah dari ingatan; admin sahkan dengan sumber sebelum simpan (`disemak`) |
| **Terjemah BM <-> EN** | Pengumuman / penerangan acara untuk ahli bukan Melayu | Butang pada medan yang sama |
| **Ringkasan minggu untuk admin** | Angka agregat (pelan dibuat, sesi siap, RSVP) -> 3-4 ayat "minggu ini" | Hanya kiraan, tiada data individu. Perlu kiraan wujud dulu |

Cara bina (semua dah ada di portfolio - guna semula, jangan bina lapisan baru):
- UI = corak `useAiField` portfolio: **Generate** / **Prompt**, cadangan dengan **Guna** / **Cuba lagi** / **Buang**.
  Tiada apa ditulis atau diterbitkan tanpa admin tekan Guna.
- Backend = `getAi` + satu use case baru `nubi` dalam `AI_ROUTES` (model dipilih owner di portfolio `/admin/ai`),
  medan dalam `AI_FIELDS`, prompt = `APP_CONTEXT` + tugas Nubi (Melayu, nada mesra pemula, tiada janji kesihatan).
- Gate: `requireAppRole('nubi', 'admin')` + owner. `/owner/ai/generate` kini owner saja - admin Nubi perlu route
  sendiri di bawah app Nubi, dengan had kadar setiap pengguna (contoh 30 panggilan sehari) sebab kos sebenar.
- Tiada PII dalam prompt (nama, e-mel, nadi, berat ahli). Kunci `COMMANDCODE_API_KEY` mesti diset dulu.

## Kemudian / perlu keputusan owner

- **Ujian masa pertengahan pelan** (contoh minggu 6) yang mengemas kini pace sesi baki - kini hanya di hujung
  pelan. Perlu enjin terima "pace sekarang" pada minggu tengah.
- **Ulang minggu ini** (dah buat tapi terasa berat) - kini hanya "terlepas" yang dianjak. Ulang = anjak + buang
  tanda minggu itu; tunggu maklum balas ahli dulu.

- **Tanya jurulatih (AI) untuk ahli** - lepas AI admin terbukti (kos + kualiti). Lapisan AI backend siap (`getAi`, `APP_CONTEXT`). Perlu: kunci Command Code,
  had kadar setiap pengguna, konteks = pelan + log tanpa PII, jawapan "panduan umum", tolak soalan perubatan.
- **Tier berbayar** - lebih slot awan (`quotaFor` saja berubah, `docs/plans/cloud-sync.md`). Bayaran
  melalui pihak ketiga, bukan di laman.
- **Strava OAuth/API** - ditolak (kos). Muat naik fail `.fit`/`.gpx` sudah dibina (lihat "Dah ada").
- **Semakan sesi laju yang tepat** - padanan kini guna nadi puncak sahaja (ACSM: < 77% HRmax = larian mudah).
  Pelari muda yang ikut MAF boleh lepas 77% pada larian mudah. Tepat = semak blok laju dari fail FIT
  (`activity-analysis.ts`), tapi terlalu berat untuk sync pukal.
- **PWA penuh** - service worker supaya pelan + pemasa (dah ada, berjalan tanpa rangkaian lepas dibuka) boleh
  dibuka tanpa internet (taman sering tiada liputan).
- **Suara Melayu dalam pemasa** - pemasa kini bunyi + getaran saja; `speechSynthesis` ms-MY tak ada di
  kebanyakan telefon (suara English sebut "Lari" pelik). Rakaman suara pendek kalau diminta.
- **Zon nadi 1-5** - selain MAF. Guna HRmax Tanaka (208 − 0.7 × umur, ACSM - sudah dalam padanan Strava),
  bukan 220 − umur; zon ikut jadual intensiti ACSM. Dilabel anggaran. Sumber: `docs/training-review.md`.
- **Kod etika kumpulan** - tiada siapa ditinggalkan, sweeper di belakang, hormat laluan awam. Bila ada acara.

## Ditolak (buat masa ini)

- **Rakam larian / GPS dalam app** - telefon & jam dah buat lebih baik. (Peta laluan **peribadi** dari fail Strava ahli = dibina, `/account/activities/view`; peta awam / dikongsi kekal ditolak - privasi lokasi.)
- **Leaderboard pace** - menakutkan pemula; bertentangan dengan tujuan komuniti.
- **Diagnosis kecederaan** - risiko; hanya "berhenti, rehat, jumpa doktor/fisioterapi".
- **Scraping kalendar lumba** - terma laman + mudah rosak.
