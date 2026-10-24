// bun scripts/check-session-analysis.ts - semakan blok interval/tempo, split, best effort,
// GAP, kadens dan drift nadi (src/lib/activity-analysis.ts). Rekod FIT sintetik: 5 s setiap
// titik; blok laju ikut pace yang ditetapkan, selebihnya 6:00/km.
import {
  activitySplits,
  bestEfforts,
  cadenceStats,
  checkSession,
  gradeAdjustedPace,
  heartRateDrift,
} from "../src/lib/activity-analysis";
import { segment } from "../src/lib/plan-5k";

let gagal = 0;
const ok = (c: unknown, msg: string) => {
  if (!c) {
    gagal++;
    console.error("GAGAL:", msg);
  }
};
// Purata pace dari jarak/masa = floating point; banding dengan toleransi kecil.
const hampir = (a: number | null | undefined, b: number, tol = 0.05) =>
  a != null && Math.abs(a - b) < tol;

const MULA = Date.UTC(2026, 9, 21, 13, 0, 0);
const SEGMEN = [
  segment("lari", 10),
  segment("laju", 2),
  segment("rehat", 1.5),
  segment("laju", 2),
  segment("lari", 10),
];

/** Rekod 5 s; `paceBlok` = pace (s/km) untuk blok laju pertama/kedua. */
function rekod(paceBlok: [number, number]) {
  const out: { timestamp: Date; distance: number; enhancedSpeed: number }[] = [];
  let jarak = 0;
  const windows = [
    [600, 720],
    [810, 930],
  ];
  for (let t = 0; t <= 1530; t += 5) {
    // Selang 5 s dikira ikut titik tengahnya (jarak pada t = hujung selang).
    const tengah = t - 2.5;
    const blok = windows.findIndex(([a, b]) => tengah >= a && tengah < b);
    const pace = blok < 0 ? 360 : paceBlok[blok];
    const laju = 1000 / pace;
    if (t > 0) jarak += laju * 5;
    out.push({ timestamp: new Date(MULA + t * 1000), distance: jarak, enhancedSpeed: laju });
  }
  return out;
}

// Dua-dua blok pada 5:00/km, sasaran 5:00/km (+15 s toleransi) = lulus.
{
  const h = checkSession(rekod([300, 300]), SEGMEN, "Laju · ~5:00/km minggu ini");
  ok(h !== null, "hasil wujud");
  ok(h?.jumlah === 2 && h?.lulus === 2, `dua blok lulus (${h?.jumlah}/${h?.lulus})`);
  ok(h?.target === 300 && hampir(h?.purata, 300), `sasaran/purata ${h?.target}/${h?.purata}`);
  ok(hampir(h?.blok[0].pace, 300) && h?.blok[0].lulus === true, "blok 1 tepat");
}

// Blok kedua 5:20/km (320) > 5:15 toleransi = gagal; purata 5:10.
{
  const h = checkSession(rekod([300, 320]), SEGMEN, "Laju · ~5:00/km minggu ini");
  ok(h?.lulus === 1, `satu blok lulus (${h?.lulus})`);
  ok(h?.blok[1].lulus === false, "blok 2 gagal");
  ok(hampir(h?.purata, 310), `purata 310 (${h?.purata})`);
}

// Tiada segmen / tiada teks sasaran: tiada analisis atau tiada lulus/gagal.
ok(checkSession(rekod([300, 300]), [], "~5:00/km") === null, "tiada segmen = null");
{
  const h = checkSession(rekod([300, 300]), SEGMEN, "Laju tapi terkawal");
  ok(h?.target === null && h?.blok.every((b) => b.lulus === null), "tiada sasaran = tiada lulus/gagal");
}
ok(checkSession([], SEGMEN, "~5:00/km") === null, "tiada rekod = null");

// "sasaran akhir" ditanda (pelan tanpa masa 5K).
{
  const h = checkSession(rekod([300, 300]), SEGMEN, "sasaran akhir ~5:30/km");
  ok(h?.targetFinal === true, "sasaran akhir ditanda");
}

/** Rekod 1 s pada pace tetap; `naikPerKm` = ketinggian naik setiap km. */
function lurus(pace: number, jarakM: number, naikPerKm = 0, nadi = 0, kadens = 0) {
  const out: {
    timestamp: Date;
    distance: number;
    enhancedAltitude: number;
    enhancedSpeed: number;
    heartRate?: number;
    cadence?: number;
  }[] = [];
  const laju = 1000 / pace;
  for (let t = 0; ; t++) {
    const d = Math.min(jarakM, laju * t);
    out.push({
      timestamp: new Date(MULA + t * 1000),
      distance: d,
      enhancedAltitude: (d / 1000) * naikPerKm,
      enhancedSpeed: laju,
      ...(nadi ? { heartRate: nadi } : {}),
      ...(kadens ? { cadence: kadens } : {}),
    });
    if (d >= jarakM) break;
  }
  return out;
}

