// bun scripts/check-plan-5k.ts - semak src/lib/plan-5k.ts untuk setiap gabungan input.
import {
  analyzePlan, PLAN_MONTHS, isoDate, resumePoint, GUEST_PLAN_LIMIT, DAYS_PER_WEEK, SESSION_DAYS, canBuildPlan, TIME_MAX, TIME_MIN, MIN_WEEKS, buildPlan, startMonday, formatPace, sessionDate, type Level
} from "../src/lib/plan-5k";

let gagal = 0;
const ok = (c: unknown, msg: string) => {
  if (!c) {
    gagal++;
    console.error("GAGAL:", msg);
  }
};

ok(formatPace(360) === "6:00" && formatPace(435) === "7:15", "pace()");

const kes: { tahap: Level; masa5k?: number }[] = [
  { tahap: "sifar" },
  { tahap: "jalan" },
  ...[31, 33, 36, 40, 45, 50, 60].map((masa5k) => ({ tahap: "5k" as const, masa5k })),
];

const ORDER = ["Asas", "Daya tahan", "Kelajuan", "Ujian"];
let pelan = 0;
for (const bulan of PLAN_MONTHS)
  for (const hari of DAYS_PER_WEEK)
    for (const k of kes) {
      const nama = `${bulan} bulan, ${hari} hari, ${k.tahap}${k.masa5k ? ` ${k.masa5k} min` : ""}`;
      const h = buildPlan({ bulan, hari, ...k });
      if (k.tahap !== "5k" && bulan * 4 < MIN_WEEKS[k.tahap]) {
        ok(!h.ok && h.cadanganBulan && h.cadanganBulan * 4 >= MIN_WEEKS[k.tahap], `${nama}: patut ditolak dengan cadangan`);
        continue;
      }
      if (!h.ok) {
        ok(false, `${nama}: ditolak - ${h.sebab}`);
        continue;
      }
      pelan++;
      const m = h.minggu;
      ok(m.length === bulan * 4, `${nama}: ${m.length} minggu`);
      ok(m.at(-1)!.fasa === "Ujian" && m.at(-1)!.sesi.at(-1)!.jenis === "ujian", `${nama}: minggu akhir = ujian`);
      ok(m.every((w, i) => w.no === i + 1), `${nama}: nombor minggu`);

      let bina = 0;
      for (const w of m) {
        ok(w.sesi.length === hari, `${nama} M${w.no}: ${w.sesi.length} sesi`);
        ok(w.sesi.reduce((a, s) => a + s.minit, 0) === w.minit, `${nama} M${w.no}: jumlah sesi = beban`);
        ok(w.sesi.every((s) => s.minit >= 15 && s.minit <= 75), `${nama} M${w.no}: sesi 15-75 min`);
        ok(w.sesi.filter((s) => s.jenis === "interval" || s.jenis === "tempo").length <= 1, `${nama} M${w.no}: paling banyak 1 sesi kualiti`);
        ok(w.sesi.every((s) => s.tajuk !== "Jalan-lari" || Number(/Jalan (\d+) min\.$/.exec(s.arahan)?.[1]) <= 6), `${nama} M${w.no}: sejuk badan jalan-lari > 6 min`);
        ok(w.sesi.every((s) => !/NaN|undefined|-\d+ min/.test(s.arahan + s.usaha)), `${nama} M${w.no}: teks rosak`);
        if (w.no % 4 === 0 && w.fasa !== "Ujian") ok(w.ringan, `${nama} M${w.no}: minggu ringan`);
        if (w.ringan) {
          ok(w.sesi.every((s) => s.jenis !== "interval" && s.jenis !== "tempo"), `${nama} M${w.no}: minggu ringan tanpa kualiti`);
          if (w.fasa !== "Ujian") ok(w.minit < bina, `${nama} M${w.no}: minggu ringan lebih rendah`);
        } else {
          if (bina) ok(w.minit <= bina * 1.1, `${nama} M${w.no}: lonjakan ${bina} -> ${w.minit} > 10%`);
          bina = w.minit;
        }
      }
      const fasa = m.map((w) => w.fasa);
      ok(fasa.join() === [...fasa].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)).join(), `${nama}: susunan fasa`);
      ok(k.tahap !== "5k" || !fasa.includes("Asas"), `${nama}: tahap 5k tanpa fasa Asas`);
      ok(fasa.includes("Kelajuan"), `${nama}: ada fasa Kelajuan`);
    }
