// bun scripts/check-activity-records.ts - semak PR + ramalan (src/lib/activity-records.ts).
import { personalRecords, type RecordActivity } from "../src/lib/activity-records";
import { riegel } from "../src/lib/distance-plan";

let gagal = 0;
const ok = (c: unknown, msg: string) => {
  if (!c) {
    gagal++;
    console.error("GAGAL:", msg);
  }
};
const hampir = (a: number | undefined, b: number, tol = 0.01) =>
  a !== undefined && Math.abs(a - b) < tol;
const lari = (
  startedAt: string,
  distanceM: number,
  movingS: number,
  sport = "run",
): RecordActivity => ({ startedAt, sport, distanceM, movingS });

// 3K tidak meliputi 5K; 5K/6K/10K jadi PR, 21K/42K diramal dari PR terakhir.
{
  const rows = [
    lari("2026-10-01T00:00:00Z", 3000, 900),
    lari("2026-10-02T00:00:00Z", 5000, 1800),
    lari("2026-10-03T00:00:00Z", 6000, 2400),
    lari("2026-10-04T00:00:00Z", 10000, 4000),
    lari("2026-10-05T00:00:00Z", 30000, 99999, "ride"),
    lari("2026-10-06T00:00:00Z", 5000, 3000, "walk"),
    lari("2026-10-07T00:00:00Z", 2000, 600),
  ];
  const r = personalRecords(rows);
  ok(r.length === 4, `empat jarak (${r.length})`);

  const lima = r[0];
  ok(lima.label === "5K" && lima.kind === "activity", "5K dari aktiviti");
  ok(hampir(lima.seconds, 1800), `PR 5K 30:00 (${lima.seconds})`);
  ok(hampir(lima.pace, 360), `pace PR 5K 6:00/km (${lima.pace})`);
  ok(lima.from === "5K" && lima.startedAt === "2026-10-02T00:00:00Z", "sumber 5K");

  const sepuluh = r[1];
  ok(sepuluh.label === "10K" && sepuluh.kind === "activity", "10K dari aktiviti");
  ok(hampir(sepuluh.seconds, 4000), `PR 10K 66:40 (${sepuluh.seconds})`);

  const separuh = r[2];
  const ramalSeparuh = riegel(4000 / 60, 10, 21.0975) * 60;
  ok(separuh.kind === "prediction" && separuh.from === "10K", "21K diramal dari 10K");
  ok(hampir(separuh.seconds, ramalSeparuh), `ramalan 21K (${separuh.seconds})`);

  const penuh = r[3];
  const ramalPenuh = riegel(4000 / 60, 10, 42.195) * 60;
  ok(penuh.kind === "prediction" && penuh.from === "10K", "42K diramal dari 10K");
  ok(hampir(penuh.seconds, ramalPenuh), `ramalan 42K (${penuh.seconds})`);
}

// Tiada larian yang meliputi 5K: ramal semua jarak dari larian 4K.
{
  const r = personalRecords([lari("2026-10-01T00:00:00Z", 4000, 1440)]);
  ok(r.length === 4 && r.every((x) => x.kind === "prediction"), "semua ramalan");
  const ramal5 = riegel(1440 / 60, 4, 5) * 60;
  ok(hampir(r[0].seconds, ramal5) && r[0].from === "4K", `5K dari 4K (${r[0].seconds})`);
  ok(r[1].from === "4K", "10K dari PR 4K");
  ok(hampir(r[1].seconds, riegel(1440 / 60, 4, 10) * 60), "10K Riegel dari 4K");
}

// Tiada larian >= 3 km / bukan run: tiada PR.
ok(personalRecords([]).length === 0, "kosong = tiada PR");
ok(personalRecords([lari("2026-10-01T00:00:00Z", 2999, 900)]).length === 0, "< 3 km = tiada PR");
ok(
  personalRecords([lari("2026-10-01T00:00:00Z", 10000, 3000, "walk")]).length === 0,
  "walk tidak dikira",
);
ok(
  personalRecords([lari("2026-10-01T00:00:00Z", 10000, 0)]).length === 0,
  "masa sifar tidak dikira",
);

if (gagal) {
  console.error(`\n${gagal} semakan gagal.`);
  throw new Error("semakan gagal");
}
console.log("check-activity-records: semua lulus.");
