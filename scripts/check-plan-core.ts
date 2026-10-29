// bun scripts/check-plan-core.ts - plan-core.ts kekal bebas DOM dan pengeksport lama masih sama.
import { readFileSync } from "node:fs";
import * as core from "../src/lib/plan-core";
import { planSessions } from "../src/lib/plan-sync";
import { remapProgress } from "../src/lib/saved-plans";
import { planKeyFor } from "../src/lib/plan-save";

let checks = 0;
let failed = 0;
const ok = (condition: unknown, message: string) => {
  checks++;
  if (!condition) {
    failed++;
    console.error("GAGAL:", message);
  }
};

const text = readFileSync(new URL("../src/lib/plan-core.ts", import.meta.url), "utf8");
const imports = [...text.matchAll(/^import .*?from "([^"]+)"/gms)].map((m) => m[1]);
ok(imports.length > 0 && imports.every((i) => ["./plan-5k", "./distance-plan", "./date", "./maf"].includes(i)), `import dibenarkan sahaja: ${imports}`);
ok(!/localStorage|document\.|window\.|fetch\(/.test(text), "tiada API pelayar");

const s = core.planSessions("pelan-5k:3-jalan--3", { bulan: "3", tahap: "jalan", hari: "3", mula: "2026-11-02" });
ok(s?.length === 36, `36 sesi (dapat ${s?.length})`);
ok(s?.[0].id === "1.0" && s?.[0].tarikh === "2026-11-02", "sesi pertama 1.0 @ 2026-11-02");

ok(planSessions === core.planSessions, "planSessions sama");
ok(remapProgress === core.remapProgress, "remapProgress sama");
ok(planKeyFor === core.planKeyFor, "planKeyFor sama");

if (failed) throw new Error(`${failed} semakan gagal`);
console.log(`check-plan-core: ${checks} semakan lulus.`);
