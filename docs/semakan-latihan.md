# Semakan kandungan latihan (Pelan 5K, 10K, 21K, MAF)

Semakan dalaman 2026-10-18 oleh agent (bukan jurulatih bertauliah): angka dalam kod dibandingkan
dengan sumber awam. **Item TODO "Semakan kandungan latihan" kekal terbuka** sehingga jurulatih
bertauliah menandatangani senarai semak di bawah.

## Ringkasan

| Perkara | Dalam kod | Sumber | Status |
|---|---|---|---|
| Beban seminggu | naik ≤10%, setiap minggu ke-4 −25% (`LONJAKAN`, `RINGAN`) | Peraturan 10% tidak terbukti lebih selamat dari ~24% (Buist 2008, RCT 532 pemula: 20.8% vs 20.3% cedera); >30% dalam 2 minggu mungkin lebih berisiko (Nielsen 2014, HR 1.59, tidak signifikan) | Konservatif - kekal |
| Sifar → lari 30 min | jalan-lari bertangga, min. 16 minggu ke 5K bawah 30 min | NHS Couch to 5K: 9 minggu, 3 hari, ke 30 min lari | Selaras (lebih perlahan) |
| Langkah terakhir jalan-lari | **dibetulkan**: 20 → 25 → 30 min (dulu 20 → 30, +50%) | NHS: 20 → 25 → 28 → 30 | Dibaiki |
| 10K: larian panjang puncak | **dibetulkan**: 10 km (dulu 12), naik ≤1 km seminggu | Hal Higdon Novice 10K: terpanjang ~6 batu (9.7 km) | Dibaiki |
| 21K: larian panjang puncak | **dibetulkan**: 16 km (dulu 18) | Hal Higdon Novice 1 (12 minggu): terpanjang 10 batu (16 km), prasyarat 3-4 batu | Dibaiki |
| Ramalan masa (Riegel, eksponen 1.06) | anggaran + label "kasar", pelan 21K "habis" lalai | Riegel 1981; 1.06 dikritik terlalu murah hati untuk jarak jauh bagi pelari belum terlatih | Kekal, dilabel |
| "~0.6% lebih laju seminggu", "1.5 minggu setiap minit 5K" | ambang munasabah/mencabar | **Tiada sumber** - anggaran sendiri | Perlu jurulatih |
| Pace mudah = pace 5K + 75-105 s/km | sesi mudah/panjang | Amalan umum (perbualan selesa); tiada sumber tunggal | Perlu jurulatih |
| MAF | 180 − umur, −10/−5/0/+5, ≤16 thn = 165, julat MAF−10 | Formula 180 Maffetone (kategori sama) | Selaras |

## Untuk jurulatih - senarai semak

- [ ] Ambang `MINGGU_MIN` (sifar 16, jalan 12 minggu) dan `MINGGU_SETIAP_MINIT` (1.5) - `src/lib/pelan-5k.ts`
- [ ] `KADAR_SEMINGGU` 0.6% dan had 15% sepelan - `src/lib/pelan-jarak.ts`
- [ ] Zon pace mudah (+75-105 s/km) dan pace interval/tempo (pace sasaran −15/+10 s)
- [ ] Larian panjang 10K 6 → 10 km, 21K 11 → 16 km; tirus 1 minggu (10K) / 2 minggu (21K)
- [ ] Sesi interval 21K (800 m × 3-6) dan tempo hingga 30 min - sesuai untuk pemula?
- [ ] Nasihat cuaca panas Malaysia dan "berhenti jika sakit" mencukupi
- [ ] Teks penafian "bukan nasihat perubatan" di setiap pelan

Semak semula selepas perubahan: `bun scripts/check-pelan-5k.ts`, `bun scripts/check-pelan-jarak.ts`,
`bun scripts/check-maf.ts`.

## Sumber

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