// Ditolak / amaran
ok(!buildPlan({ bulan: 3, hari: 3, tahap: "5k", masa5k: 30 }).ok, "masa 30 = dah capai");
ok(!buildPlan({ bulan: 3, hari: 3, tahap: "5k" }).ok, "tahap 5k tanpa masa");
ok(!buildPlan({ bulan: 3, hari: 3, tahap: "5k", masa5k: TIME_MIN - 1 }).ok, "masa terlalu rendah");
ok(!buildPlan({ bulan: 3, hari: 3, tahap: "5k", masa5k: TIME_MAX + 1 }).ok, "masa terlalu tinggi");
ok(!buildPlan({ bulan: 5, hari: 3, tahap: "jalan" }).ok, "bulan bukan pilihan");
ok(!buildPlan({ bulan: 3, hari: 5, tahap: "jalan" }).ok, "hari bukan pilihan");
const sukar = buildPlan({ bulan: 2, hari: 3, tahap: "5k", masa5k: 45 });
ok(sukar.ok && sukar.amaran.length === 1, "45 min dalam 2 bulan = amaran");
const mudah = buildPlan({ bulan: 3, hari: 3, tahap: "5k", masa5k: 33 });
ok(mudah.ok && mudah.amaran.length === 0, "33 min dalam 3 bulan tanpa amaran");

// Ikut nadi (MAF): sesi mudah/panjang/jalan-lari bawa julat nadi; interval/tempo diberi nota.
for (const tahap of ["sifar", "jalan"] as const) {
  const tanpa = buildPlan({ bulan: 4, hari: 3, tahap });
  const dengan = buildPlan({ bulan: 4, hari: 3, tahap, nadi: { maf: 143, bawah: 133 } });
  if (!tanpa.ok || !dengan.ok) { ok(false, `nadi ${tahap}: pelan ditolak`); continue; }
  const sesi = (h: typeof dengan) => h.minggu.flatMap((w) => w.sesi);
  ok(sesi(tanpa).every((s) => !s.usaha.includes("Nadi")), `nadi ${tahap}: tanpa pilihan, tiada teks nadi`);
  ok(sesi(dengan).filter((s) => ["mudah", "panjang", "jalan-lari"].includes(s.jenis)).every((s) => s.usaha.includes("133-143")), `nadi ${tahap}: sesi mudah bawa julat`);
  const laju = sesi(dengan).filter((s) => s.jenis === "interval" || s.jenis === "tempo");
  ok(laju.length > 0 && laju.every((s) => s.usaha.includes("melebihi 143")), `nadi ${tahap}: interval/tempo bernota`);
  ok(JSON.stringify(dengan.minggu.map((w) => w.sesi.map((s) => s.minit))) === JSON.stringify(tanpa.minggu.map((w) => w.sesi.map((s) => s.minit))), `nadi ${tahap}: minit sesi sama`);
}

// Analisis "realistik ke?"
{
  const nilai = (i: Parameters<typeof analyzePlan>[0]) => analyzePlan(i)?.penilaian;
  ok(nilai({ bulan: 4, hari: 3, tahap: "sifar" }) === "munasabah", "analisis: sifar 4 bulan munasabah");
  ok(nilai({ bulan: 2, hari: 3, tahap: "sifar" }) === "tak-realistik", "analisis: sifar 2 bulan tak realistik");
  ok(nilai({ bulan: 3, hari: 3, tahap: "5k", masa5k: 36 }) === "munasabah", "analisis: 36 min 3 bulan munasabah");
  ok(nilai({ bulan: 2, hari: 3, tahap: "5k", masa5k: 36 }) === "mencabar", "analisis: 36 min 2 bulan mencabar");
  ok(nilai({ bulan: 2, hari: 4, tahap: "5k", masa5k: 45 }) === "tak-realistik", "analisis: 45 min 2 bulan tak realistik");
  ok(nilai({ bulan: 6, hari: 3, tahap: "jalan", masa5k: 55 }) === "tak-realistik", "analisis: jalan 50 min ikut masa");
  ok(analyzePlan({ bulan: 6, hari: 3, tahap: "5k", masa5k: 55 })!.ringkas.includes("bawah 40 minit dulu"), "analisis: sasaran perantaraan");
  ok(analyzePlan({ bulan: 3, hari: 3, tahap: "5k" }) === null, "analisis: 5k tanpa masa = null");
  // Pace interval/tempo peribadi turun setiap sesi laju.
  const h = buildPlan({ bulan: 4, hari: 3, tahap: "5k", masa5k: 40 });
  const paces = h.ok ? h.minggu.flatMap((w) => w.sesi).filter((s) => s.jenis === "tempo").map((s) => s.usaha.match(/~(\d+):(\d+)/)!).map((m) => +m[1] * 60 + +m[2]) : [];
  ok(paces.length > 1 && paces.every((p, i) => i === 0 || p < paces[i - 1]), "pace tempo turun setiap sesi");
  // Sesi mudah dalam seminggu tidak sama panjang.
  const d = buildPlan({ bulan: 3, hari: 4, tahap: "5k", masa5k: 34 });
  ok(d.ok && new Set(d.minggu[0].sesi.filter((s) => s.jenis === "mudah").map((s) => s.minit)).size > 1, "sesi mudah berbeza panjang");
}

