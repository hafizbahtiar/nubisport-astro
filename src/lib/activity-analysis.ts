// Analisis rekod FIT: semakan blok interval/tempo, split setiap km, dan best effort.
// Anggaran sahaja - bukan penilaian jurulatih. Semak: bun scripts/check-session-analysis.ts
import type { Segment } from "./plan-5k";

export interface BlockCheck {
  no: number;
  saat: number; // panjang segmen pelan
  pace: number | null; // s/km
  lulus: boolean | null; // pace <= sasaran + 15 s/km
}

export interface SessionCheck {
  target: number | null;
  targetFinal: boolean; // teks "sasaran akhir" (pelan tanpa masa 5K)
  blok: BlockCheck[];
  lulus: number;
  jumlah: number;
  purata: number | null;
}

const paceOf = (usaha: string): { pace: number; final: boolean } | null => {
  const m = usaha.match(/~(\d+):(\d{2})\/km/);
  if (!m) return null;
  return { pace: Number(m[1]) * 60 + Number(m[2]), final: /sasaran akhir/i.test(usaha) };
};

/**
 * `rekod` = record FIT mentah. Setiap blok `laju` dalam `segmen` dipetakan ke tetingkap masa
 * dari record pertama; pace = masa bergerak / jarak. Blok tanpa jarak cukup = null (bukan gagal).
 */
export function checkSession(
  rekod: Array<{
    timestamp?: Date | string | number;
    distance?: number;
    enhancedSpeed?: number;
    speed?: number;
  }>,
  segmen: Segment[] | undefined,
  usaha: string,
): SessionCheck | null {
  const steps = segmen ?? [];
  const quality = steps.filter((s) => s.buat === "laju");
  if (quality.length === 0 || rekod.length < 2) return null;

  const t0 = Number(new Date(rekod[0].timestamp ?? 0));
  if (!Number.isFinite(t0)) return null;

  const windows: { no: number; saat: number; from: number; to: number }[] = [];
  let masa = 0;
  let no = 0;
  for (const s of steps) {
    if (s.buat === "laju") {
      no++;
      windows.push({ no, saat: s.saat, from: masa, to: masa + s.saat });
    }
    masa += s.saat;
  }

  const target = paceOf(usaha);
  const blok = windows.map((w): BlockCheck => {
    let jarak = 0;
    let time = 0;
    for (let i = 0; i + 1 < rekod.length; i++) {
      const a = rekod[i];
      const b = rekod[i + 1];
      const ta = (Number(new Date(a.timestamp ?? 0)) - t0) / 1000;
      const tb = (Number(new Date(b.timestamp ?? 0)) - t0) / 1000;
      const tengah = (ta + tb) / 2;
      if (tengah < w.from || tengah >= w.to) continue;
      const dt = Math.min(10, tb - ta);
      if (!(dt > 0)) continue;
      const laju = a.enhancedSpeed ?? a.speed;
      const dd =
        typeof a.distance === "number" && typeof b.distance === "number"
          ? b.distance - a.distance
          : 0;
      if ((typeof laju === "number" && laju <= 0.5) || !(dd > 0)) continue;
      jarak += dd;
      time += dt;
    }
    const pace = jarak > 30 && time > 0 ? (time / jarak) * 1000 : null;
    return {
      no: w.no,
      saat: w.saat,
      pace,
      lulus: target && pace !== null ? pace <= target.pace + 15 : null,
    };
  });

  const diukur = blok.filter((b) => b.pace !== null);
  return {
    target: target?.pace ?? null,
    targetFinal: target?.final ?? false,
    blok,
    lulus: blok.filter((b) => b.lulus === true).length,
    jumlah: blok.length,
    purata: diukur.length
      ? diukur.reduce((n, b) => n + (b.pace ?? 0), 0) / diukur.length
      : null,
  };
}

export interface Split {
  km: number; // 1 = km pertama
  distanceM: number; // split terakhir boleh separa km
  movingS: number;
  pace: number | null; // s/km
  elevationGainM: number;
  elevationChangeM: number | null; // naik - turun; null = tiada altitude
}

export interface BestEffort {
  label: string;
  distanceM: number;
  seconds: number;
}

export const BEST_DISTANCES = [
  { label: "1K", m: 1000 },
  { label: "5K", m: 5000 },
  { label: "10K", m: 10000 },
  { label: "21K", m: 21097.5 },
  { label: "42K", m: 42195 },
] as const;

