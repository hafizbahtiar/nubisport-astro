// bun scripts/check-maf.ts - semak src/lib/maf.ts terhadap formula 180 (philmaffetone.com/180-formula).
import { CONDITIONS, ZONE_WIDTH, TEEN_MAF, AGE_MAX, AGE_MIN, calcMaf, type Condition } from "../src/lib/maf";

let gagal = 0;
const ok = (c: unknown, msg: string) => {
  if (!c) {
    gagal++;
    console.error("GAGAL:", msg);
  }
};
const maf = (umur: number, k: Condition) => {
  const h = calcMaf(umur, k);
  return h.ok ? h.maf : NaN;
};

// Contoh formula: 180 - umur, kemudian a) -10 b) -5 c) 0 d) +5
ok(maf(30, "sakit") === 140, "30 a = 140");
ok(maf(30, "terganggu") === 145, "30 b = 145");
ok(maf(30, "konsisten") === 150, "30 c = 150");
ok(maf(30, "maju") === 155, "30 d = 155");
ok(maf(45, "terganggu") === 130, "45 b = 130");
// 16 ke bawah: 165 tetap, apa pun kategori; 17 guna formula
ok(maf(16, "konsisten") === TEEN_MAF && maf(12, "sakit") === TEEN_MAF, "16 ke bawah = 165");
ok(maf(17, "konsisten") === 163, "17 c = 163");
// Zon dan nota
const h = calcMaf(40, "konsisten");
ok(h.ok && h.bawah === h.maf - ZONE_WIDTH && h.nota.length === 0, "zon + tiada nota");
const tua = calcMaf(70, "maju");
ok(tua.ok && tua.maf === 115 && tua.nota.length === 1, "70 d: 115 + nota >65 (tiada tambah automatik)");
ok((calcMaf(70, "konsisten") as { nota: string[] }).nota.length === 0, "70 c: tiada nota >65");
ok((calcMaf(40, "sakit") as { nota: string[] }).nota.length === 1, "a: nota ubat");
// Ditolak
for (const u of [AGE_MIN - 1, AGE_MAX + 1, 30.5, NaN]) ok(!calcMaf(u, "konsisten").ok, `umur ${u} ditolak`);
ok(!calcMaf(30, "x" as Condition).ok, "kategori tak sah ditolak");
ok(Object.keys(CONDITIONS).length === 4, "4 kategori");
ok(!calcMaf(30, "constructor" as Condition).ok, "keadaan constructor (prototaip) ditolak");

if (gagal) throw new Error(`${gagal} semakan gagal`);
console.log("ok - MAF");
