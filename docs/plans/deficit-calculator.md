# Kalkulator defisit kalori

Status: **v1 dibina** (2026-10-23) - `/account/deficit` (akaun sahaja), `lib/deficit.ts`, `scripts/check-deficit.ts`. Diminta oleh kawan owner. Corak sama dengan kalkulator
peluh (`lib/sweat.ts`): fungsi tulen, dikira dalam pelayar, tiada simpanan.

## Tujuan

Pelari yang nak turun berat dapat anggaran kalori sehari yang **selamat**: berapa yang badan guna
(termasuk larian dalam pelan), berapa defisit untuk sasaran seminggu, dan bila sasaran itu terlalu
agresif. Ukuran berjaya: satu jawapan jelas ("~2,050 kcal sehari") + amaran bila input tak selamat,
dikira dalam pelayar - keputusan tak disimpan.

## Skop v1 (kecil)

- Route **`/account/deficit`** - **akaun sahaja** (owner 2026-10-23, asalnya dirancang awam), label UI
  **"Kalkulator defisit"** dalam sidebar akaun kumpulan "Latihan" (bukan `ALAT`, bukan sitemap). Borang dalam
  `PageHero` seperti `/account/maf`, diisi dari profil latihan.
- Logik: `src/lib/deficit.ts` (eksport English, contoh `calcDeficit`), semak `scripts/check-deficit.ts`
  (corak `ok()`/`check()`).
- Input: umur (19-78), jantina (untuk formula), tinggi (cm), berat (kg), gaya hidup **tanpa larian**
  (ChipGroup 4 tahap FAO), larian seminggu (km), sasaran turun (0.25 / 0.5 / 0.75 / 1 kg seminggu).
- Output: BMR, keperluan harian (TDEE), kalori larian sehari (purata), defisit, **sasaran kcal sehari**,
  anggaran minggu ke berat sasaran (pilihan), dan amaran bila had keselamatan dicapai.

## Formula (disemak 2026-10-23)

| Langkah | Formula | Sumber | Status |
|---|---|---|---|
| BMR (REE) | Mifflin-St Jeor: 10 × kg + 6.25 × cm − 5 × umur **+ 5** (lelaki) / **− 161** (perempuan) | Mifflin et al. 1990 (Am J Clin Nutr 51:241) - bentuk ringkas dari regresi penuh 9.99 kg + 6.25 cm − 4.92 umur + 166 jantina − 161, sampel 498 orang **umur 19-78**. Frankenfield et al. 2005 (J Am Diet Assoc 105:775): paling tepat antara 4 persamaan, ralat individu masih besar, kurang data etnik minoriti | ✅ disahkan |
| Gaya hidup | REE × PAL: **1.40** kebanyakan duduk · **1.55** duduk + berjalan/berdiri · **1.75** kerja fizikal · **2.00** kerja fizikal berat - tanpa larian | FAO/WHO/UNU 2004 *Human energy requirements* Jadual 5.3: sedentari/ringan 1.40-1.69, aktif/sederhana 1.70-1.99, cergas 2.00-2.40. PAL FAO **termasuk** senaman (1 j lari ≈ 1.55 → 1.75), jadi pilih tahap tanpa lari | ✅ disahkan. ❌ Dibuang: faktor 1.2/1.375/1.55/1.725 (tiada sumber primer; 1.2 bawah julat FAO = defisit terlalu dalam) |
| Larian | **1.0 kcal × kg × km** (bersih), ÷ 7 untuk purata sehari | Persamaan metabolik ACSM, lari datar: VO₂ = 0.2 × laju (m/min) + 3.5. Bersih (tanpa 3.5 rehat - rehat dah ada dalam REE × PAL) = 0.2 ml/kg/m × 1000 m = 200 ml O₂/kg/km × 5 kcal/L = 1.0 kcal/kg/km. Sah bila lari ≥ 134 m/min (8 km/j), atau ≥ 80 m/min jika joging | ✅ diterbitkan dari persamaan. Jalan (0.1 × laju) = 0.5 kcal/kg/km - nota "jalan-lari terlebih anggar" |
| Defisit | kg seminggu × 7700 ÷ 7 (0.5 kg = 550 kcal sehari) | 3500 kcal/lb (Wishnofsky 1958) × 2.2046 = 7716 ≈ 7700. Penurunan sebenar makin perlahan bila badan menyesuaikan (Hall 2008, Int J Obes; Hall 2011, Lancet) | ✅ dengan nota "anggaran minggu-minggu awal" |
| Keperluan | REE × PAL + larian | – | – |
| Sasaran | **maks(lantai, keperluan − min(defisit, 25% keperluan))** | Turutan tetap: had 25% dulu, kemudian lantai. Bila mana-mana had kena, papar kadar turun sebenar = defisit sebenar × 7 ÷ 7700 kg seminggu | ✅ |

