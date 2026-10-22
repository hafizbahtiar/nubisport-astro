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
  };
}

/** Laluan [lat, lon] dari record FIT (semicircle -> darjah). [] = tiada GPS (contoh treadmill). */
export async function fitRoute(bait: ArrayBuffer): Promise<[number, number][]> {
  const { Decoder, Stream } = await import("@garmin/fitsdk");
  const { messages: m } = new Decoder(Stream.fromArrayBuffer(bait)).read();
  const darjah = 180 / 2 ** 31;
  return (m.recordMesgs ?? [])
    .filter((r: any) => typeof r.positionLat === "number" && typeof r.positionLong === "number")
    .map((r: any): [number, number] => [r.positionLat * darjah, r.positionLong * darjah]);
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
