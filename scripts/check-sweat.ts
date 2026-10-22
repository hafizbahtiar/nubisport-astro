// bun scripts/check-sweat.ts - src/lib/sweat.ts (kadar peluh dari timbang sebelum/selepas).
import { sweatRate } from "../src/lib/sweat";

let gagal = 0;
const ok = (c: unknown, msg: string) => {
  if (!c) {
    gagal++;
    console.error("GAGAL:", msg);
  }
};
const dekat = (a: number, b: number) => Math.abs(a - b) < 1e-9;

const a = sweatRate(70, 69, 500, 60);
ok(a.ok && dekat(a.peluhL, 1.5) && dekat(a.sejamL, 1.5) && dekat(a.peratus, 100 / 70) && !a.naik, "70 -> 69 kg + 500 ml dalam 1 jam = 1.5 L/j, 1.43%");
const b = sweatRate(60, 58.5, 0, 90);
ok(b.ok && dekat(b.sejamL, 1) && b.peratus > 2, "1.5 kg dalam 90 min = 1 L/j, > 2%");
const c = sweatRate(60, 60.3, 1000, 60);
ok(c.ok && c.naik && dekat(c.peluhL, 0.7), "berat naik = minum lebih dari peluh");
ok(!sweatRate(70, 60, 0, 60).ok && !sweatRate(20, 20, 0, 60).ok && !sweatRate(70, 69, -1, 60).ok && !sweatRate(70, 69, 0, 5).ok && !sweatRate(NaN, 69, 0, 60).ok, "luar julat ditolak");

if (gagal) throw new Error(`${gagal} semakan gagal`);
console.log("ok - peluh");
