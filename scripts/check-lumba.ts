// bun scripts/check-lumba.ts - src/data/lumba.ts: bentuk data sah + setiap acara disemak dalam 3 bulan.
import { LUMBA } from "../src/data/lumba";
import { tarikhMY } from "../src/lib/lumba";

let gagal = 0;
const ok = (c: unknown, msg: string) => {
  if (!c) {
    gagal++;
    console.error("GAGAL:", msg);
  }
};
const isoSah = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(s).toISOString().startsWith(s);

ok(tarikhMY(new Date("2026-10-17T16:30:00Z")) === "2026-10-18", "tarikhMY ikut waktu Malaysia");

const hari = tarikhMY();
const had = new Date(hari);
had.setUTCMonth(had.getUTCMonth() - 3);
const tigaBulan = had.toISOString().slice(0, 10);

const id = new Set<string>();
for (const l of LUMBA) {
  ok(/^[a-z0-9-]+$/.test(l.id) && !id.has(l.id), `${l.id}: id slug unik`);
  id.add(l.id);
  ok(isoSah(l.tarikh) && isoSah(l.disemak), `${l.id}: tarikh / disemak YYYY-MM-DD`);
  ok(/^([01]\d|2[0-3]):[0-5]\d$/.test(l.mula), `${l.id}: mula HH:MM`);
  ok(l.tutup === undefined || (isoSah(l.tutup) && l.tutup <= l.tarikh), `${l.id}: tutup sah dan sebelum hari lumba`);
  ok(l.pautan.startsWith("https://"), `${l.id}: pautan https`);
  ok(l.jarak.length > 0 && l.nama && l.tempat && l.negeri, `${l.id}: medan wajib`);
  ok(l.disemak <= hari, `${l.id}: disemak bukan tarikh depan`);
  ok(l.tarikh < hari || l.disemak >= tigaBulan, `${l.id}: disemak ${l.disemak} > 3 bulan - buka pautan rasmi dan semak semula`);
}
const datang = LUMBA.filter((l) => l.tarikh >= hari).length;

if (gagal) throw new Error(`${gagal} semakan gagal`);
console.log(`ok - ${LUMBA.length} acara (${datang} akan datang)`);
