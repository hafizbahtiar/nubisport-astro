# Pelan aktif + segerak aktiviti Strava

Status: **dibina** (2026-10-22), **v2 padanan** (2026-10-22: minggu pelan + nisbah lari, migration 033) - `src/lib/plan-sync.ts`, semak `bun scripts/check-plan-sync.ts`. Bergantung pada: pelan awan
([cloud-sync.md](./cloud-sync.md)) dan aktiviti Strava ([strava-activities.md](./strava-activities.md)).

## Tujuan

Ahli memilih satu pelan sebagai **pelan aktif**. Bila dia memuat naik fail Strava, aktiviti itu
dipadankan dengan sesi pelan aktif pada tarikh yang sama dan sesi itu ditanda siap secara automatik.
Ahli tak perlu menanda sesi dengan tangan lepas setiap larian, dan kemajuan pelan mencerminkan
larian sebenar.

Ukuran berjaya: ahli yang berlari ikut jadual dan memuat naik fail melihat sesi minggu itu bertanda
siap tanpa klik tambahan, di semua peranti.

## Keadaan sekarang

- Pelan dijana di pelayar dari parameter URL (`lib/plan-5k.ts`, `lib/distance-plan.ts`). Tanda siap =
  token `"<minggu>.<sesi>"` (contoh `"3.1"`) dalam localStorage, di bawah kunci pelan.
- Pelan boleh disimpan ke awan: `app_items` `nubi/plan` (had 3), `data` = parameter, `progress` = token
  siap. `lib/cloud-sync.ts` menghantar setiap perubahan (awan menang, kecuali ada perubahan tertunda).
- Sesi ada tarikh **hanya kalau** pelan ada tarikh mula (`mula`, Isnin) - `sessionDate()`.
- Aktiviti Strava ada dalam D1 `nubi_activities` (`startedAt` UTC, `sport`, `distanceM`, `movingS`).
  Ahli saja.

## Keputusan

1. **Satu pelan aktif setiap akaun.** Disimpan sebagai rekod `app_items` baru `nubi/active` (had 1,
   kunci `plan`, `data = { plan: "<kunci pelan>" }`). Backend: satu entri dalam `QUOTA`
   (`services/app-items.ts`) - tiada jadual, tiada route baru.
2. **Syarat pelan aktif:** pelan mesti disimpan di awan (supaya ikut akaun ke peranti lain) dan mesti
   ada tarikh mula. Pelan tanpa tarikh mula: butang "Aktifkan" meminta tarikh mula dulu (guna aliran
   `mula` yang sedia ada).
3. **Padanan berlaku di pelayar**, bukan di Worker. Enjin pelan hanya wujud di pelayar; Worker tak
   perlu tahu apa-apa tentang sesi. Lepas padanan, token siap ditulis melalui `cloud-sync.ts` yang
   sedia ada - jadi Dashboard, peranti lain dan fail kalendar terus nampak kemajuan.
4. **Tanda automatik hanya menambah, tak pernah membuang.** Tanda manual kekal. Memadam aktiviti tak
   menyahtanda sesi (ahli boleh nyahtanda sendiri).
5. **Satu aktiviti untuk satu sesi.** Aktiviti yang tak padan dikira "aktiviti tambahan" - kekal
   dalam senarai aktiviti, tak menjejaskan pelan.

## Peraturan padanan

Untuk setiap aktiviti yang baru disimpan (dan, semasa mengaktifkan pelan, setiap aktiviti sejak tarikh
mula pelan):

1. Tarikh aktiviti = tarikh tempatan `Asia/Kuala_Lumpur` dari `startedAt`.
2. Calon = sesi pelan aktif yang **belum siap** dalam **minggu pelan yang sama** (Isnin-Ahad). Hari sama
   dahulu (untuk semua aktiviti), kemudian tarikh paling hampir - dirancang esok tapi lari hari ini tetap
   dikira. Tak pernah lintas minggu pelan.
