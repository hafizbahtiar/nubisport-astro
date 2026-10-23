// bun scripts/check-ai-tools.ts - tool AI fasa 1b: argumen, tool tulis ditolak, ringkasan tanpa koordinat.
import {
  WRITE_TOOLS,
  activitySummary,
  parseToolArgs,
  runTool,
  toolContent,
} from "../src/lib/ai-tools";

let gagal = 0;
const ok = (c: unknown, msg: string) => {
  if (!c) {
    gagal++;
    console.error("GAGAL:", msg);
  }
};

ok(parseToolArgs('{"key":"pelan-5k:3-sifar-30-3"}').key === "pelan-5k:3-sifar-30-3", "JSON objek");
ok(typeof parseToolArgs("bukan json").ralat === "string", "JSON rosak = ralat");
ok(typeof parseToolArgs("[]").ralat === "string", "array = ralat");

for (const name of WRITE_TOOLS) {
  const hasil = await runTool(name, "{}");
  ok(typeof hasil.ralat === "string", `${name} tidak menulis`);
}
ok(typeof (await runTool("tool-asing", "{}")).ralat === "string", "tool asing ditolak");
ok(typeof (await runTool("get_plan", '{"key":"tiada"}')).ralat === "string", "pelan asing ditolak");

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
