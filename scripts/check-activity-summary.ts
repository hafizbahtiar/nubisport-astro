// bun scripts/check-activity-summary.ts - semak bucket 8 minggu dashboard (src/lib/activity-summary.ts).
import { summarizeActivities, type DashboardActivity } from "../src/lib/activity-summary";

let failed = 0;
const ok = (condition: unknown, message: string) => {
  if (!condition) {
    failed++;
    console.error("GAGAL:", message);
  }
};

const now = new Date("2026-10-22T12:00:00Z"); // Khamis, Malaysia
const rows: DashboardActivity[] = [
  // Isnin 00:30 waktu Malaysia = Ahad 16:30 UTC - mesti masuk minggu 19 Okt.
  { id: 1, startedAt: "2026-10-18T16:30:00Z", sport: "run", distanceM: 5000, movingS: 1800, elevationGainM: 10, runRatio: 0.8 },
  { id: 2, startedAt: "2026-10-20T00:00:00Z", sport: "run", distanceM: 10000, movingS: 3600, elevationGainM: 20, runRatio: 0.6 },
  { id: 3, startedAt: "2026-10-12T00:00:00Z", sport: "walk", distanceM: 3000, movingS: 1800, elevationGainM: null, runRatio: 0.2 },
  { id: 4, startedAt: "2026-09-30T00:00:00Z", sport: "run", distanceM: 4000, movingS: 1500, elevationGainM: 5, runRatio: null },
  { id: 5, startedAt: "2026-09-01T00:00:00Z", sport: "run", distanceM: 9000, movingS: 3000, elevationGainM: 15, runRatio: 0.9 },
  { id: 6, startedAt: "2026-10-21T00:00:00Z", sport: "ride", distanceM: 50000, movingS: 3600, elevationGainM: 100 },
  { id: 7, startedAt: "bukan-tarikh", sport: "run", distanceM: 1000, movingS: 600, elevationGainM: 0 },
];

const summary = summarizeActivities(rows, now);
ok(summary.weeks.length === 8, "lapan bucket");
ok(summary.weeks.at(-1)?.start === "2026-10-19", "minggu semasa bermula Isnin 19 Okt");
ok(summary.weeks.at(-1)?.label === "Minggu ini", "label minggu semasa");
ok(summary.weeks[0]?.start === "2026-08-31", "bucket pertama 8 minggu lalu");
ok(summary.weeks.at(-1)?.count === 2, "dua aktiviti minggu semasa");
ok(summary.weeks.at(-1)?.distanceM === 15000, "jarak minggu semasa");
ok(summary.count === 5, "lima run/walk dalam tetingkap");
ok(summary.distanceM === 31000, "jumlah jarak run/walk");
ok(summary.movingS === 11700, "jumlah masa bergerak");
ok(summary.elevationGainM === 50, "ketinggian hanya nilai bukan null");
ok(summary.activeWeeks === 4, "empat minggu aktif");
ok(summary.recent.map((a) => a.id).join(",") === "2,1,3", "recent run/walk terbaru, ride dan invalid dibuang");
ok(summary.recent.every((a) => a.sport !== "ride"), "ride tidak masuk recent");
ok(Math.abs((summary.runRatio ?? 0) - (0.8 * 1800 + 0.6 * 3600 + 0.2 * 1800 + 0.9 * 3000) / (1800 + 3600 + 1800 + 3000)) < 0.0001, "runRatio berwajaran movingS");

const empty = summarizeActivities([], now);
ok(empty.count === 0 && empty.weeks.length === 8, "data kosong masih lapan bucket");
ok(empty.weeks.every((w) => w.count === 0 && w.distanceM === 0), "bucket kosong sifar");
ok(empty.recent.length === 0 && empty.runRatio === null, "recent/runRatio kosong");

if (failed) {
  console.error(`\n${failed} semakan gagal.`);
  throw new Error("semakan gagal");
}
console.log("check-activity-summary: semua lulus.");
