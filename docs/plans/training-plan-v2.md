# Pelan latihan v2 (5K, 10K, 21K)

Status: **dibina** (2026-10-22) - item 1-5 + cadangan 1, 3, 4, 5. Cadangan 2 = TODO. Lihat "Dibina" di bawah. (Asal: bina selepas semakan kualiti sesi (`run_ratio`,
[active-plan-sync.md](./active-plan-sync.md)) siap - kedua-duanya sentuh `lib/plan-sync.ts`.)

## Kenapa

Sekarang pelan 5K diukur ikut bilangan bulan, pelan 10K/21K ikut bilangan minggu, dan pace hanya
muncul sebagai teks dalam arahan sesi. Ahli fikir dalam bentuk "lumba aku 14 Disember, pace aku
sekarang 7:00". Pelan patut bermula dari situ, dan setiap sesi patut tunjuk apa yang ahli betul-betul
buat (dari fail Strava), bukan sekadar tanda siap.

## Apa yang owner minta

1. **Pace lalai** - setiap pelan ada pace sasaran untuk setiap jenis sesi (mudah, panjang, tempo,
   interval, lumba), dikira dari masa semasa (5K sekarang / masa sasaran).
2. **Pilih pace sendiri** - ahli boleh ubah pace sasaran (contoh pace lumba 6:30, bukan 6:00). Pace
   lain (mudah, tempo, interval) dikira semula dari pace itu. Nilai disimpan dalam parameter pelan
   (`pace`, s/km) supaya pelan awan dan pautan kongsi kekal sama.
3. **Ikut tarikh** - input utama = **tarikh lumba**. Pelan bermula Isnin minggu ini (atau tarikh mula
   pilihan) dan berakhir pada hari lumba; bilangan minggu dikira, bukan dipilih. Terlalu pendek untuk
   tahap ahli -> amaran yang sama seperti `analyzePlan` sekarang + cadangan tarikh paling awal yang
   munasabah. Pilihan cepat: lumba dari kalendar `/races` (isi tarikh + jarak).
4. **Simpan profil kali pertama** - medan seperti umur (lahir), nadi rehat, masa 5K semasa: kalau
   profil latihan (`nubi/profil`) belum ada nilai itu dan ahli mengisinya dalam borang pelan, simpan
   ke profil sekali (tanpa tanya lagi; tunjuk nota kecil "Disimpan ke profil"). Nilai profil yang dah
   ada tak ditulis ganti dari borang - ubah di `/account/profile`.
5. **Info sesi ikut data FIT/GPX** - setiap sesi yang dipadankan dengan aktiviti tunjuk data sebenar di
   sebelah yang dirancang: jarak, masa, pace purata, nadi purata, % lari (`runRatio`), pautan ke detail
   aktiviti. Sesi tempo/interval: pace sebenar bahagian laju vs sasaran (perlu analisis record FIT -
   lihat Cadangan 2).

## Cadangan tambahan (pilihan owner)

1. **Pace dikemas kini dari lumba/ujian sebenar** - sesi ujian 5K atau lumba yang dipadankan memberi
   masa baru; tawarkan "Kemas kini pace pelan dari ujian ini" (satu klik, minggu seterusnya sahaja).
2. **Semakan kualiti sesi laju** - dari record FIT, cari blok laju (pace < sasaran + 15 s) dan bandingkan
   dengan segmen pelan (`Session.segment`): "6/6 interval, purata 5:42 (sasaran 5:45)". Tanpa AI.
3. **Minggu terlepas** - bila ahli ketinggalan > 1 minggu, cadangkan "Sambung dari Minggu N" (aliran
   sedia ada) secara automatik di Dashboard, bukan hanya di halaman pelan.
4. **Carta beban mingguan** - minit/km dirancang vs sebenar setiap minggu (bar kecil), di Dashboard dan
   halaman pelan.