Ketepatan: REE Mifflin ≠ BMR 24 j yang FAO guna (biasanya ~10% lebih tinggi), dan PAL ialah purata kumpulan.
Hasil = **anggaran ±10% atau lebih** - dilabel di page, dan nasihat "timbang 2-3 minggu, laraskan".

## Templat makro (diminta 2026-10-23)

Lepas sasaran kcal dapat, pilih satu **templat contoh** (ChipGroup) - pecahan gram karbohidrat / protein /
lemak sehari. Contoh kiraan saja, bukan pelan makan. Satu jadual `DIET_TEMPLATES` dalam `lib/deficit.ts`
(templat baru = satu entri, nama kod English, label Melayu).

Kiraan: protein ikut g/kg berat badan atau %; lemak ikut %; karbohidrat = baki ÷ 4. Templat yang had
karbohidrat dalam gram (keto): lemak jadi baki ÷ 9. Faktor Atwater 4 / 4 / 9 kcal/g. Jumlah sentiasa = sasaran kcal.

| Templat | Karbohidrat | Protein | Lemak | Sumber | Status |
|---|---|---|---|---|---|
| Seimbang | baki (55%) | 15% | 30% | RNI Malaysia: karbo 50-65%, protein 10-20%; lemak 20-30% atau 25-35% (dua sumber bercanggah) - **30% sah dalam kedua-dua** | ✅ (sahkan teks RNI 2017 untuk petikan) |
| Pelari | baki | 1.6 g/kg | 25% | AND/DC/ACSM 2016: protein 1.2-2.0 g/kg; lemak 20-30% (ringkasan 2009) - 25% dalam julat | ✅ protein. ❌ Dibuang: ambang "karbo < 3 g/kg" (julat karbo g/kg 2016 tak dapat disahkan - teks penuh berbayar) |
| Protein tinggi | baki | 2.0 g/kg | 30% | Hujung atas julat AND/DC/ACSM 2016; Helms et al. 2014 (JISSN) kekal otot masa defisit | ✅ |
| Rendah karbo | 25% | 25% | baki (50%) | Feinman et al. 2015 (Nutrition 31:1): rendah karbo = < 130 g atau < 26% tenaga | ✅ |
| Keto | 30 g | 1.6 g/kg | baki | Feinman 2015: keto = 20-50 g sehari. **Soalan 4** - AND/DC/ACSM 2016: bukti tak cukup untuk keto bagi prestasi | ✅ takrif; keputusan owner |

Had: gram negatif = templat itu tak dipapar + nota. Templat rendah karbo / keto sentiasa tunjuk amaran
(tanpa ambang nombor): sesi laju (interval/tempo) bergantung pada karbohidrat; ada ubat diabetes, masalah
buah pinggang atau hamil = rujuk doktor dulu.

## Had keselamatan (wajib, fail-closed)

- Sasaran turun > 1% berat badan seminggu atau > 1 kg seminggu = ditolak, cadang nilai lebih rendah.
  0.5-1% seminggu: Helms et al. 2014 (JISSN) ✅. 0.5-1 kg seminggu dikaitkan dengan Garis Panduan Diet
  Malaysia oleh NST 2018 - **sahkan teks MDG 2020 KKM** sebelum dipetik di page.
