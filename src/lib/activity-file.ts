// Fail aktiviti Strava -> ringkasan untuk backend (POST /me/apps/nubi/activities).
// Satu aktiviti = .fit (Export Original, wajib) + .gpx (Export GPX, pilihan), dipadankan ikut masa
// mula (sama hingga ke saat dalam fail Strava). Semua nilai ringkasan dari FIT; GPX hanya disimpan
// (di-gzip) untuk analitik, dan memberi nama aktiviti jika ada. Pelan:
// docs/plans/strava-activities.md. Semak: bun scripts/check-activity-file.ts

export type Sport = "run" | "walk" | "hike" | "ride" | "other";

export interface ActivitySummary {
  startedAt: string; // UTC hingga saat: 2026-10-21T13:12:07Z
  sport: Sport;
  name: string | null;
  distanceM: number;
  movingS: number;
  elapsedS: number;
  elevationGainM: number | null;
  avgHr: number | null;
  maxHr: number | null;
  runRatio: number | null; // bahagian masa bergerak pada kadens lari (0..1); null = tiada kadens
  // Titik GPS pertama, 2 tempat perpuluhan (~1 km): Worker guna sekali untuk cuaca MET Norway, tidak disimpan.
  start?: { lat: number; lon: number } | null;
}

export interface ActivityFiles {
  ringkasan: ActivitySummary;
  fit: File;
  gpx: File | null;
}

export interface FileFailure {
  fail: string;
  sebab: string;
}

const SUKAN: Record<string, Sport> = {
  running: "run", walking: "walk", hiking: "hike", cycling: "ride",
  run: "run", walk: "walk", hike: "hike", ride: "ride",
};
export const toSport = (s: unknown): Sport => SUKAN[String(s ?? "").toLowerCase()] ?? "other";

/** Date/teks -> "2026-10-21T13:12:07Z" (tanpa milisaat), atau null. */
export const isoSeconds = (t: unknown): string | null => {
  const d = t instanceof Date ? t : new Date(String(t ?? ""));
  return Number.isFinite(d.getTime()) ? d.toISOString().replace(/\.\d{3}Z$/, "Z") : null;
};

/** "Night_Run.fit" -> "Night Run" */
export const nameFromFile = (nama: string) =>
  nama.replace(/\.(fit|gpx)$/i, "").replace(/[_-]+/g, " ").trim().slice(0, 200) || null;

const bulat = (n: number, dp = 0) => Math.round(n * 10 ** dp) / 10 ** dp;

/**
 * Bahagian masa bergerak pada kadens lari: langkah/min = (cadence + fractionalCadence) x 2 (FIT = rpm satu
 * kaki) >= 140; jalan ~100-125. Setiap rekod diberi berat masa ke rekod seterusnya (had 10 s - jeda tak
 * dikira); laju <= 0.5 m/s (kalau ada) = berhenti. null = fail tiada kadens.
 */
export function runShare(rekod: any[]): number | null {
  let lari = 0, gerak = 0;
  for (let i = 0; i + 1 < rekod.length; i++) {
    const r = rekod[i];
    const laju = r.enhancedSpeed ?? r.speed;
    const dt = Math.min(10, (+rekod[i + 1].timestamp - +r.timestamp) / 1000);
    if (typeof r.cadence !== "number" || !(dt > 0) || (typeof laju === "number" && laju <= 0.5)) continue;
    gerak += dt;
    if ((r.cadence + (r.fractionalCadence ?? 0)) * 2 >= 140) lari += dt;
  }
  return gerak ? bulat(lari / gerak, 3) : null;
}

