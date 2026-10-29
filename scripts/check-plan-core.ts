// bun scripts/check-plan-core.ts - pengeksport lama masih sama.
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

ok(planSessions === core.planSessions, "planSessions sama");
ok(remapProgress === core.remapProgress, "remapProgress sama");
ok(planKeyFor === core.planKeyFor, "planKeyFor sama");

if (failed) throw new Error(`${failed} semakan gagal`);
console.log(`check-plan-core: ${checks} semakan lulus.`);
