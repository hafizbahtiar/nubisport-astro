// bun scripts/check-timer.ts - segmen pemasa dalam setiap pelan + src/lib/timer.ts.
import { PLAN_MONTHS, buildPlan, DAYS_PER_WEEK, type Week, type Level } from "../src/lib/plan-5k";
import { buildDistancePlan, DISTANCES, riegel, type Distance } from "../src/lib/distance-plan";
import { totalSeconds, positionAt, mmss, segmentStart, durationText } from "../src/lib/timer";

let gagal = 0;
const ok = (c: unknown, msg: string) => {
  if (!c) {
    gagal++;
    console.error("GAGAL:", msg);
  }
};

const seg = [
  { buat: "jalan", saat: 300 },
  { buat: "lari", saat: 60 },
  { buat: "jalan", saat: 90 },
] as const;
const k = (t: number) => positionAt([...seg], t);
ok(k(0).i === 0 && k(0).baki === 300 && k(0).bakiJumlah === 450, "mula");
ok(k(299.5).i === 0 && k(300).i === 1 && k(300).baki === 60, "sempadan segmen");
ok(k(449.9).i === 2 && !k(449.9).selesai, "segmen akhir");
ok(k(450).selesai && k(450).i === 3 && k(9999).selesai, "selesai");
ok(segmentStart([...seg], 2) === 360, "segmentStart");
ok(mmss(65) === "1:05" && mmss(0.2) === "0:01" && mmss(-3) === "0:00", "mmss");
ok(durationText(90) === "1 min 30 saat" && durationText(20) === "20 saat" && durationText(180) === "3 min", "tempoh");

let sesi = 0;
const semak = (nama: string, minggu: Week[]) => {
  for (const w of minggu)
    w.sesi.forEach((s, i) => {
      const n = `${nama} m${w.no}.${i} ${s.tajuk}`;
      if (s.jenis === "ujian") return ok(!s.segmen, `${n}: ujian/lumba ikut jarak, tiada pemasa`);
      sesi++;
      ok(s.segmen?.length, `${n}: tiada segmen`);
      ok(s.segmen!.every((x) => Number.isInteger(x.saat) && x.saat > 0), `${n}: saat tak sah`);
      const t = totalSeconds(s.segmen!);
      // Jalan-lari mesti tepat sama dengan minit kad; lain-lain boleh lebih (langkah laju ditambah di hujung)
      // atau beza sikit (interval/tempo dibundar).
      if (s.jenis === "jalan-lari") ok(t === s.minit * 60, `${n}: ${t} s != ${s.minit} min`);
      else ok(Math.abs(t - s.minit * 60) <= 8 * 60, `${n}: ${t} s jauh dari ${s.minit} min`);
    });
};

for (const bulan of PLAN_MONTHS)
  for (const hari of DAYS_PER_WEEK)
    for (const [tahap, masa] of [["sifar"], ["jalan"], ["jalan", 40], ["5k", 35], ["5k", 45]] as [Level, number?][]) {
      const h = buildPlan({ bulan, tahap, hari, masa5k: masa });
      if (h.ok) semak(`5k ${bulan}b ${hari}h ${tahap} ${masa ?? ""}`, h.minggu);
    }
for (const jarak of Object.keys(DISTANCES) as Distance[]) {
  const c = DISTANCES[jarak];
  const masa = jarak === "10k" ? 30 : 60;
  for (const minggu of c.minggu)
    for (const hari of [3, 4])
      for (const sasaran of [undefined, Math.round(riegel(masa, c.prasyarat.km, c.km) * 0.95)]) {
        const h = buildDistancePlan({ jarak, minggu, hari, masa, sasaran });
        if (h.ok) semak(`${jarak} ${minggu}mgg ${hari}h ${sasaran ?? ""}`, h.minggu);
      }
}

if (gagal) throw new Error(`${gagal} semakan gagal`);
console.log(`ok - ${sesi} sesi ada segmen pemasa`);