- Defisit ≤ 25% keperluan (rujukan klinikal: kurangkan 25%, iaitu 500-1000 kcal - Medicina 2019,
  PMC6571590) ✅. Sasaran tak pernah bawah 1,200 kcal (perempuan) / 1,500 kcal (lelaki) "kecuali diawasi
  profesional kesihatan" - Harvard Health ✅. Lantai dicapai = papar lantai + kadar turun sebenar + mesej
  "bincang dengan doktor/dietitian", bukan nombor lebih rendah.
- Umur luar 19-78 (julat kajian Mifflin), hamil / menyusu, atau sejarah gangguan makan: tiada nombor -
  mesej sopan rujuk doktor/dietitian (kotak semak pengakuan sebelum hasil).
- Penafian standard Nubi: "bukan nasihat perubatan", "belum disemak jurulatih/dietitian bertauliah".
  Bahasa tak menghukum ("sasaran", bukan "kurangkan berat berlebihan").

## Privasi

Kalkulator dikira **dalam pelayar** - input tak masuk URL, localStorage, API atau analitik, dan kalkulator
tak pernah menulis ke profil. Owner putuskan (2026-10-23) simpan `jantina`, `tinggi`, `berat` dalam profil
latihan (`app_items` `profil`, pengguna isi sendiri di Profil > Latihan); `/account/deficit` hanya membacanya untuk
isi borang bila log masuk. `/privacy` disenaraikan (berat = data berkaitan kesihatan, boleh dikosongkan).

## Luar skop (YAGNI)

Log makanan, senarai makanan / menu / pelan makan ikut templat, templat lebih daripada 5, kalori dari
Strava/`.fit`, simpan berat/trend, BMI, versi akaun.
Tambah hanya bila diminta.

## Soalan untuk owner

1. ~~Halaman awam atau `/guide`?~~ Diputuskan: `/account/deficit`, akaun sahaja.
2. Isi "larian seminggu" dari pelan aktif bila log masuk? (Cadangan: tidak untuk v1 - input manual.)
3. Siapa semak kandungan (dietitian)? Sampai disemak, label "belum disemak" kekal.
4. **Keto masuk atau tidak?** Cadangan: **tidak untuk v1** - laman pelari pemula, dan kenyataan bersama
   AND/DC/ACSM 2016 kata bukti tak cukup untuk keto bagi prestasi. Kalau owner/kawan tetap nak, papar dengan
   amaran tetap di atas (bukan disorok), dan bukan pilihan lalai.

## Semakan (`scripts/check-deficit.ts`)

Nombor di bawah dikira tangan (bebas daripada `lib/deficit.ts`) - jadikan fixture:

- REE: lelaki 30 th, 70 kg, 170 cm = **1,617.5**; perempuan sama = **1,451.5**.
- Lelaki itu, PAL 1.55, 20 km seminggu, 0.5 kg seminggu: keperluan 2,507.1 + 200 = **2,707.1**; defisit
  550 (< 25% = 676.8); sasaran **2,157 kcal**.
- Makro pada 2,157 kcal (karbo / protein / lemak, g): Seimbang **297 / 81 / 72**; Pelari **292 / 112 / 60**;
  Protein tinggi **237 / 140 / 72**; Rendah karbo **135 / 135 / 120**; Keto **30 / 112 / 177**. Setiap satu
  4c + 4p + 9f = 2,157 (±5 pembundaran).
- Kes lantai: perempuan 40 th, 50 kg, 155 cm, PAL 1.40, 0 km, 0.5 kg seminggu: REE 1,107.75, keperluan
  1,550.9, defisit dihad 25% = 387.7 → 1,163 < lantai → sasaran **1,200**, kadar sebenar ~0.32 kg seminggu.
- 1 kg seminggu pada 50 kg (> 1%) ditolak. Umur 18 / 79 = tiada nombor.
- Input luar julat / NaN / kunci prototaip (`Object.hasOwn`) ditolak, bukan throw. Tiada gram negatif.
