// bun scripts/check-tarikh.ts - dd/mm/yyyy dan grid kalendar (src/lib/tarikh.ts).
import { dmyKeIso, gridBulan, hariIniMY, isoKeDmy, tambahBulan } from "../src/lib/tarikh";

let gagal = 0;
const ok = (c: unknown, msg: string) => {
  if (!c) {
    gagal++;
    console.error("GAGAL:", msg);
  }
};

ok(isoKeDmy("2027-02-08") === "08/02/2027", "iso -> dmy");
ok(isoKeDmy("bad") === "", "iso rosak");
ok(dmyKeIso("08/02/2027") === "2027-02-08", "dmy");
ok(dmyKeIso("8/2/2027") === "2027-02-08", "dmy pendek");
ok(dmyKeIso("08-02-2027") === "2027-02-08", "sengkang");
ok(dmyKeIso("08022027") === "2027-02-08", "digit sahaja");
ok(dmyKeIso("29/02/2028") === "2028-02-29", "hari lompat");
ok(dmyKeIso("29/02/2027") === null, "bukan tahun lompat");
ok(dmyKeIso("31/04/2026") === null, "31 April");
ok(dmyKeIso("02/13/2026") === null, "bulan 13 (susunan US)");
ok(dmyKeIso("") === null, "kosong");
const okt = gridBulan(2026, 10); // 1 Okt 2026 = Khamis
ok(okt.length === 42, "42 petak");
ok(okt[0].iso === "2026-09-28", "grid mula Isnin");
ok(okt[3].iso === "2026-10-01" && okt[3].dalamBulan, "1 Okt hari Khamis");
ok(okt.filter((c) => c.dalamBulan).length === 31, "31 hari Oktober");
ok(tambahBulan("2026-01-31", 1) === "2026-02-28", "had ke Februari");
ok(tambahBulan("2026-01-15", -1) === "2025-12-15", "undur setahun");
// 17 Okt 2026 23:30 UTC = 18 Okt 07:30 Malaysia
ok(hariIniMY(new Date("2026-10-17T23:30:00Z")) === "2026-10-18", "hari ini ikut Malaysia");

if (gagal) throw new Error(`${gagal} semakan gagal`);
console.log("ok - tarikh");
