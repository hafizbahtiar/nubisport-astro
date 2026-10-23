// bun scripts/check-distance-plan.ts - semak src/lib/distance-plan.ts untuk setiap gabungan input.
import { planDistancePaces, analyzeDistancePlan, buildDistancePlan, formatTime, DISTANCES, riegel, type Distance } from "../src/lib/distance-plan";

let gagal = 0;
// FNV-1a 32-bit - cincangan output pelan lama (tiada jenis Bun/Node dalam program tsc).
const fnv = (t: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16);
};
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
  const masaSet = jarak === "10k" ? [22, 28, 35, 45, 60] : jarak === "21k" ? [45, 55, 65, 80, 110] : [85, 110, 140, 170, 210];
  // Pilihan tempoh lama + setiap minggu dalam julat (tarikh lumba).
  for (let minggu = c.minggu[0]; minggu <= c.minggu.at(-1)!; minggu++)
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
          // 42K mula 16 km (bukan > 21K) dengan sengaja - lihat DISTANCES["42k"].mulaKm.
          ok(jarak === "42k" ? km[0] === c.mulaKm : km[0] > c.prasyarat.km, `${nama}: panjang mula ${km[0]}`);
          ok(Math.max(...km) === c.puncakKm, `${nama}: puncak ${Math.max(...km)} tak sampai ${c.puncakKm}`);
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
ok(!buildDistancePlan({ jarak: "10k", minggu: 7, hari: 3, masa: 30 }).ok && !buildDistancePlan({ jarak: "10k", minggu: 17, hari: 3, masa: 30 }).ok, "10K minggu luar julat");
ok(!buildDistancePlan({ jarak: "21k", minggu: 11, hari: 3, masa: 60 }).ok && !buildDistancePlan({ jarak: "21k", minggu: 25, hari: 3, masa: 60 }).ok, "21K minggu luar julat");
ok(DISTANCES["10k"].mingguLalai === 10 && DISTANCES["21k"].mingguLalai === 16, "tempoh lalai 10K/21K");
ok(DISTANCES["42k"].mingguLalai === 18 && DISTANCES["42k"].minggu.includes(18), "tempoh lalai 42K");
ok(!buildDistancePlan({ jarak: "42k", minggu: 18, hari: 3, masa: 60 }).ok, "42K: 21K 60 min ditolak");
ok(!buildDistancePlan({ jarak: "42k", minggu: 15, hari: 3, masa: 130 }).ok, "42K minggu luar julat");
ok(analyzeDistancePlan({ jarak: "42k", minggu: 18, hari: 4, masa: 130, sasaran: 275 })?.penilaian === "munasabah", "42K 21K 2:10 -> 4:35 munasabah");
ok(DISTANCES["10k"].minggu.includes(10) && DISTANCES["21k"].minggu.includes(16), "lalai dalam pilihan");
ok(!buildDistancePlan({ jarak: "10k", minggu: 9.5, hari: 3, masa: 30 }).ok, "minggu bukan integer");
ok(!buildDistancePlan({ jarak: "10k", minggu: 8, hari: 5, masa: 30 }).ok, "hari tak sah");
ok(analyzeDistancePlan({ jarak: "10k", minggu: 8, hari: 3, masa: 35, sasaran: 55 })?.penilaian === "tak-realistik", "10K 5K35 -> 55 dalam 8 mgg tak realistik");
ok(analyzeDistancePlan({ jarak: "10k", minggu: 12, hari: 4, masa: 30, sasaran: 62 })?.penilaian === "munasabah", "10K 5K30 -> 62 munasabah");
ok(analyzeDistancePlan({ jarak: "21k", minggu: 20, hari: 4, masa: 60, sasaran: 130 })?.penilaian === "munasabah", "21K 10K60 -> 2:10 munasabah");

// Pelan lama (pilihan minggu, tanpa pace) mesti terbina sama seperti sebelum v2 (cincangan output 2026-10-22).
{
  const out: unknown[] = [];
  // Senarai asal sebelum pilihan minggu dipanjangkan (2026-10-22) - output enjin untuk pelan
  // lama mesti kekal. Pilihan baharu (14/16, 24) disemak oleh gelung julat di atas.
  const LAMA: Record<"10k" | "21k", number[]> = { "10k": [8, 10, 12], "21k": [12, 16, 20] };
  for (const jarak of ["10k", "21k"] as const)
    for (const minggu of LAMA[jarak])
      for (const hari of [3, 4])
        for (const masa of jarak === "10k" ? [22, 30, 45, 60] : [45, 65, 110])
          for (const sasaran of [undefined, jarak === "10k" ? 60 : 130])
            for (const nadi of [undefined, { maf: 143, bawah: 133 }]) {
              const i = { jarak, minggu, hari, masa, sasaran, nadi };
              out.push(buildDistancePlan(i), analyzeDistancePlan(i));
            }
  const cincang = fnv(JSON.stringify(out));
  ok(cincang === "295a53a5", `pelan lama berubah (${cincang})`);
}

// Pace sasaran sendiri (s/km) = masa sasaran yang sama; pace lain ikut.
{
  const s60 = buildDistancePlan({ jarak: "10k", minggu: 10, hari: 3, masa: 30, sasaran: 60 });
  const p360 = buildDistancePlan({ jarak: "10k", minggu: 10, hari: 3, masa: 30, pace: 360 });
  ok(JSON.stringify(s60) === JSON.stringify(p360), "pace 6:00 = sasaran 60 min");
  const p390 = buildDistancePlan({ jarak: "10k", minggu: 10, hari: 3, masa: 30, pace: 390 });
  ok(p390.ok && p390.minggu.at(-1)!.sesi.at(-1)!.usaha.includes("6:30/km"), "lumba ikut pace 6:30");
  ok(!buildDistancePlan({ jarak: "10k", minggu: 10, hari: 3, masa: 30, pace: 100 }).ok, "pace luar julat ditolak");
  ok(!buildDistancePlan({ jarak: "10k", minggu: 10, hari: 3, masa: 30, pace: 360.5 }).ok, "pace bukan integer ditolak");
  ok(analyzeDistancePlan({ jarak: "21k", minggu: 16, hari: 3, masa: 60, pace: 370 }) !== null, "analisis ikut pace");
  const pp = planDistancePaces({ jarak: "10k", minggu: 10, hari: 3, masa: 30, pace: 360 });
  // 5K 30 min -> setara 5K 6:00/km: mudah 7:15-7:45; ramalan 10K ~62:33 = 375 s/km.
  ok(pp.mudah[0] === 435 && pp.mudah[1] === 465 && pp.lumba === 360 && pp.tempo![1] === 365 && pp.interval![1] === 340, `planDistancePaces: ${JSON.stringify(pp)}`);
  const habis = planDistancePaces({ jarak: "10k", minggu: 10, hari: 3, masa: 30 });
  ok(!habis.tempo && !habis.interval && Math.round(habis.lumba) === 375, `planDistancePaces habis: ${JSON.stringify(habis)}`);
}

// `jarak=__proto__` dari URL ditolak, bukan TypeError.
ok(!buildDistancePlan({ jarak: "__proto__" as Distance, minggu: 10, hari: 3, masa: 30 }).ok, "jarak __proto__ ditolak");
ok(analyzeDistancePlan({ jarak: "constructor" as Distance, minggu: 10, hari: 3, masa: 30, pace: 360 }) === null, "jarak constructor = null");

if (gagal) throw new Error(`${gagal} semakan gagal`);
console.log(`ok - ${pelan} pelan disemak`);