// Split: 2.5 km pada 6:00/km = 1 km, 1 km, 0.5 km; naik 10 m setiap km.
{
  const s = activitySplits(lurus(360, 2500, 10));
  ok(s.length === 3, `tiga split (${s.length})`);
  ok(
    hampir(s[0]?.distanceM, 1000, 0.01) && hampir(s[1]?.distanceM, 1000, 0.01),
    "dua split penuh 1 km",
  );
  ok(hampir(s[2]?.distanceM, 500, 0.01), `split akhir 500 m (${s[2]?.distanceM})`);
  ok(s.every((x) => hampir(x.pace, 360)), `pace split 6:00/km (${s.map((x) => x.pace)})`);
  ok(
    hampir(s[0]?.elevationGainM, 10, 0.01) && hampir(s[2]?.elevationGainM, 5, 0.01),
    "ketinggian ikut split",
  );
}

// Best effort: jarak standard sahaja, masa bergerak.
{
  const b = bestEfforts(lurus(360, 2500));
  ok(b.length === 1 && b[0].label === "1K", "2.5 km = hanya best 1K");
  ok(hampir(b[0]?.seconds, 360, 0.001), `best 1K 360 s (${b[0]?.seconds})`);
}
{
  const b = bestEfforts(lurus(300, 6000));
  ok(b.length === 2 && b.some((x) => x.label === "5K"), "6 km = best 1K + 5K");
  ok(hampir(b.find((x) => x.label === "5K")?.seconds, 1500, 0.001), "best 5K 25:00");
}

// Jeda 60 s pada jarak sama tidak masuk best effort.
{
  const laju = 1000 / 300;
  const r: { timestamp: Date; distance: number; enhancedSpeed: number }[] = [];
  for (let t = 0; t <= 300; t++)
    r.push({
      timestamp: new Date(MULA + t * 1000),
      distance: Math.min(1000, laju * t),
      enhancedSpeed: laju,
    });
  r.push({ timestamp: new Date(MULA + 360000), distance: 1000, enhancedSpeed: 0 });
  for (let t = 361; t <= 661; t++)
    r.push({
      timestamp: new Date(MULA + t * 1000),
      distance: 1000 + Math.min(1000, laju * (t - 360)),
      enhancedSpeed: laju,
    });
  const b = bestEfforts(r);
  ok(hampir(b.find((x) => x.label === "1K")?.seconds, 300, 0.001), "jeda tidak dikira");
}

ok(activitySplits([]).length === 0 && bestEfforts([]).length === 0, "rekod kosong = tiada split/best");

// GAP: mendaki lebih laju setara, menurun lebih perlahan; tiada altitude = null.
{
  const rata = activitySplits(lurus(360, 1000));
  ok(hampir(gradeAdjustedPace(rata), 360, 0.1), "GAP rata = pace");
  const naik = activitySplits(lurus(360, 1000, 50));
  ok(hampir(naik[0]?.elevationChangeM, 50, 0.01), `perubahan tinggi +50 (${naik[0]?.elevationChangeM})`);
  ok((gradeAdjustedPace(naik) ?? Infinity) < 360, "GAP mendaki lebih laju");
  const turun = activitySplits(lurus(360, 1000, -50));
  ok(hampir(turun[0]?.elevationChangeM, -50, 0.01), `perubahan tinggi -50 (${turun[0]?.elevationChangeM})`);
  ok((gradeAdjustedPace(turun) ?? 0) > 360, "GAP menurun lebih perlahan");
  const tanpaAlt = activitySplits(
    lurus(360, 1000).map(({ enhancedAltitude, ...r }) => r),
  );
  ok(
    tanpaAlt[0]?.elevationChangeM === null && gradeAdjustedPace(tanpaAlt) === null,
    "tiada altitude = tiada GAP",
  );
}

// Kadens FIT satu kaki x2 = langkah/min.
{
  const k = cadenceStats(lurus(300, 2000, 0, 0, 90));
  ok(k.avg === 180 && k.max === 180, `kadens 90 x2 = 180 spm (${k.avg}/${k.max})`);
  ok(cadenceStats(lurus(300, 2000)).avg === null, "tiada kadens = null");
}

// Drift nadi: separuh kedua 150 vs separuh pertama 140 = +7.1%.
{
  const laju = 1000 / 360;
  const nadi: {
    timestamp: Date;
    distance: number;
    enhancedSpeed: number;
    heartRate: number;
  }[] = [];
  for (let t = 0; ; t++) {
    const d = Math.min(3000, laju * t);
    nadi.push({
      timestamp: new Date(MULA + t * 1000),
      distance: d,
      enhancedSpeed: laju,
      heartRate: d < 1500 ? 140 : 150,
    });
    if (d >= 3000) break;
  }
  const drift = heartRateDrift(nadi);
  ok(drift !== null && Math.abs(drift - 7.14) < 0.2, `drift nadi +7.1% (${drift})`);
  ok(heartRateDrift(lurus(360, 500, 0, 140)) === null, "aktiviti pendek = tiada drift");
  ok(heartRateDrift(lurus(360, 1000)) === null, "tiada nadi = tiada drift");
}

if (gagal) {
  console.error(`\n${gagal} semakan gagal.`);
  throw new Error("semakan gagal");
}
console.log("check-session-analysis: semua lulus.");
