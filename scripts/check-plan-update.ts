/**
 * Semakan "Kemas kini pelan" (Pelan 5K / 10K / 21K).
 *
 *   bun scripts/check-plan-update.ts
 *
 * Fungsi tulen sahaja. Tiada DOM, tiada rangkaian.
 */
import { pickPlanKey } from "../src/lib/saved-plans";

let checks = 0;
let gagal = 0;
const ok = (c: unknown, msg: string) => {
  if (!c) {
    gagal++;
    console.error("GAGAL:", msg);
  }
  return !!c;
};
const check = (label: string, fn: () => void) => {
  fn();
  checks++;
  console.log(`  ✓ ${label}`);
};

const lama = "pelan-5k:3-jalan-36-3";
const baharu = "pelan-5k:4-jalan-36-3";

console.log("Menyemak kemas kini pelan...\n");

check("kunci dalam URL dipakai bila ia pelan sedia ada (update)", () => {
  ok(pickPlanKey(lama, [lama], baharu) === lama, "kunci sedia ada");
});

check("tanpa kunci / kunci tak tersimpan / jenis lain = pelan baharu", () => {
  ok(pickPlanKey(null, [lama], baharu) === baharu, "tiada kunci");
  ok(pickPlanKey(lama, [], baharu) === baharu, "kunci tak tersimpan");
  ok(
    pickPlanKey("pelan-10k:12-40-3", ["pelan-10k:12-40-3"], "pelan-21k:16-65-3") ===
    "pelan-21k:16-65-3",
    "jenis lain",
  );
});

check("pelan lumba: tukar tarikh (minggu) kekal kunci yang sama", () => {
  const lamaLumba = "pelan-5k:14w-jalan-36-3";
  ok(
    pickPlanKey(lamaLumba, [lamaLumba], "pelan-5k:12w-jalan-36-3") === lamaLumba,
    "tarikh lumba",
  );
});

if (gagal) throw new Error(`${gagal} semakan gagal`);
console.log(`\n${checks} checks passed.`);
