// bun scripts/check-plan-save.ts - satu laluan simpan pelan (src/lib/plan-save.ts).
// Mocks localStorage; no DOM/network.
import { CREATED_KEY, readList, readParams } from "../src/lib/saved-plans";
import { savePlan } from "../src/lib/plan-save";

let checks = 0;
let failed = 0;
const ok = (condition: unknown, message: string) => {
  checks++;
  if (!condition) {
    failed++;
    console.error("GAGAL:", message);
  }
};

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
};
const reset = () => {
  store.clear();
};

reset();
const five = savePlan("5k", { bulan: "3", tahap: "5k", masa: "36", hari: "3", pace: "336", mula: "2026-10-26" });
ok(five.ok, "5K create berjaya");
if (five.ok) {
  ok(five.key === "pelan-5k:3-5k-36-3-p336", `5K key (${five.key})`);
  ok(readParams(five.key)?.mula === "2026-10-26", "5K params mula");
  ok(readList(CREATED_KEY).includes(five.key), "5K listed");
  store.set(five.key, JSON.stringify(["0.0", "1.2"]));
  const update = savePlan("5k", { ...five.params, hari: "4" }, five.key);
  ok(update.ok && update.key === five.key, "5K update kekal key");
  ok(readList(five.key).length > 0, "5K update remap progress");
}

reset();
for (const [kind, params] of [
  ["10k", { minggu: "12", masa: "45", sasaran: "60", hari: "4" }],
  ["21k", { minggu: "16", masa: "65", sasaran: "120", hari: "3" }],
  ["42k", { minggu: "18", masa: "130", sasaran: "240", hari: "4" }],
] as const) {
  const r = savePlan(kind, params);
  ok(r.ok, `${kind} create berjaya`);
  if (r.ok) {
    ok(r.key.startsWith(`pelan-${kind}:`), `${kind} key`);
    ok(readParams(r.key)?.jarak === kind, `${kind} params jarak`);
  }
}

reset();
const badTahap = savePlan("5k", { bulan: "3", tahap: "__proto__", hari: "3" });
ok(!badTahap.ok, "tahap __proto__ ditolak");
const badWeeks = savePlan("10k", { minggu: "4", masa: "45", hari: "3" });
ok(!badWeeks.ok, "minggu luar julat ditolak");
const badDate = savePlan("5k", { bulan: "3", tahap: "5k", hari: "3", mula: "26/10/2026" });
ok(!badDate.ok, "tarikh salah ditolak");

if (failed) throw new Error(`${failed} semakan gagal`);
console.log(`check-plan-save: ${checks} semakan lulus.`);