// Hari sesi: mula Isnin, sesi akhir hujung minggu, tiada sesi berturut-turut.
ok([0, 1, 2, 3, 4, 5, 6].every((i) => {
  const d = startMonday(new Date(2026, 9, 11 + i)); // Ahad 11 Okt ... Sabtu 17 Okt
  return d.getDay() === 1 && d >= new Date(2026, 9, 11 + i) && d.getTime() - new Date(2026, 9, 11 + i).getTime() < 7 * 864e5;
}), "startMonday");
for (const hari of DAYS_PER_WEEK) {
  const h = SESSION_DAYS[hari];
  ok(h.length === hari && h.at(-1)! >= 5 && h.every((x, i) => i === 0 || x - h[i - 1] >= 2), `SESSION_DAYS[${hari}]`);
}
const t = sessionDate(new Date(2026, 9, 19), 2, 4, 3); // Isnin 19 Okt, minggu 2, sesi akhir
ok(t.getFullYear() === 2026 && t.getMonth() === 10 && t.getDate() === 1 && t.getDay() === 0, "sessionDate = Ahad 1 Nov");

// Had tanpa akaun: kunci berbeza dikira, buka semula pelan lama sentiasa boleh, log masuk = tiada had.
const tiga = ["a", "b", "c"];
ok(GUEST_PLAN_LIMIT === 3, "GUEST_PLAN_LIMIT = 3");
ok(canBuildPlan("a", [], false) && canBuildPlan("c", ["a", "b"], false), "bawah had = boleh");
ok(!canBuildPlan("d", tiga, false), "pelan ke-4 tanpa akaun = tidak");
ok(canBuildPlan("b", tiga, false), "buka semula pelan lama = boleh");
ok(canBuildPlan("d", tiga, true), "log masuk = tiada had");
ok(canBuildPlan("c", ["a", "a", "b"], false), "kunci berulang dikira sekali");

// Terlepas sesi: pelan 3 hari (Isnin/Rabu/Sabtu) mula Isnin 5 Okt 2026.
{
  const h = buildPlan({ bulan: 3, tahap: "sifar", hari: 3 });
  if (h.ok) {
    const isnin = new Date(2026, 9, 5);
    const m1 = new Set(["1.0", "1.1", "1.2"]);
    const rabu3 = new Date(2026, 9, 21, 9); // Rabu minggu 3
    // Minggu 1 siap, minggu 2 terlepas -> minggu 2 mula Isnin depan 26 Okt (mula 19 Okt, anjak 2).
    const r = resumePoint(h.minggu, isnin, m1, rabu3);
    ok(r?.no === 2 && isoDate(r.mula) === "2026-10-19" && isoDate(r.isninMinggu) === "2026-10-26" && r.anjak === 2, `terlepas minggu 2: ${JSON.stringify(r)}`);
    // Hari ini Isnin -> minggu itu mula hari ini.
    const r2 = resumePoint(h.minggu, isnin, m1, new Date(2026, 9, 19, 7));
    ok(r2?.no === 2 && isoDate(r2.isninMinggu) === "2026-10-19" && r2.anjak === 1, `Isnin: ${JSON.stringify(r2)}`);
    // Hanya sesi minggu ini terlepas -> tiada anjak.
    ok(resumePoint(h.minggu, isnin, new Set([...m1, "2.0", "2.1", "2.2"]), rabu3) === null, "terlepas minggu ini sahaja = tiada");
    // Lubang lama tapi sesi lebih baru ditanda -> abaikan.
    ok(resumePoint(h.minggu, isnin, new Set(["1.0", "2.2"]), rabu3) === null, "lubang lama diabaikan");
    // Belum tanda apa-apa, minggu 3 -> sambung dari minggu 1.
    const r3 = resumePoint(h.minggu, isnin, new Set(), rabu3);
    ok(r3?.no === 1 && isoDate(r3.mula) === "2026-10-26", `belum mula: ${JSON.stringify(r3)}`);
    // Selepas anjak, tiada notis lagi (tiada gelung).
    ok(r && resumePoint(h.minggu, r.mula, m1, rabu3) === null, "selepas anjak = tiada");
    ok(resumePoint(h.minggu, isnin, new Set(), new Date(2026, 9, 7, 18)) === null, "minggu pertama = tiada");
  }
}

if (gagal) throw new Error(`${gagal} semakan gagal`);
console.log(`ok - ${pelan} pelan disemak`);
