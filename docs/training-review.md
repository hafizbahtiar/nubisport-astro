# Semakan kandungan latihan (Pelan 5K, 10K, 21K, MAF)

Semakan dalaman 2026-10-18 oleh agent (bukan jurulatih bertauliah): angka dalam kod dibandingkan
dengan sumber awam. **Item TODO "Semakan kandungan latihan" kekal terbuka** sehingga jurulatih
bertauliah menandatangani senarai semak di bawah.

## Ringkasan

| Perkara | Dalam kod | Sumber | Status |
|---|---|---|---|
| Beban seminggu | naik ≤10%, setiap minggu ke-4 −25% (`LONJAKAN`, `RINGAN`) | Peraturan 10% tak terbukti lebih selamat dari ~24% (Buist 2008, RCT 532 pemula: 20.8% vs 20.3% cedera); >30% dalam 2 minggu mungkin lebih berisiko (Nielsen 2014, HR 1.59, tak signifikan) | Konservatif - kekal |
| Sifar → lari 30 min | jalan-lari bertangga, min. 16 minggu ke 5K bawah 30 min | NHS Couch to 5K: 9 minggu, 3 hari, ke 30 min lari | Selaras (lebih perlahan) |
| Langkah terakhir jalan-lari | **dibetulkan**: 20 → 25 → 30 min (dulu 20 → 30, +50%) | NHS: 20 → 25 → 28 → 30 | Dibaiki |
| 10K: larian panjang puncak | **dibetulkan**: 10 km (dulu 12), naik ≤1 km seminggu | Hal Higdon Novice 10K: terpanjang ~6 batu (9.7 km) | Dibaiki |
| 21K: larian panjang puncak | **dibetulkan**: 16 km (dulu 18) | Hal Higdon Novice 1 (12 minggu): terpanjang 10 batu (16 km), prasyarat 3-4 batu | Dibaiki |
| Ramalan masa (Riegel, eksponen 1.06) | anggaran + label "kasar", pelan 21K "habis" lalai | Riegel 1981; 1.06 dikritik terlalu murah hati untuk jarak jauh bagi pelari belum terlatih | Kekal, dilabel |
| "~0.6% lebih laju seminggu", "1.5 minggu setiap minit 5K" | ambang munasabah/mencabar | **Tiada sumber** - anggaran sendiri | Perlu jurulatih |
| Pace mudah = pace 5K + 75-105 s/km | sesi mudah/panjang | Amalan umum (perbualan selesa); tiada sumber tunggal | Perlu jurulatih |
| MAF | 180 − umur, −10/−5/0/+5, ≤16 thn = 165, julat MAF−10 | Formula 180 Maffetone (kategori sama) | Selaras |

## Standard organisasi kesihatan (2026-10-22)

Setiap formula dalam kod dipadankan dengan standard organisasi kesihatan **bila standard itu wujud**.
WHO/ACSM/AHA tidak menerbitkan formula ramalan masa lumba atau struktur pelan latihan lumba - bagi
yang itu sumbernya kajian atau jurulatih, dan dilabel begitu.

| Formula (fail) | Standard organisasi | Dalam kod | Status |
|---|---|---|---|
| HRmax untuk semakan intensiti (`plan-sync.ts` `hrMax`) | ACSM's Guidelines for Exercise Testing and Prescription: Tanaka 208 − 0.7 × umur lebih tepat daripada 220 − umur | Tanaka | Ikut ACSM |
| Sesi interval/tempo = vigorous (`plan-sync.ts` `VIGOROUS`, `easyForQuality`) | ACSM Position Stand (Garber 2011): vigorous 77-95% HRmax | Nadi puncak < 77% HRmax = larian mudah, sesi laju tak ditanda. Tiada nadi/umur = tak dihalang | Ikut ACSM |
| Kadar peluh, had 2% (`sweat.ts`) | ACSM Position Stand, Exercise and Fluid Replacement (Sawka 2007) | Berat sebelum/selepas, matlamat < 2% | Ikut ACSM |
| Waktu panas 11 pagi - 4 petang (`run-check.ts`) | KKM (Kementerian Kesihatan Malaysia) | Nasihat waktu lari | Ikut KKM |
| Saringan sebelum latihan (nota penafian pelan) | ACSM preparticipation screening (Riebe 2015): penyakit jantung/metabolik/buah pinggang atau simptom = kebenaran doktor sebelum latihan berat | "Panduan umum, bukan nasihat perubatan. Ada masalah jantung, tekanan darah atau sendi? Rujuk doktor dulu. Pelan belum disemak jurulatih bertauliah." | Selaras |
| Jumlah aktiviti mingguan | WHO 2020: 150-300 min sederhana atau 75-150 min berat seminggu (dewasa) | Semua pelan lari ≥ 3 hari seminggu - melepasi minimum WHO | Selaras (tiada formula) |
| MAF 180 − umur (`maf.ts`) | **Bukan** standard organisasi (Maffetone). AHA: sederhana 50-70%, berat 70-85% daripada 220 − umur | Kekal (ciri "Kira MAF"), dilabel sumber Maffetone | Bukan standard - kekal, dilabel |
| Ramalan masa (Riegel) | Tiada standard organisasi | Dilabel "anggaran kasar" | Kajian (Riegel 1981) |
| Larian panjang, tirus, tempoh pelan | Tiada standard organisasi | Hal Higdon Novice, NHS Couch to 5K (NHS = badan kesihatan awam UK) | Jurulatih/NHS |
| Masa hari lumba (borang pelan seterusnya) | - | Masa keseluruhan (elapsed), bukan masa bergerak | Dibaiki 2026-10-22 |