3. Jenis sukan + nisbah lari mesti sesuai (`runRatio` = bahagian masa bergerak pada kadens >= 140
   langkah/min, dikira di pelayar dari rekod `.fit`; null = tiada kadens atau dimuat naik sebelum 033 - lulus):
   - sesi `jalan-lari` - `run` atau `walk`, dan `runRatio` >= 0.15 (jalan saja tak dikira);
   - sesi lain - `run` saja, dan `runRatio` >= 0.7 (Strava mungkin label "Run" walaupun ahli berjalan);
   - `ride`, `hike`, `other` tak pernah padan.
   Gagal **hanya** sebab nisbah lari -> `tolak` dengan sesi itu; UI tunjuk `walkedNote` ("Aktiviti ni
   kebanyakannya jalan (35% lari), jadi Minggu 2, Lari mudah tak ditanda. Tanda sendiri kalau betul.").
4. Beban mesti cukup:
   - sesi ikut masa - `movingS` sekurang-kurangnya 60% daripada minit sesi;
   - sesi ujian / lumba (ikut jarak) - `distanceM` sekurang-kurangnya 95% daripada jarak sesi.
5. Beberapa calon - pilih tarikh paling hampir, kemudian sesi lebih awal. Aktiviti paling lama dipadankan
   dahulu; aktiviti kedua hari sama boleh ambil sesi lain minggu itu.

Peraturan ini ialah satu fungsi tulen `padankan(pelan, aktiviti[], siap[]) -> token[]` dalam `lib/`,
dengan skrip semakan `scripts/check-plan-sync.ts` (kes: hari sama, esok/Ahad minggu sama, tak lintas
minggu, sukan salah, terlalu pendek, dua aktiviti sehari, sesi dah siap, nisbah lari 0.35/0.7/null,
jalan-lari 0.1/0.2, pelan tanpa tarikh).

## Aliran pengguna

- **Halaman pelan** (`/plan-5k`, `/account/distance-plan`): butang "Jadikan pelan aktif" bagi pelan
  awan. Lencana "Aktif" pada pelan aktif. Bila diaktifkan (ahli saja): padankan aktiviti sejak tarikh
  mula, kemudian beritahu hasil ("4 sesi ditanda siap dari aktiviti Strava").
- **Dashboard** (`/account`): panel "Pelan aktif" di atas - sesi seterusnya (tarikh, tajuk), minggu ini
  X/Y sesi siap, minit dirancang vs minit sebenar minggu ini. Tiada pelan aktif: pautan untuk memilih.
- **Muat naik aktiviti** (`/account/activities`): lepas setiap aktiviti disimpan, status dalam dulang
  menyebut hasil padanan - "Disimpan. Minggu 3, Tempo ditanda siap." atau "Disimpan (aktiviti tambahan)."
- **Detail aktiviti** (`/account/activities/view`): kalau padan dengan sesi, tunjuk "Sesi pelan: Minggu
  3, Tempo" (dikira semula dari tarikh, tiada storan baru).

## Bukan dalam v1

- Menilai kualiti sesi (pace interval tepat, zon nadi) - hanya "dibuat atau tak".
- Melaraskan pelan secara automatik bila ahli ketinggalan (aliran "Sambung dari Minggu N" sedia ada
  dah meliputinya).
- Memaut aktiviti ke sesi secara manual atau menukar padanan.
- Pelan aktif untuk bukan ahli - mereka tiada aktiviti untuk dipadankan; pelan aktif tanpa segerak
  boleh ditambah kemudian kalau Dashboard memerlukannya.
- Sambungan terus ke Strava (API berbayar - sebab kita guna muat naik fail).

## Kerja

| Repo | Perubahan |
|---|---|
| hono-workers | `QUOTA.nubi.active = 1`; satu semakan dalam `scripts/verify-app-items.ts`; `API_CONTRACT.md` |
| nubisport-astro | `lib/plan-sync.ts` (pelan aktif baca/tulis + `matchActivities`), `scripts/check-plan-sync.ts`; butang + lencana di halaman pelan; panel Dashboard; status padanan di halaman aktiviti; baris sesi di halaman detail; dokumen ini -> "dibina" |

v1: tiada migration. v2: migration 033 `nubi_activities.run_ratio` (hono-workers), `runRatio` dalam ringkasan upload (`runShare` dalam `lib/activity-file.ts`).

## Risiko

- **Zon masa:** `startedAt` dalam UTC; larian jam 6 pagi waktu Malaysia ialah hari sebelumnya dalam UTC.
  Sentiasa tukar ke `Asia/Kuala_Lumpur` sebelum membandingkan tarikh.
- **Enjin pelan berubah** (`ENGINE_VERSION`): token "3.1" mungkin merujuk sesi lain. Padanan hanya berjalan
  bila `engine` pelan awan sama dengan enjin semasa.
- **Dua peranti serentak:** tulis ikut `cloud-sync.ts` (gabung token, awan menang) - tiada logik baru.

## Perbezaan semasa membina

- `matchActivities(sesi, aktiviti, siap)` memulangkan `{ padan, tolak }` - dua `Map<aktiviti, sesi>` (bukan `token[]`) - dulang dan page
  detail perlu tahu sesi bagi setiap aktiviti. Token = `sesi.id`. `planSessions(kunci, data)` membina sesi
  bertarikh dari parameter pelan awan (null = tiada `mula` / pelan tak sah).
- Hari sama dipadankan dulu untuk semua aktiviti, baru hari lain minggu itu (aktiviti lama hari lain tak
  merampas sesi hari ini).
- Detail: `sessionFor` kira semula dari aktiviti minggu pelan itu; tunjuk "Lari N% masa bergerak" bila
  `runRatio` ada. Aktiviti lama (null) tiada baris itu.
- `nubi/active` terbuka kepada mana-mana akaun (route generik `app_items`, tiada pengawal baru); UI hanya
  menunjukkannya kepada ahli. Penunjuk itu tak berbahaya - aktiviti sendiri tetap ahli saja.
- Muat naik: aktiviti yang disimpan keluar dari dulang (sedia ada), jadi hasil padanan masuk ke mesej
  ringkasan lepas Simpan ("1 aktiviti disimpan. Minggu 3, Tempo ditanda siap."), bukan baris dulang.
- Pelan tanpa tarikh mula: tiada butang, hanya teks "Isi Tarikh mula ... Buat pelan" (aliran `mula` sedia ada).
- Minit sebenar dashboard = `run` + `walk` minggu ini (Isnin-Ahad, waktu Malaysia).
