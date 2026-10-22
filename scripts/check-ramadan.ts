// bun scripts/check-ramadan.ts - semak src/lib/ramadan.ts (bulan Hijri) + tag/banner Ramadan dalam pelan.
import { hijriMonth, inRamadan } from "../src/lib/ramadan";
import { weekHtml, ramadanNotice } from "../src/lib/plan-render";
import { buildPlan } from "../src/lib/plan-5k";

let gagal = 0;
const ok = (c: unknown, msg: string) => {
  if (!c) {
    gagal++;
    console.error("GAGAL:", msg);
  }
};

// Tarikh Umm al-Qura: Ramadan 1448 = 2027-02-08 hingga 2027-03-08 (anggaran ±1 hari dari JAKIM).
ok(hijriMonth("2027-02-08") === 9, "2027-02-08 = Ramadan");
ok(hijriMonth("2027-03-08") === 9, "2027-03-08 = Ramadan");
ok(!inRamadan("2027-03-09"), "2027-03-09 = Syawal");
ok(hijriMonth("2026-10-18") === 5, "2026-10-18 = Jamadilawal");
ok(!inRamadan("2027-06-01"), "2027-06-01 bukan Ramadan");

// Pelan 4 bulan (16 minggu) bermula 25 Jan 2027 merentas Ramadan; bermula Oktober tidak.
const h = buildPlan({ bulan: 4, tahap: "jalan", hari: 3, masa5k: 40 });
if (!h.ok) throw new Error("pelan ujian gagal");
const isninRamadan = new Date("2027-01-25T00:00:00");
const isninBiasa = new Date("2026-10-19T00:00:00");

const banner = ramadanNotice(h.minggu, isninRamadan);
ok(/Bulan Ramadan · \d+ sesi/.test(banner), "banner Ramadan muncul bila sesi jatuh dalam Hijri 9");
ok(ramadanNotice(h.minggu, isninBiasa) === "", "tiada banner untuk pelan di luar Ramadan");
ok(ramadanNotice(h.minggu, null) === "", "tiada tarikh mula = tiada banner");

const html = h.minggu.map((w) => weekHtml(w, isninRamadan, "")).join("");
ok(html.includes(">Puasa</span>"), "tag Puasa pada sesi dalam Ramadan");
ok(html.includes("Hari puasa: ringankan sesi ini"), "nasihat hari puasa pada sesi itu");
const htmlBiasa = h.minggu.map((w) => weekHtml(w, isninBiasa, "")).join("");
ok(!htmlBiasa.includes("Puasa"), "tiada tag Puasa di luar Ramadan");

if (gagal) throw new Error(`${gagal} semakan gagal`);
console.log("ok - ramadan");
