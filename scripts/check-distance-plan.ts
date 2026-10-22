// bun scripts/check-distance-plan.ts - semak src/lib/distance-plan.ts untuk setiap gabungan input.
import { analyzeDistancePlan, buildDistancePlan, formatTime, DISTANCES, riegel, type Distance } from "../src/lib/distance-plan";

let gagal = 0;
const ok = (c: unknown, msg: string) => {
  if (!c) {
    gagal++;
    console.error("GAGAL:", msg);
  }
};

ok(formatTime(52.5) === "52:30" && formatTime(125) === "2:05:00", "jam()");
ok(Math.abs(riegel(30, 5, 10) - 62.55) < 0.1, "riegel 5K 30 -> 10K ~62.5");

const ORDER = ["Asas", "Daya tahan", "Kelajuan", "Tirus", "Ujian"];
let pelan = 0;
for (const jarak of Object.keys(DISTANCES) as Distance[]) {
  const c = DISTANCES[jarak];
  const masaSet = jarak === "10k" ? [22, 28, 35, 45, 60] : [45, 55, 65, 80, 110];
  for (const minggu of c.minggu)
    for (const hari of [3, 4])
      for (const masa of masaSet)
        for (const sasaran of [undefined, Math.round(riegel(masa, c.prasyarat.km, c.km) * 0.95)]) {
          const nama = `${jarak} ${minggu}mgg ${hari}h masa ${masa}${sasaran ? ` -> ${sasaran}` : ""}`;
          const h = buildDistancePlan({ jarak, minggu, hari, masa, sasaran });
          if (!h.ok) { ok(false, `${nama}: ${h.sebab}`); continue; }
          pelan++;
          ok(h.minggu.length === minggu, `${nama}: ${h.minggu.length} minggu`);
          h.minggu.forEach((w, i) => {
            ok(w.no === i + 1, `${nama}: no minggu`);
            ok(w.sesi.length === hari, `${nama} m${w.no}: ${w.sesi.length} sesi`);
            ok(w.minit === w.sesi.reduce((a, s) => a + s.minit, 0), `${nama} m${w.no}: jumlah minit`);
            ok(w.sesi.every((s) => s.minit > 0 && !/NaN|undefined/.test(s.arahan + s.usaha)), `${nama} m${w.no}: sesi rosak`);
            if (i) ok(ORDER.indexOf(w.fasa) >= ORDER.indexOf(h.minggu[i - 1].fasa), `${nama}: susunan fasa`);
          });
          const km = h.minggu.flatMap((w) => w.sesi.filter((s) => s.jenis === "panjang").map((s) => Number(s.tajuk.match(/[\d.]+/)![0])));
          ok(Math.max(...km) <= c.puncakKm, `${nama}: panjang puncak ${Math.max(...km)}`);
          ok(km[0] > c.prasyarat.km, `${nama}: panjang mula ${km[0]} > prasyarat`);
          // Lonjakan dibanding minggu biasa sebelumnya (minggu ringan memang turun, kemudian kembali).
          const biasa = h.minggu.filter((w) => !w.ringan).map((w) => km[w.no - 1]);
          for (let i = 1; i < biasa.length; i++) ok(biasa[i] - biasa[i - 1] <= c.langkahKm, `${nama}: lonjakan ${biasa[i - 1]} -> ${biasa[i]}`);
          const akhir = h.minggu.at(-1)!;
          ok(akhir.fasa === "Ujian" && akhir.sesi.at(-1)!.jenis === "ujian", `${nama}: minggu lumba`);
          ok(h.minggu.filter((w) => w.fasa === "Tirus").length === c.tirus, `${nama}: tirus`);
          const laju = h.minggu.some((w) => w.sesi.some((s) => s.jenis === "interval"));
          ok(!!sasaran === laju, `${nama}: interval hanya bila ada sasaran`);
          ok(!!sasaran === !!analyzeDistancePlan({ jarak, minggu, hari, masa, sasaran }), `${nama}: analisis`);
        }
}

// Bertangga + had
ok(!buildDistancePlan({ jarak: "10k", minggu: 8, hari: 3, masa: 70 }).ok, "10K: 5K 70 min ditolak");
ok(!buildDistancePlan({ jarak: "21k", minggu: 12, hari: 3, masa: 20 }).ok, "21K: 10K 20 min ditolak");
ok(!buildDistancePlan({ jarak: "10k", minggu: 9, hari: 3, masa: 30 }).ok, "minggu tak sah");
ok(!buildDistancePlan({ jarak: "10k", minggu: 8, hari: 5, masa: 30 }).ok, "hari tak sah");
ok(analyzeDistancePlan({ jarak: "10k", minggu: 8, hari: 3, masa: 35, sasaran: 55 })?.penilaian === "tak-realistik", "10K 5K35 -> 55 dalam 8 mgg tak realistik");
ok(analyzeDistancePlan({ jarak: "10k", minggu: 12, hari: 4, masa: 30, sasaran: 62 })?.penilaian === "munasabah", "10K 5K30 -> 62 munasabah");
ok(analyzeDistancePlan({ jarak: "21k", minggu: 20, hari: 4, masa: 60, sasaran: 130 })?.penilaian === "munasabah", "21K 10K60 -> 2:10 munasabah");

if (gagal) throw new Error(`${gagal} semakan gagal`);
console.log(`ok - ${pelan} pelan disemak`);