## Untuk jurulatih - senarai semak

- [ ] Ambang `MIN_WEEKS` (sifar 16, jalan 12 minggu) dan `WEEKS_PER_MINUTE` (1.5) - `src/lib/plan-5k.ts`
- [ ] `WEEKLY_GAIN` 0.6% dan had 15% sepelan - `src/lib/distance-plan.ts`
- [ ] Zon pace mudah (+75-105 s/km) dan pace interval/tempo (pace sasaran −15/+10 s)
- [ ] Larian panjang 10K 6 → 10 km, 21K 11 → 16 km; tirus 1 minggu (10K) / 2 minggu (21K)
- [ ] Sesi interval 21K (800 m × 3-6) dan tempo hingga 30 min - sesuai untuk pemula?
- [ ] Nasihat cuaca panas Malaysia dan "berhenti kalau sakit" mencukupi
- [ ] Teks penafian "bukan nasihat perubatan" di setiap pelan

Semak semula lepas perubahan: `bun scripts/check-plan-5k.ts`, `bun scripts/check-distance-plan.ts`,
`bun scripts/check-maf.ts`.

## Sumber

- ACSM's Guidelines for Exercise Testing and Prescription, 11th ed. (Wolters Kluwer, 2021).
- Garber CE et al. 2011, *ACSM Position Stand: Quantity and quality of exercise for developing and
  maintaining cardiorespiratory, musculoskeletal, and neuromotor fitness in apparently healthy adults*,
  Med Sci Sports Exerc 43(7):1334-1359. doi:10.1249/MSS.0b013e318213fefb
- Tanaka H, Monahan KD, Seals DR 2001, *Age-predicted maximal heart rate revisited*, J Am Coll Cardiol
  37(1):153-156. doi:10.1016/S0735-1097(00)01054-8
- Riebe D et al. 2015, *Updating ACSM's recommendations for exercise preparticipation health
  screening*, Med Sci Sports Exerc 47(11):2473-2479.
- Sawka MN et al. 2007, *ACSM Position Stand: Exercise and fluid replacement*, Med Sci Sports Exerc
  39(2):377-390. PMID 17277604
- Bull FC et al. 2020, *World Health Organization 2020 guidelines on physical activity and sedentary
  behaviour*, Br J Sports Med 54:1451-1462.
- American Heart Association, *Target Heart Rates Chart* (heart.org).

- Buist I et al. 2008, *No effect of a graded training program on the number of running-related
  injuries in novice runners*, Am J Sports Med 36(1):33-39. doi:10.1177/0363546507307505
- Nielsen RO et al. 2014, *Excessive progression in weekly running distance and risk of
  running-related injuries*, J Orthop Sports Phys Ther 44(10):739-747. doi:10.2519/jospt.2014.5164
- NHS Couch to 5K: https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/
- Hal Higdon Novice 10K / Half Marathon Novice 1 (ringkasan TrainingPeaks):
  https://www.trainingpeaks.com/training-plans/running/10km/tp-139211/hal-higdon-10k-novice ,
  https://www.trainingpeaks.com/training-plans/running/half-marathon/tp-139213/hal-higdon-1-2-marathon-novice-1
- Riegel P 1981, *Athletic Records and Human Endurance*, American Scientist 69(3).
- Maffetone, formula 180: https://philmaffetone.com/180-formula/
