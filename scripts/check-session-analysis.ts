// bun scripts/check-session-analysis.ts - semakan blok interval/tempo (src/lib/activity-analysis.ts).
// Rekod FIT sintetik: 5 s setiap titik; blok laju ikut pace yang ditetapkan, selebihnya 6:00/km.
import { checkSession } from "../src/lib/activity-analysis";
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

if (gagal) {
  console.error(`\n${gagal} semakan gagal.`);
  throw new Error("semakan gagal");
}
console.log("check-session-analysis: semua lulus.");