5. **Taper & hari lumba** - minggu akhir dikira ke belakang dari tarikh lumba (minggu Tirus sentiasa
   betul-betul sebelum lumba), plus nota hari lumba (pemanasan, pace km pertama).

## Bukan dalam v2

- Pelan untuk jarak lain (maraton penuh) - enjin baru.
- Melaraskan pelan automatik ikut nadi/HRV.
- AI - ulasan teks boleh ditambah kemudian di atas angka ini.

## Kesan teknikal

- `lib/plan-5k.ts` / `lib/distance-plan.ts`: input baharu `raceDate` + `pace`; bilangan minggu dikira.
  Pelan lama (parameter `bulan` / `minggu`) mesti kekal boleh dibuka - kekalkan cabang lama atau
  tukar dengan `ENGINE_VERSION` + aliran "Sambung" sedia ada. Naikkan `ENGINE_VERSION`.
- Parameter URL baharu (`lumba`, `pace`) - tambah ke `PARAM` dalam `lib/saved-plans.ts`.
- Profil: `lib/profile.ts` (`saveProfile`, `prefillForm`) - tambah "isi yang kosong sahaja".
- Info sesi: guna `planSessions` + aktiviti (`GET /me/apps/nubi/activities?from=`) - tiada storan baru.
  Cadangan 2 perlu fail `.fit` (`GET …/:id/file`) - muat bila sesi dibuka sahaja.
- Backend: tiada perubahan untuk 1-5. Cadangan 2 boleh simpan ringkasan blok laju dalam
  `nubi_activities` kemudian jika perlu.
- Skrip semakan: `check-plan-5k.ts` / `check-distance-plan.ts` - kes tarikh lumba (terlalu dekat, tepat,
  jauh), pace pilihan, pelan lama masih terbina sama.

## Dibina (2026-10-22) + beza dari rancangan

- **Tarikh lumba** (`lumba`): `racePlan` (`lib/plan-5k.ts`) - mula = Isnin pada/lepas tarikh mula, atau **Isnin depan**
  bila kosong (bukan "Isnin minggu ini": sesi awal minggu dah lepas sebaik pelan dibuat, terus jadi "terlepas"). Minggu
  akhir = minggu lumba (Isnin-Ahad), jadi tirus/ujian sentiasa betul-betul sebelum lumba (cadangan 5 = terbina sendiri).
  `mula` + `minggu` yang dikira ditulis ke URL/param supaya pelan tak berubah bila dibuka kemudian.
  Julat minggu = julat pelan sedia ada (5K 8-24, 10K 8-12, 21K 12-20) - enjin kekal dalam domain yang disemak. Terlalu dekat
  = ditolak + "Tarikh lumba paling awal yang munasabah" (`earliestRaceDate`) + butang "Cuba tarikh itu"; lebih jauh = mula
  dianjak lewat. Hari lumba di kad + `.ics` + padanan = tarikh lumba sebenar (`planSessionDate`) - sesi akhir pelan 3 hari
  ialah Sabtu, lumba biasanya Ahad. Pilihan cepat dari `/races` (`RaceDateField.astro`, isi tarikh + jarak).
  **Lumba hari biasa** (pembaikan 2026-10-22): dulu hanya sesi lumba dipindah ke tarikh lumba, jadi lumba Rabu pelan 4 hari
  masih ada sesi Jumaat (dan Ahad) selepas lumba. Kini `raceShift` (`lib/plan-5k.ts`, dalam `sessionDate`) undur **seluruh
  pelan** sebanyak (hari sesi akhir - hari lumba), contoh lumba Rabu 4 hari = minggu Khamis-Rabu: corak rehat sama setiap
  minggu, tirus tetap seminggu penuh sebelum minggu lumba, sehari rehat sebelum lumba, tiada sesi selepasnya. Lumba Ahad (4
  hari) / Sabtu-Ahad (3 hari) = 0, tak berubah. Minggu pelan = 7 hari dari sesi pertama minggu itu (`weekOf` dalam
  `lib/plan-sync.ts`) untuk padanan, `weeklyLoad` dan `sessionFor` - bukan Isnin-Ahad kalendar. `racePlan(..., hari)` kini
  pulang `mula` = tarikh sesi pertama (boleh bukan Isnin); kalau sesi pertama jatuh sebelum tarikh mula input, pelan mula
  seminggu lewat (minggu -1). Pulang `mula` sendiri = hasil sama, jadi buka semula stabil. Kesan pada pelan lumba hari biasa
  yang dah disimpan (`mula` = Isnin lama): page pelan kira semula minggu -1 (kunci `Nw` baru, tanda siap lama kekal di kunci
  lama); Dashboard/padanan guna param tersimpan, tarikh dianjak ke belakang dari Isnin itu. `ENGINE_VERSION` tak dinaikkan -
  isi sesi tak berubah, v2 belum dilepas meluas. Semak: `check-plan-5k.ts` + `check-plan-sync.ts` (setiap hari lumba ×
  3/4 hari × 5K/10K/21K).
  Tempoh lalai bila tiada tarikh lumba: 10K **10 minggu**, 21K **16 minggu** (pilihan tengah - ruang untuk minggu
  terlepas atas minimum pemula Higdon 8 / 12), 5K **3 bulan** (= 12 minggu, minimum tahap "jalan"; tahap "sifar" kini
  automatik **4 bulan** = minimum 16 minggu, dulu ditolak dengan butang "Cuba 4 bulan").