type FitRecord = {
  timestamp?: Date | string | number;
  distance?: number;
  enhancedAltitude?: number;
  altitude?: number;
  heartRate?: number;
  cadence?: number;
  fractionalCadence?: number;
  enhancedSpeed?: number;
  speed?: number;
};

interface SeriesPoint {
  d: number; // jarak dari titik pertama
  t: number; // masa bergerak
  alt: number | null;
  hr: number | null;
}

/**
 * Titik jarak/masa bergerak dari record FIT. Masa hanya ditambah apabila jarak bertambah,
 * dan jeda dihadkan 10 s (sama seperti checkSession dan runShare).
 */
function movingSeries(rekod: FitRecord[]): SeriesPoint[] {
  const titik: SeriesPoint[] = [];
  let masa = 0;
  let mula: number | null = null;
  let lepas: { d: number; ts: number } | null = null;
  for (const r of rekod) {
    if (typeof r.distance !== "number") continue;
    const ts = +new Date(r.timestamp ?? 0);
    if (!Number.isFinite(ts)) continue;
    if (mula === null) mula = r.distance;
    const d = Math.max(lepas?.d ?? 0, r.distance - mula);
    if (lepas && d > lepas.d) {
      const dt = (ts - lepas.ts) / 1000;
      if (dt > 0) masa += Math.min(10, dt);
    }
    const alt = r.enhancedAltitude ?? r.altitude;
    const hr = r.heartRate;
    titik.push({
      d,
      t: masa,
      alt: typeof alt === "number" ? alt : null,
      hr: typeof hr === "number" && hr > 0 ? hr : null,
    });
    lepas = { d, ts };
  }
  return titik;
}

/** Split setiap km dari record FIT. [] = tiada jarak dalam rekod. */
export function activitySplits(rekod: FitRecord[]): Split[] {
  const titik = movingSeries(rekod);
  if (titik.length < 2) return [];
  const bakul: {
    distanceM: number;
    movingS: number;
    elevationGainM: number;
    elevationChangeM: number | null;
  }[] = [];
  const bakulAt = (i: number) =>
  (bakul[i] ??= {
    distanceM: 0,
    movingS: 0,
    elevationGainM: 0,
    elevationChangeM: null,
  });

  for (let i = 1; i < titik.length; i++) {
    const a = titik[i - 1];
    const b = titik[i];
    const dd = b.d - a.d;
    const dt = b.t - a.t;
    if (dd <= 0) continue;
    const deltaTinggi =
      a.alt !== null && b.alt !== null ? b.alt - a.alt : null;
    let dari = a.d;
    while (dari < b.d - 1e-9) {
      const km = Math.floor(dari / 1000);
      const hujung = Math.min(b.d, (km + 1) * 1000);
      const bahagian = (hujung - dari) / dd;
      const k = bakulAt(km);
      k.distanceM += hujung - dari;
      k.movingS += dt * bahagian;
      if (deltaTinggi !== null) {
        const perubahan = deltaTinggi * bahagian;
        k.elevationChangeM = (k.elevationChangeM ?? 0) + perubahan;
        if (perubahan > 0) k.elevationGainM += perubahan;
      }
      dari = hujung;
    }
  }

  return bakul.map((b, i) => ({
    km: i + 1,
    distanceM: b.distanceM,
    movingS: b.movingS,
    pace: b.distanceM > 50 && b.movingS > 0 ? (b.movingS / b.distanceM) * 1000 : null,
    elevationGainM: b.elevationGainM,
    elevationChangeM: b.elevationChangeM,
  }));
}

/** Blok terpantas untuk setiap jarak standard. [] = rekod terlalu pendek / tiada jarak. */
export function bestEfforts(rekod: FitRecord[]): BestEffort[] {
  const titik = movingSeries(rekod);
  if (titik.length < 2) return [];
  const jumlah = titik.at(-1)!.d;
  const hasil: BestEffort[] = [];
  for (const { label, m } of BEST_DISTANCES) {
    if (jumlah < m) continue;
    let best = Infinity;
    let j = 0;
    for (let i = 0; i < titik.length; i++) {
      if (j < i) j = i;
      while (j < titik.length && titik[j].d - titik[i].d < m) j++;
      if (j >= titik.length) break;
      const saat = titik[j].t - titik[i].t;
      if (saat > 0 && saat < best) best = saat;
    }
    if (best < Infinity) hasil.push({ label, distanceM: m, seconds: best });
  }
  return hasil;
}