/** Ringkasan dari bait FIT. SDK Garmin dimuat hanya bila perlu (saiznya besar). */
export async function summarizeFit(bait: ArrayBuffer, nama: string): Promise<ActivitySummary> {
  const { Decoder, Stream } = await import("@garmin/fitsdk");
  const d = new Decoder(Stream.fromArrayBuffer(bait));
  if (!d.isFIT() || !d.checkIntegrity()) throw new Error("Bukan fail FIT yang sah, atau fail rosak.");
  const { messages: m } = d.read();
  const s = m.sessionMesgs?.[0];
  const startedAt = isoSeconds(s?.startTime);
  if (!s || !startedAt) throw new Error("Fail FIT tiada sesi aktiviti.");

  // Session Strava tiada nadi/ketinggian - kira dari record per-saat.
  const rekod: any[] = m.recordMesgs ?? [];
  const nadi = rekod.map((r) => r.heartRate).filter((x): x is number => typeof x === "number" && x > 0);
  const tinggi = rekod.map((r) => r.enhancedAltitude ?? r.altitude).filter((x): x is number => typeof x === "number");
  let naik = 0;
  for (let i = 1; i < tinggi.length; i++) if (tinggi[i] > tinggi[i - 1]) naik += tinggi[i] - tinggi[i - 1];

  const jarak = s.totalDistance ?? rekod.findLast((r) => typeof r.distance === "number")?.distance ?? 0;
  const bergerak = s.totalTimerTime ?? s.totalElapsedTime ?? 0;
  return {
    startedAt,
    sport: toSport(s.sport),
    name: nameFromFile(nama),
    distanceM: bulat(jarak, 2),
    movingS: Math.round(bergerak),
    elapsedS: Math.round(s.totalElapsedTime ?? bergerak),
    elevationGainM: tinggi.length > 1 ? bulat(naik, 1) : null,
    avgHr: s.avgHeartRate ?? (nadi.length ? bulat(nadi.reduce((a, b) => a + b, 0) / nadi.length, 1) : null),
    maxHr: s.maxHeartRate ?? (nadi.length ? Math.max(...nadi) : null),
    runRatio: runShare(rekod),
    start: (() => {
      const [lat, lon] = routeOf(rekod)[0] ?? [];
      return lat === undefined ? null : { lat: bulat(lat, 2), lon: bulat(lon, 2) };
    })(),
  };
}

/** Cuaca dari mesej weather_conditions FIT. null = peranti tiada data cuaca. */
export interface ActivityWeather {
  temperatureC: number | null;
  feelsLikeC: number | null;
  humidityPct: number | null;
  windSpeedMs: number | null;
  windDirectionDeg: number | null;
}

export interface FitData {
  records: any[];
  weather: ActivityWeather | null;
  calories: number | null; // kcal dari sesi FIT; null = peranti tak kira
}

const angka = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/** Record FIT + cuaca (jika ada) - satu parse untuk page detail dan tool AI. */
export async function fitData(bait: ArrayBuffer): Promise<FitData> {
  const { Decoder, Stream } = await import("@garmin/fitsdk");
  const messages = new Decoder(Stream.fromArrayBuffer(bait)).read().messages;
  const w = messages.weatherConditionsMesgs?.[0];
  const weather: ActivityWeather | null = w
    ? {
      temperatureC: angka(w.temperature),
      feelsLikeC: angka(w.temperatureFeelsLike),
      humidityPct: angka(w.relativeHumidity),
      windSpeedMs: angka(w.windSpeed),
      windDirectionDeg: angka(w.windDirection),
    }
    : null;
  return {
    records: messages.recordMesgs ?? [],
    calories: angka(messages.sessionMesgs?.[0]?.totalCalories) || null,
    weather:
      weather && Object.values(weather).some((v) => v !== null)
        ? weather
        : null,
  };
}

/** Record FIT (diurai sekali - laluan dan nadi diambil dari hasil yang sama). */
export async function fitRecords(bait: ArrayBuffer): Promise<any[]> {
  return (await fitData(bait)).records;
}

/** Ketinggian ikut jarak: [meter, meter]. [] = fail tiada altitude/jarak. */
export function altitudeSeries(rekod: any[]): [number, number][] {
  const siri: [number, number][] = [];
  for (const r of rekod) {
    const alt = r.enhancedAltitude ?? r.altitude;
    if (typeof alt === "number" && typeof r.distance === "number")
      siri.push([r.distance, alt]);
  }
  return siri;
}

