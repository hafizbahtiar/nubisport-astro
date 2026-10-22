/**
 * Semakan "Kemas kini pelan" (Pelan 5K / 10K / 21K).
 *
 *   bun scripts/check-plan-update.ts
 *
 * Fungsi tulen sahaja. Tiada DOM, tiada rangkaian.
 */
import { pickPlanKey, planKey, remapProgress } from "../src/lib/saved-plans";
import { buildDistancePlan } from "../src/lib/distance-plan";

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

check("sasaran pace masuk kunci; lalai kekal kunci lama", () => {
  ok(planKey(3, "5k", 36, 3) === "pelan-5k:3-5k-36-3", "lalai tanpa pace");
  ok(planKey(3, "5k", 36, 3, 336) === "pelan-5k:3-5k-36-3-p336", "sub-28");
  ok(
    planKey(3, "5k", 36, 3, 300) !== planKey(3, "5k", 36, 3, 336),
    "dua sasaran tak berkongsi kunci",
  );
});

check("pelan lumba: tukar tarikh (minggu) kekal kunci yang sama", () => {
  const lamaLumba = "pelan-5k:14w-jalan-36-3";
  ok(
    pickPlanKey(lamaLumba, [lamaLumba], "pelan-5k:12w-jalan-36-3") === lamaLumba,
    "tarikh lumba",
  );
});

check("remapProgress: 3 -> 4 hari, tanda ikut sesi yang sama", () => {
  const p = (hari: number) => {
    const h = buildDistancePlan({ jarak: "10k", minggu: 10, hari, masa: 30 });
    if (!h.ok) throw new Error(h.sebab);
    return h.minggu;
  };
  const tiga = p(3), empat = p(4);
  // Minggu 2, 3 hari: [mudah, slot2, panjang] -> 4 hari: [mudah, slot2, mudah, panjang].
  ok(tiga[1].sesi[2].jenis === "panjang" && empat[1].sesi[3].jenis === "panjang", "struktur dijangka");
  const baru = remapProgress(["2.0", "2.2"], tiga, empat);
  ok(JSON.stringify(baru) === JSON.stringify(["2.0", "2.3"]), `panjang 2.2 -> 2.3, mudah kekal 2.0 (${baru})`);
  ok(JSON.stringify(remapProgress(["2.2", "2.3"], empat, tiga)) === JSON.stringify(["2.2"]), "4 -> 3 hari: mudah ke-3 dibuang, panjang 2.3 -> 2.2");
  ok(JSON.stringify(remapProgress(["1.0", "2.1"], tiga, tiga)) === JSON.stringify(["1.0", "2.1"]), "struktur sama = tak berubah");
});

if (gagal) throw new Error(`${gagal} semakan gagal`);
console.log(`\n${checks} checks passed.`);