// Minetti et al. 2002 (J Appl Physiol 93:1039-1046): kos tenaga larian (J/kg/m) pada gred i.
const MINETTI_FLAT = 3.6;
const runningCost = (g: number) =>
  155.4 * g ** 5 -
  30.4 * g ** 4 -
  43.3 * g ** 3 +
  46.3 * g ** 2 +
  19.5 * g +
  MINETTI_FLAT;

/**
 * GAP (grade adjusted pace) s/km: masa setara larian rata dari split. Gred dihadkan
 * ±30% (had selamat; formula asal ±45%), dan null bila split tiada altitude.
 */
export function gradeAdjustedPace(splits: Split[]): number | null {
  if (!splits.length) return null;
  let setara = 0;
  let jarak = 0;
  for (const s of splits) {
    if (
      s.elevationChangeM === null ||
      s.pace === null ||
      s.distanceM <= 0 ||
      s.movingS <= 0
    )
      return null;
    const gred = Math.max(-0.3, Math.min(0.3, s.elevationChangeM / s.distanceM));
    const kos = runningCost(gred);
    if (!(kos > 0)) return null;
    setara += s.movingS * (MINETTI_FLAT / kos);
    jarak += s.distanceM;
  }
  return jarak > 100 && setara > 0 ? (setara / jarak) * 1000 : null;
}

export interface CadenceStats {
  avg: number | null;
  max: number | null;
}

/** Kadens langkah/min (FIT cadence satu kaki x2), purata ikut masa bergerak. */
export function cadenceStats(rekod: FitRecord[]): CadenceStats {
  let jumlah = 0;
  let masa = 0;
  let maks = 0;
  for (let i = 0; i + 1 < rekod.length; i++) {
    const r = rekod[i];
    if (typeof r.cadence !== "number") continue;
    const ts = +new Date(r.timestamp ?? 0);
    const next = +new Date(rekod[i + 1].timestamp ?? 0);
    if (!Number.isFinite(ts) || !Number.isFinite(next)) continue;
    const dt = Math.min(10, (next - ts) / 1000);
    const laju = r.enhancedSpeed ?? r.speed;
    if (!(dt > 0) || (typeof laju === "number" && laju <= 0.5)) continue;
    const spm = (r.cadence + (r.fractionalCadence ?? 0)) * 2;
    jumlah += spm * dt;
    masa += dt;
    maks = Math.max(maks, spm);
  }
  return masa > 0
    ? { avg: Math.round(jumlah / masa), max: Math.round(maks) }
    : { avg: null, max: null };
}

/**
 * Drift nadi (%): nadi purata separuh kedua berbanding separuh pertama, ikut masa bergerak.
 * Pace yang berubah menjejaskan bacaan; null = nadi tak cukup atau aktiviti terlalu pendek.
 */
export function heartRateDrift(rekod: FitRecord[]): number | null {
  const titik = movingSeries(rekod);
  if (titik.length < 2) return null;
  const jumlah = titik.at(-1)!.t;
  if (!(jumlah >= 300)) return null;
  const separuh = jumlah / 2;
  let nadi1 = 0;
  let masa1 = 0;
  let nadi2 = 0;
  let masa2 = 0;
  let semua1 = 0;
  let semua2 = 0;
  for (let i = 1; i < titik.length; i++) {
    const a = titik[i - 1];
    const b = titik[i];
    const dt = b.t - a.t;
    if (!(dt > 0)) continue;
    const d1 = Math.max(0, Math.min(b.t, separuh) - a.t);
    const d2 = Math.max(0, b.t - Math.max(a.t, separuh));
    semua1 += d1;
    semua2 += d2;
    if (a.hr === null) continue;
    nadi1 += a.hr * d1;
    masa1 += d1;
    nadi2 += a.hr * d2;
    masa2 += d2;
  }
  if (
    !(masa1 > 0) ||
    !(masa2 > 0) ||
    masa1 < semua1 * 0.5 ||
    masa2 < semua2 * 0.5
  )
    return null;
  const purata1 = nadi1 / masa1;
  const purata2 = nadi2 / masa2;
  return ((purata2 - purata1) / purata1) * 100;
}
