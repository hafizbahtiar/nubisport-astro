# Pelan latihan v2 (5K, 10K, 21K)

Status: **rancangan** (2026-10-22), belum dibina. Bina selepas semakan kualiti sesi (`run_ratio`,
[active-plan-sync.md](./active-plan-sync.md)) siap - kedua-duanya sentuh `lib/plan-sync.ts`.

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