/** Laluan [lat, lon] dari record FIT (semicircle -> darjah). [] = tiada GPS (contoh treadmill). */
export function routeOf(rekod: any[]): [number, number][] {
  const darjah = 180 / 2 ** 31;
  return rekod
    .filter((r) => typeof r.positionLat === "number" && typeof r.positionLong === "number")
    .map((r): [number, number] => [r.positionLat * darjah, r.positionLong * darjah]);
}
export const fitRoute = async (bait: ArrayBuffer) => routeOf(await fitRecords(bait));

export interface TrackPoint {
  lat: number;
  lon: number;
  t: number; // saat dari titik GPS pertama
  distanceM: number;
  elevation: number | null;
  heartRate: number | null;
  speed: number | null;
}

/** Titik GPS + masa/distance/nadi untuk replay peta. [] = tiada GPS/timestamp. */
export function trackOf(rekod: any[]): TrackPoint[] {
  const darjah = 180 / 2 ** 31;
  const titik: TrackPoint[] = [];
  let mula: number | null = null;
  let jarak = 0;
  for (const r of rekod) {
    if (typeof r.positionLat !== "number" || typeof r.positionLong !== "number") continue;
    const masa = +r.timestamp;
    if (!Number.isFinite(masa)) continue;
    if (mula === null) mula = masa;
    if (typeof r.distance === "number") jarak = r.distance;
    const tinggi = r.enhancedAltitude ?? r.altitude;
    const nadi = r.heartRate;
    const laju = r.enhancedSpeed ?? r.speed;
    titik.push({
      lat: r.positionLat * darjah,
      lon: r.positionLong * darjah,
      t: (masa - mula) / 1000,
      distanceM: jarak,
      elevation: typeof tinggi === "number" ? tinggi : null,
      heartRate: typeof nadi === "number" ? nadi : null,
      speed: typeof laju === "number" ? laju : null,
    });
  }
  return titik.length >= 2 ? titik : [];
}

