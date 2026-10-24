// PR dan ramalan lumba dari ringkasan aktiviti (D1). PR = anggaran konservatif: masa pada
// pace purata larian yang meliputi jarak itu, bukan best effort dalam larian (itu di detail
// aktiviti, lib/activity-analysis.ts). Ramalan guna Riegel sedia ada.
// Semak: bun scripts/check-activity-records.ts
import { riegel } from "./distance-plan";

export const RECORD_TARGETS = [
  { label: "5K", distanceM: 5000 },
  { label: "10K", distanceM: 10000 },
  { label: "21K", distanceM: 21097.5 },
  { label: "42K", distanceM: 42195 },
] as const;

export interface RecordActivity {
  startedAt: string;
  sport: string;
  distanceM: number;
  movingS: number;
}

export interface PersonalRecord {
  label: string;
  distanceM: number;
  seconds: number;
  pace: number; // s/km
  kind: "activity" | "prediction";
  from: string; // jarak larian sebenar, atau jarak asas ramalan (contoh "5K")
  startedAt: string | null; // hanya untuk kind "activity"
}

const MIN_RUN_M = 3000;

const distanceLabel = (m: number) =>
  m >= 1000 ? `${(m / 1000).toFixed(m % 1000 === 0 ? 0 : 1)}K` : `${Math.round(m)} m`;

/**
 * PR 5K/10K/21K/42K: larian terpantas yang meliputi jarak itu, diukur pada pace purata.
 * Tiada larian yang cukup panjang = ramalan Riegel dari PR sebelumnya, atau dari larian
 * terpanjang (minimum 3 km). Walk/ride tidak dikira.
 */
export function personalRecords(rows: RecordActivity[]): PersonalRecord[] {
  const runs = rows.filter(
    (r) =>
      r.sport === "run" &&
      Number.isFinite(r.distanceM) &&
      Number.isFinite(r.movingS) &&
      r.distanceM >= MIN_RUN_M &&
      r.movingS > 0,
  );
  if (!runs.length) return [];

  const longest = runs.reduce((a, b) => (b.distanceM > a.distanceM ? b : a));
  const hasil: PersonalRecord[] = [];
  let asas: { label: string; distanceM: number; seconds: number } | null = null;

  for (const target of RECORD_TARGETS) {
    const meliputi = runs.filter((r) => r.distanceM >= target.distanceM);
    if (meliputi.length) {
      const best = meliputi.reduce((a, b) =>
        a.movingS * (target.distanceM / a.distanceM) <=
          b.movingS * (target.distanceM / b.distanceM)
          ? a
          : b,
      );
      const seconds = best.movingS * (target.distanceM / best.distanceM);
      hasil.push({
        label: target.label,
        distanceM: target.distanceM,
        seconds,
        pace: seconds / (target.distanceM / 1000),
        kind: "activity",
        from: distanceLabel(best.distanceM),
        startedAt: best.startedAt,
      });
      asas = { label: target.label, distanceM: target.distanceM, seconds };
    } else {
      const b: { label: string; distanceM: number; seconds: number } = asas ?? {
        label: distanceLabel(longest.distanceM),
        distanceM: longest.distanceM,
        seconds: longest.movingS,
      };
      const seconds: number = riegel(b.seconds / 60, b.distanceM, target.distanceM) * 60;
      hasil.push({
        label: target.label,
        distanceM: target.distanceM,
        seconds,
        pace: seconds / (target.distanceM / 1000),
        kind: "prediction",
        from: b.label,
        startedAt: null,
      });
    }
  }
  return hasil;
}