- **Pace** (`pace`, s/km, 4:00-9:00): kotak "Pace pelan" (`pacesHtml`) - mudah/panjang, tempo dan interval (dari pace
  sekarang -> sasaran), lumba/ujian. Pace sendiri: 5K ganti 6:00/km (teks "5K bawah 32:30"); 10K/21K = `sasaran` dalam
  unit lain. **Beza**: mudah/panjang tak ikut pace sasaran - kekal dari masa sekarang (sasaran lebih laju tak patut
  melajukan hari mudah). Pace 5K tak masuk kunci (minit sesi tak berubah); 10K/21K masuk sebagai `p<pace>`.
- **Profil kali pertama**: `fillEmptyProfile` (`lib/profile.ts`) - hari, masa 5K (10K/5K pelan "5k"), masa 10K (21K),
  keadaan MAF. **Beza**: umur tak disimpan - borang ada umur, profil simpan tarikh lahir. Gagal baca profil = tak tulis.
- **Info sesi**: `mountActuals` (`lib/plan-sync.ts`) - pelan aktif saja, padanan sama dengan `sessionFor`. Belum: pace
  bahagian laju (cadangan 2, TODO).
- **Cadangan 1**: tiada minggu lepas ujian/lumba dalam pelan, jadi "kemas kini pace" = masa dari aktiviti yang padan
  (skala ke jarak penuh) diisi ke borang hari ujian/lumba -> "Pelan seterusnya" (pace baru).
- **Cadangan 3**: Dashboard tunjuk notis "Sambung dari Minggu N" (`resumePoint`, sama dengan page pelan). Pelan lumba
  tiada "Sambung" (tarikh lumba tetap - anjak = minggu hilang).
- **Cadangan 4**: `weeklyLoad` - bar minit sebenar (run/walk) vs dirancang di kad minggu (minggu yang dah bermula) dan
  6 minggu terakhir di Dashboard.
- **Keserasian**: pelan lama (`bulan` / pilihan `minggu`, tanpa `lumba`/`pace`) terbina sama - cincangan output dalam
  `check-plan-5k.ts` / `check-distance-plan.ts` (sama dengan enjin sebelum v2). `ENGINE_VERSION` tak dinaikkan: sesi lama
  tak berubah, pelan baru = kunci baru. Dashboard baca param tersimpan dahulu (`planFromParams`), kunci untuk pelan lama.
