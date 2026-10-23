// Ringkasan aktiviti untuk Dashboard (larian + jalan, 8 minggu). Tulen - tiada DOM, tiada API.
// Waktu Malaysia (Isnin-Ahad); semak: bun scripts/check-activity-summary.ts
import { addDays, todayMY } from "./date";

export type DashboardSport = "run" | "walk" | "hike" | "ride" | "other";

export interface DashboardActivity {
  id?: number;
  startedAt: string;
  sport: string;
  name?: string | null;
  distanceM: number;
  movingS: number;
  elevationGainM?: number | null;
  runRatio?: number | null;
  updatedAt?: string | null;
}

export interface WeekBucket {
  start: string;
  label: string;
  distanceM: number;
  movingS: number;
  count: number;
}

export interface ActivitySummary {
  count: number;
  distanceM: number;
  movingS: number;
  elevationGainM: number;
  activeWeeks: number;
  weeks: WeekBucket[];
  recent: DashboardActivity[];
  runRatio: number | null;
}

const RUN_WALK = new Set(["run", "walk"]);
const MONTHS = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogos", "Sep", "Okt", "Nov", "Dis"];

const weekStart = (date: string) =>
  addDays(date, -((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7));

const weekLabel = (start: string, current: string) => {
  if (start === current) return "Minggu ini";
  const d = new Date(`${start}T00:00:00Z`);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};

const emptyWeek = (start: string, current: string): WeekBucket => ({
  start,
  label: weekLabel(start, current),
  distanceM: 0,
  movingS: 0,
  count: 0,
});

/** 8 bucket Isnin-Ahad, lama -> baru; hanya run/walk. */
export function summarizeActivities(
  rows: DashboardActivity[],
  now = new Date(),
  weeks = 8,
): ActivitySummary {
  const today = todayMY(now);
  const current = weekStart(today);
  const first = addDays(current, -(weeks - 1) * 7);
  const buckets = new Map<string, WeekBucket>();
  for (let i = 0; i < weeks; i++) {
    const start = addDays(first, i * 7);
    buckets.set(start, emptyWeek(start, current));
  }

  const inWindow: DashboardActivity[] = [];
  for (const row of rows) {
    if (!RUN_WALK.has(row.sport)) continue;
    const ms = Date.parse(row.startedAt);
    if (!Number.isFinite(ms)) continue;
    const date = todayMY(new Date(ms));
    const start = weekStart(date);
    if (start < first || start > current) continue;
    inWindow.push(row);
    const bucket = buckets.get(start);
    if (!bucket) continue;
    bucket.distanceM += row.distanceM;
    bucket.movingS += row.movingS;
    bucket.count++;
  }

  const recent = rows
    .filter((row) => RUN_WALK.has(row.sport) && !Number.isNaN(Date.parse(row.startedAt)))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, 3);

  let ratioWeight = 0;
  let ratioTotal = 0;
  for (const row of inWindow) {
    if (typeof row.runRatio !== "number") continue;
    ratioWeight += row.runRatio * row.movingS;
    ratioTotal += row.movingS;
  }

  return {
    count: inWindow.length,
    distanceM: inWindow.reduce((sum, row) => sum + row.distanceM, 0),
    movingS: inWindow.reduce((sum, row) => sum + row.movingS, 0),
    elevationGainM: inWindow.reduce((sum, row) => sum + (row.elevationGainM ?? 0), 0),
    activeWeeks: [...buckets.values()].filter((week) => week.count > 0).length,
    weeks: [...buckets.values()],
    recent,
    runRatio: ratioTotal ? ratioWeight / ratioTotal : null,
  };
}
