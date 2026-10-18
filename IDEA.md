# Idea - Nubi Sport

Belum diputuskan: bincang dulu sebelum bina. Disusun ikut nilai untuk **pemula**, kemudian kos
(Cloudflare, masa bina, risiko). Kerja yang dah diputuskan pergi ke `TODO.md`.
Semakan terakhir: 2026-10-18.

## Sudah ada

Pelan 5K bawah 30 minit · Pelan 10K / 21K (akaun) · **pemasa jalan-lari** · **sambung selepas terlepas sesi** · **kalkulator pace** (`/pace`) · **pelan seterusnya selepas hari ujian/lumba** · **kongsi pelan dengan kawan** · **panduan pemula + senarai semak hari lumba** (`/panduan`) · MAF / lari ikut nadi · fail `.ics` · had 3 pelan
tanpa akaun · daftar + sahkan e-mel · profil + tukar kata laluan · simpan ke awan (3 slot, segerak tanda siap)
· notis luar talian · **kad "Sesuai lari tak?"** (IPU JAS + ramalan MET ikut negeri) · **mod Ramadan**
(sesi dalam Hijri 9 ditag "Puasa" + banner nasihat) · **waktu lari terbaik hari ini** (JAKIM + MET, elak
11 pagi - 4 petang ikut KKM) · **kalkulator peluh** (`/panduan#peluh`, ACSM).

## Peraturan untuk setiap idea

- **Pemula dulu.** Jika ia hanya berguna kepada pelari laju, letak di bawah.
- **Kira dalam pelayar bila boleh.** Worker hanya untuk `/api/*`; page statik = percuma.
- **Data peribadi** (nadi, berat, log): lalai hanya pemilik nampak. Tiada PII dalam prompt AI.
- **Kesihatan:** sentiasa "panduan umum, bukan nasihat perubatan". Jangan diagnosis kecederaan.
- **Sumber rasmi sahaja** untuk data luar (MET, JAS, JAKIM, penganjur lumba) - bukan blog/berita.
- Storan akaun baru = jenis baru dalam `app_items` (`/me/apps/nubi/<kind>`) + had dalam `QUOTA`, bukan
  jadual baru, selagi data itu milik seorang pengguna.

## Gelombang 1 - siap (2026-10-18)

Semua dibina - lihat "Sudah ada" dan `TODO.md`.

## Gelombang 2 - konteks Malaysia (data dah wujud di portfolio)

| Idea | Kenapa | Nota bina |
|---|---|---|
| **Kalendar lumba Malaysia** | Sasaran = motivasi | Tiada API terbuka (semakan 2026-10-18; Ahotu hanya perkongsian syarikat). Senarai susun tangan `src/data/lumba.ts` (pautan rasmi penganjur + `disemak`, skrip semak gagal > 3 bulan), `.ics` per acara. Kemudian: borang hantar acara -> admin lulus |

## Gelombang 3 - komuniti (perlu backend, ikut `requireAppRole`)

| Idea | Kenapa | Nota bina |
|---|---|---|
| **Jadual larian + RSVP** | Teras "komuniti" - sekarang laman tiada acara | `nubi_events` + `nubi_rsvps` (data dikongsi, bukan `app_items`). Admin Nubi cipta; ahli "Saya datang"; kiraan hadir; pautan Google Maps; `.ics` acara |
| **Pengumuman** | Batal sebab hujan / tukar lokasi | Admin Nubi hantar; sambung bot Telegram sedia ada. Push web tangguh (kos + kebenaran) |
| **Log larian ringkas** | Lihat kemajuan sebenar vs pelan | `app_items` kind `log`: tarikh, jarak, masa, nadi purata, rasa 1-5. Graf dalam pelayar. Had sederhana (contoh 500 rekod) |
| **Lencana pencapaian** | Motivasi pemula | Dikira dari tanda siap + log + RSVP: 5K pertama, 10 sesi hadir, 4 minggu konsisten, MAF bertambah baik. Tiada jadual baru jika dikira |
| **Peranan `coach`** | Jurulatih pantau ahli yang setuju | Role baru `app_roles`; ahli pilih "kongsi pelan dengan coach" (lalai tidak). Bergantung pada semakan jurulatih bertauliah dulu |
| **Langganan kalendar** | `.ics` sekali tak ikut perubahan | `webcal://` dari backend ikut token peribadi (boleh ditarik balik). Kos rendah, cache |

## Kemudian / perlu keputusan owner

- **Ujian masa pertengahan pelan** (contoh minggu 6) yang mengemas kini pace sesi baki - kini hanya di hujung
  pelan. Perlu enjin terima "pace sekarang" pada minggu tengah.
- **Pelan maraton** - `pelanSeterusnya` dari 21K kini hanya beri ramalan.

- **Ulang minggu ini** (dah buat tapi terasa berat) - kini hanya "terlepas" yang dianjak. Ulang = anjak + buang
  tanda minggu itu; tunggu maklum balas ahli dulu.

- **Tanya jurulatih (AI)** - lapisan AI backend siap (`getAi`, `APP_CONTEXT`). Perlu: kunci Command Code,
  had kadar setiap pengguna, konteks = pelan + log tanpa PII, jawapan "panduan umum", tolak soalan perubatan.
- **Tier berbayar** - lebih slot awan (`quotaFor` sahaja berubah, `docs/plans/simpan-awan.md`). Bayaran
  melalui pihak ketiga, bukan di laman.
- **Strava** - kelab + pautan dulu; import aktiviti (OAuth) = kerja besar + terma API.
- **PWA penuh** - service worker supaya pelan + pemasa (dah ada, berjalan tanpa rangkaian selepas dibuka) boleh
  dibuka tanpa internet (taman sering tiada liputan).
- **Suara Melayu dalam pemasa** - pemasa kini bunyi + getaran sahaja; `speechSynthesis` ms-MY tak ada di
  kebanyakan telefon (suara English sebut "Lari" pelik). Rakaman suara pendek jika diminta.
- **Zon nadi 1-5 (Karvonen)** - selain MAF. 220-umur sangat kasar; dilabel anggaran.
- **Kod etika kumpulan** - tiada siapa ditinggalkan, sweeper di belakang, hormat laluan awam. Bila ada acara.

## Ditolak (buat masa ini)

- **Peta laluan / GPS rakam larian** - telefon & jam dah buat lebih baik; kos + privasi lokasi.
- **Leaderboard pace** - menakutkan pemula; bertentangan dengan tujuan komuniti.
- **Diagnosis kecederaan** - risiko; hanya "berhenti, rehat, jumpa doktor/fisioterapi".
- **Scraping kalendar lumba** - terma laman + mudah rosak.
