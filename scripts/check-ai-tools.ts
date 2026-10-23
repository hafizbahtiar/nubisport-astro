// bun scripts/check-ai-tools.ts - tool AI: baca, cadangan tulis, valiasi, tiada tulisan awal.
import {
  WRITE_TOOLS,
  activitySummary,
  parseToolArgs,
  runTool,
  toolContent,
  type ToolOutcome,
} from "../src/lib/ai-tools";

let gagal = 0;
const ok = (c: unknown, msg: string) => {
  if (!c) {
    gagal++;
    console.error("GAGAL:", msg);
  }
};
const ralat = (out: ToolOutcome) => ("result" in out ? out.result.ralat : undefined);

ok(parseToolArgs('{"key":"pelan-5k:3-sifar-30-3"}').key === "pelan-5k:3-sifar-30-3", "JSON objek");
ok(typeof parseToolArgs("bukan json").ralat === "string", "JSON rosak = ralat");
ok(typeof parseToolArgs("[]").ralat === "string", "array = ralat");

for (const name of WRITE_TOOLS) {
  const out = await runTool(name, "{}");
  ok("result" in out || "proposal" in out, `${name} pulang outcome`);
}
ok(typeof ralat(await runTool("tool-asing", "{}")) === "string", "tool asing ditolak");
ok(typeof ralat(await runTool("get_plan", '{"key":"tiada"}')) === "string", "pelan asing ditolak");
const races = await runTool("list_races", "{}");
ok("result" in races && Array.isArray((races.result as any).races), "list_races pulang senarai");
ok(typeof ralat(await runTool("get_run_conditions", '{}')) === "string", "run conditions tanpa negeri = ralat jelas");
ok(typeof ralat(await runTool("get_activity_detail", "{}")) === "string", "activity id tak sah = ralat");

const plan = await runTool("create_plan", JSON.stringify({ distance: "10k", minggu: 12, masa: 45, hari: 3 }));
ok("proposal" in plan && plan.proposal.title.includes("10K"), "create_plan = cadangan, bukan tulisan");
const profile = await runTool("update_profile", JSON.stringify({ berat: 68 }));
ok("proposal" in profile || ralat(profile) !== undefined, "update_profile = cadangan/ralat");

const a = activitySummary({
  id: 1,
  startedAt: "2026-10-01T06:00:00Z",
  sport: "run",
  name: "Larian",
  distanceM: 5000,
  movingS: 1800,
  lat: 3.1,
  points: [[3.1, 101.6]],
});
ok(a.distanceKm === 5 && a.paceSPerKm === 360, "km + pace");
ok(!("lat" in a) && !("points" in a) && !("user_id" in a), "tiada koordinat/id");
ok(toolContent({ teks: "a".repeat(9000) }).length <= 8000, "hasil tool <= 8000");

if (gagal) throw new Error(`${gagal} semakan gagal`);
console.log("ok - tool AI");