/** Warna laluan ikut pace: perlahan -> sederhana -> laju. */
export const WARNA_PACE = ["#2563eb", "#eab308", "#dc2626"] as const;

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function warnaPace(f: number): string {
  const [a, b, g] = f < 0.5 ? [WARNA_PACE[0], WARNA_PACE[1], f * 2] : [WARNA_PACE[1], WARNA_PACE[2], f * 2 - 1];
  const x = rgb(a), y = rgb(b);
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * g)).join(",")})`;
}

/** Hentian line-gradient MapLibre: [line-progress 0..1, warna] setiap ~100 m, pace dalam saat/km.
 *  Progress = jarak geometri titik (sama asas dengan line-progress); pace = masa / distance FIT bahagian itu.
 *  Skala = persentil 5-95 supaya satu henti di lampu isyarat tak ratakan warna lain. null = tiada pace. */
export function paceGradient(track: TrackPoint[], langkahM = 100) {
  const geo = [0];
  for (let i = 1; i < track.length; i++) {
    const a = track[i - 1], b = track[i];
    const x = (b.lon - a.lon) * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
    geo.push(geo[i - 1] + Math.hypot(x, b.lat - a.lat) * 111_320);
  }
  const jumlah = geo.at(-1) ?? 0;
  const bahagian: [number, number][] = [];
  let i0 = 0;
  for (let i = 1; jumlah > 0 && i < track.length; i++) {
    if (geo[i] - geo[i0] < langkahM && i < track.length - 1) continue;
    const dd = track[i].distanceM - track[i0].distanceM, dt = track[i].t - track[i0].t;
    if (dd > 0 && dt > 0 && geo[i] > geo[i0]) bahagian.push([(geo[i0] + geo[i]) / 2 / jumlah, (dt / dd) * 1000]);
    i0 = i;
  }
  if (bahagian.length < 2) return null;
  const isih = bahagian.map((b) => b[1]).sort((a, b) => a - b);
  const laju = isih[Math.floor(isih.length * 0.05)];
  const perlahan = isih[Math.ceil(isih.length * 0.95) - 1];
  const f = (p: number) => (perlahan > laju ? Math.min(1, Math.max(0, (perlahan - p) / (perlahan - laju))) : 0.5);
  return { stops: bahagian.map(([x, p]): [number, string] => [x, warnaPace(f(p))]), laju, perlahan };
}

/** Pace (saat/km) di sekitar jarak `d`: masa merentas tetingkap ~100 m berpusat di `d`. null = tiada gerak. */
export function paceAt(track: TrackPoint[], d: number, tetingkapM = 100): number | null {
  const a = track.find((p) => p.distanceM >= d - tetingkapM / 2) ?? track[0];
  const b = track.find((p) => p.distanceM >= d + tetingkapM / 2) ?? track.at(-1);
  if (!a || !b || b.distanceM <= a.distanceM || b.t <= a.t) return null;
  return ((b.t - a.t) / (b.distanceM - a.distanceM)) * 1000;
}

/** Jarak (m) titik track paling dekat dengan lon/lat (hover laluan di peta). */
export function nearestDistance(track: TrackPoint[], lon: number, lat: number): number {
  const k = Math.cos((lat * Math.PI) / 180);
  let terbaik = track[0], min = Infinity;
  for (const p of track) {
    const j = ((p.lon - lon) * k) ** 2 + (p.lat - lat) ** 2;
    if (j < min) ((min = j), (terbaik = p));
  }
  return terbaik?.distanceM ?? 0;
}

export interface TrackPosition {
  lat: number;
  lon: number;
  distanceM: number;
  elevation: number | null;
  heartRate: number | null;
  index: number;
}

/** Interpolasi titik pada `saat` (untuk marker replay). null = track kosong. */
export function trackAt(track: TrackPoint[], saat: number): TrackPosition | null {
  if (!track.length) return null;
  const t = Math.min(Math.max(saat, 0), track.at(-1)!.t);
  let i = 0;
  while (i < track.length - 1 && track[i + 1].t <= t) i++;
  const a = track[i];
  const b = track[Math.min(i + 1, track.length - 1)];
  const f = b.t > a.t ? (t - a.t) / (b.t - a.t) : 0;
  const mix = (x: number, y: number) => x + (y - x) * f;
  return {
    lat: mix(a.lat, b.lat),
    lon: mix(a.lon, b.lon),
    distanceM: mix(a.distanceM, b.distanceM),
    elevation: a.elevation === null || b.elevation === null ? a.elevation ?? b.elevation : mix(a.elevation, b.elevation),
    heartRate: a.heartRate === null || b.heartRate === null ? a.heartRate ?? b.heartRate : mix(a.heartRate, b.heartRate),
    index: i,
  };
}

/** Nadi ikut masa: [saat dari record pertama, bpm]. [] = fail tiada nadi. */
export function heartSeries(rekod: any[]): [number, number][] {
  const t0 = rekod.length ? +rekod[0].timestamp : 0;
  return rekod
    .filter((r) => typeof r.heartRate === "number" && r.heartRate > 0 && r.timestamp)
    .map((r): [number, number] => [(+r.timestamp - t0) / 1000, r.heartRate]);
}

/**
 * Bahagian masa dalam 5 zon ikut % nadi maks: Z1 < 60, Z2 60-70, Z3 70-80, Z4 80-90, Z5 >= 90.
 * Setiap titik diberi berat masa ke titik seterusnya (had 10 s - jeda tak dikira, seperti runShare).
 */
export function hrZones(siri: [number, number][], maks: number): number[] {
  const zon = [0, 0, 0, 0, 0];
  let jumlah = 0;
  for (let i = 0; i + 1 < siri.length; i++) {
    const dt = Math.min(10, siri[i + 1][0] - siri[i][0]);
    if (!(dt > 0)) continue;
    zon[Math.min(4, Math.max(0, Math.floor((siri[i][1] / maks) * 10) - 5))] += dt;
    jumlah += dt;
  }
  return zon.map((z) => (jumlah ? bulat(z / jumlah, 3) : 0));
}

/** Yang diperlukan dari GPX: masa mula (untuk padanan) dan nama. Regex cukup untuk 2 tag ini. */
export function readGpx(teks: string): { startedAt: string; name: string | null } {
  if (!/<gpx[\s>]/.test(teks)) throw new Error("Bukan fail GPX.");
  const startedAt = isoSeconds(teks.match(/<trkpt[\s\S]*?<time>([^<]+)<\/time>/)?.[1]);
  if (!startedAt) throw new Error("Fail GPX tiada masa.");
  const nama = teks.match(/<trk>\s*<name>([^<]*)<\/name>/)?.[1]?.trim();
  return { startedAt, name: nama ? nama.slice(0, 200) : null };
}

/** Kumpul fail ikut masa mula. GPX tanpa FIT sepadan = gagal. */
export async function pairFiles(fail: File[]): Promise<{ aktiviti: ActivityFiles[]; gagal: FileFailure[] }> {
  const fit = new Map<string, ActivityFiles>();
  const gpx: { f: File; startedAt: string; name: string | null }[] = [];
  const gagal: FileFailure[] = [];
  for (const f of fail) {
    try {
      if (/\.fit$/i.test(f.name)) {
        const r = await summarizeFit(await f.arrayBuffer(), f.name);
        fit.set(r.startedAt, { ringkasan: r, fit: f, gpx: null });
      } else if (/\.gpx$/i.test(f.name)) {
        gpx.push({ f, ...readGpx(await f.text()) });
      } else {
        gagal.push({ fail: f.name, sebab: "Hanya fail .fit atau .gpx." });
      }
    } catch (e) {
      gagal.push({ fail: f.name, sebab: e instanceof Error ? e.message : "Tak dapat dibaca." });
    }
  }
  for (const g of gpx) {
    const a = fit.get(g.startedAt);
    if (!a) {
      gagal.push({ fail: g.f.name, sebab: "Fail .fit diperlukan untuk aktiviti ini (Export Original)." });
      continue;
    }
    a.gpx = g.f;
    if (g.name) a.ringkasan.name = g.name;
  }
  const aktiviti = [...fit.values()].sort((a, b) => b.ringkasan.startedAt.localeCompare(a.ringkasan.startedAt));
  return { aktiviti, gagal };
}

export const gzip = (f: Blob): Promise<Blob> =>
  new Response(f.stream().pipeThrough(new CompressionStream("gzip"))).blob();

/** Badan multipart untuk satu aktiviti. */
export async function buildUploadForm(a: ActivityFiles): Promise<FormData> {
  const b = new FormData();
  // Blob baru = nama fail asal pengguna tidak pernah dihantar.
  b.set("fit", new Blob([await a.fit.arrayBuffer()]), "aktiviti.fit");
  if (a.gpx) b.set("gpx", await gzip(a.gpx), "aktiviti.gpx.gz");
  b.set("summary", JSON.stringify(a.ringkasan));
  return b;
}

// Paparan
export const formatKm = (m: number) => `${(m / 1000).toLocaleString("ms-MY", { maximumFractionDigits: 2 })} km`;
export const formatDuration = (s: number) => {
  const j = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), d = s % 60;
  return j ? `${j}j ${m}m` : `${m}m ${String(d).padStart(2, "0")}s`;
};
/** Pace min/km, atau null bila jarak terlalu pendek. */
export const paceFromDistance = (m: number, s: number) => {
  if (m < 100 || s <= 0) return null;
  const p = Math.round(s / (m / 1000));
  return `${Math.floor(p / 60)}:${String(p % 60).padStart(2, "0")} /km`;
};
export const SPORT_LABELS: Record<Sport, string> = { run: "Larian", walk: "Jalan", hike: "Mendaki", ride: "Berbasikal", other: "Lain-lain" };
