// bun scripts/check-plan-list.ts - plans index data (src/lib/plan-list.ts).
// Mocks localStorage; no DOM/network.
import { describePlan, savedPlans } from "../src/lib/plan-list";
import { paramsFromKey, savedPlanParams } from "../src/lib/saved-plans";

let checks = 0;
let failed = 0;
const ok = (condition: unknown, message: string) => {
  checks++;
  if (!condition) {
    failed++;
    console.error("GAGAL:", message);
  }
  return !!condition;
};

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
};
const set = (key: string, value: unknown) => store.set(key, JSON.stringify(value));

const key5k = "pelan-5k:3-5k-36-3-p336";
const key10k = "pelan-10k:10-45--4";
const key21k = "pelan-21k:16-65--3";
const key42k = "pelan-42k:18-130--4";
set("pelan-5k:dibuat", [key5k, key10k, key21k, key42k]);
set(`${key5k}#p`, {
  bulan: "3",
  tahap: "5k",
  masa: "36",
  hari: "3",
  pace: "336",
  mula: "2026-10-26",
});
set(`${key10k}#p`, { jarak: "10k", minggu: "10", masa: "45", hari: "4" });
set(`${key21k}#p`, { jarak: "21k", minggu: "16", masa: "65", hari: "3" });
set(`${key42k}#p`, { jarak: "42k", minggu: "18", masa: "130", hari: "4" });

const plans = savedPlans();
ok(plans.length === 4, `empat pelan (${plans.length})`);

const fiveK = plans.find((plan) => plan.kind === "5k");
ok(fiveK?.name.startsWith("5K · 3 bulan"), `nama 5K (${fiveK?.name})`);
ok(fiveK?.total === 12 * 3, `jumlah sesi 5K (${fiveK?.total})`);
ok(
  fiveK?.href === `/account/plans/5k/view?kunci=${encodeURIComponent(key5k)}`,
  `href 5K (${fiveK?.href})`,
);

const tenK = plans.find((plan) => plan.kind === "10k");
ok(tenK?.name.startsWith("10K · 10 minggu"), `nama 10K (${tenK?.name})`);
ok(
  tenK?.href === `/account/plans/10k/view?kunci=${encodeURIComponent(key10k)}`,
  `href 10K view baharu (${tenK?.href})`,
);

const twentyOneK = plans.find((plan) => plan.kind === "21k");
ok(
  twentyOneK?.href ===
  `/account/plans/21k/view?kunci=${encodeURIComponent(key21k)}`,
  `href 21K view baharu (${twentyOneK?.href})`,
);

const fortyTwoK = plans.find((plan) => plan.kind === "42k");
ok(
  fortyTwoK?.href ===
  `/account/plans/42k/view?kunci=${encodeURIComponent(key42k)}`,
  `href 42K view baharu (${fortyTwoK?.href})`,
);

// Old keys without a `#p` record can still be rebuilt (view/edit can open them).
ok(paramsFromKey("pelan-5k:3-jalan-36-3-p300")?.pace === "300", "pace dari kunci lama");
ok(paramsFromKey(key21k)?.jarak === "21k", "jarak dari kunci lama");
ok(paramsFromKey("pelan-5k:14w-jalan-36-3")?.bulan === "14w", "minggu lumba dari kunci lama");
ok(paramsFromKey("bukan-pelan:x") === null, "kunci tak dikenali = null");

// View: only a saved plan of that page's kind opens; a foreign key from the URL creates nothing.
ok(savedPlanParams(key5k, "pelan-5k")?.pace === "336", "view 5K: pelan tersimpan");
ok(savedPlanParams(key10k, "pelan-5k") === null, "view 5K: kunci 10K ditolak");
ok(savedPlanParams("pelan-5k:3-jalan--3", "pelan-5k") === null, "view 5K: kunci bukan dalam senarai ditolak");
ok(savedPlanParams("pelan-5k:dibuat", "pelan-5k") === null, "view 5K: CREATED_KEY bukan pelan");
ok(savedPlanParams(null, "pelan-10k") === null, "view: tiada kunci");
ok(savedPlanParams(key10k, "pelan-10k")?.jarak === "10k", "view 10K: pelan tersimpan");
// Dashboard + index share describePlan; broken keys/params skip instead of throwing.
ok(describePlan("tiada-titik-dua") === null, "kunci tanpa ':' = null");
set("pelan-5k:3-constructor--3#p", { bulan: "3", tahap: "constructor", hari: "3" });
ok(describePlan("pelan-5k:3-constructor--3") === null, "tahap prototaip = null");
set("pelan-10k:12-50--3#p", { jarak: "10k", minggu: "12", masa: "50", hari: "3", lumba: "2027-01-31", mula: "2026-11-02" });
ok(describePlan("pelan-10k:12-50--3")?.name.startsWith("10K · Lumba "), "nama pelan lumba");

if (failed) {
  console.error(`\n${failed} semakan gagal.`);
  throw new Error("semakan gagal");
}
console.log(`check-plan-list: ${checks} semakan lulus.`);
