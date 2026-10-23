// bun scripts/check-badges.ts - katalog frontend + plan proof (src/lib/badges.ts).
// localStorage di-mock sebab savedPlans() membaca pelan pelayar.
let failed = 0;
const ok = (condition: unknown, message: string) => {
  if (!condition) {
    failed++;
    console.error("GAGAL:", message);
  }
};

const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
} as Storage;

const { BADGES, planProofFromSavedPlans } = await import("../src/lib/badges");
const { CREATED_KEY } = await import("../src/lib/saved-plans");
const { describePlan } = await import("../src/lib/plan-list");

const ids = BADGES.map((b) => b.id);
ok(BADGES.length === 6, "enam lencana");
ok(new Set(ids).size === ids.length, "ID unik");
ok(
  ids.join(",") === "first_5k,first_10k,four_week_streak,ten_attended,monthly_50k,plan_finished",
  "ID sepadan dengan katalog backend",
);
ok(BADGES.every((b) => b.label && b.description && b.hint), "setiap lencana ada teks");

ok(planProofFromSavedPlans() === undefined, "tiada pelan = tiada proof");

const key = "pelan-5k:3-jalan-50-3";
store.set(
  `${key}#p`,
  JSON.stringify({ bulan: "3", tahap: "jalan", masa: "50", hari: "3", mula: "2026-11-02" }),
);
store.set(CREATED_KEY, JSON.stringify([key]));
store.set(key, JSON.stringify([]));

const plan = describePlan(key);
ok(!!plan && plan.total > 0, "pelan 5K boleh dibina");
ok(planProofFromSavedPlans() === undefined, "pelan belum siap = tiada proof");

if (plan) {
  store.set(
    key,
    JSON.stringify(plan.weeks.flatMap((w) => w.sesi.map((_, i) => `${w.no}.${i}`))),
  );
  const proof = planProofFromSavedPlans();
  ok(!!proof && proof.key === key, "pelan siap = proof kunci betul");
  ok(!!proof && proof.done === plan.total && proof.total === plan.total, "proof done/total");
}

if (failed) {
  console.error(`\n${failed} semakan gagal.`);
  throw new Error("semakan gagal");
}
console.log("check-badges: semua lulus.");

export {};
