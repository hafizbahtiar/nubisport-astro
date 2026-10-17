// bun scripts/check-pelan-5k.ts - semak src/lib/pelan-5k.ts untuk setiap gabungan input.
import {
  analisis, BULAN, HAD_TANPA_AKAUN, HARI, HARI_SESI, bolehBuatPelan, MASA_MAX, MASA_MIN, MINGGU_MIN, buatPelan, isninMula, pace, tarikhSesi, type Tahap
} from "../src/lib/pelan-5k";

let gagal = 0;
const ok = (c: unknown, msg: string) => {
  if (!c) {
    gagal++;
    console.error("GAGAL:", msg);
  }
};

ok(pace(360) === "6:00" && pace(435) === "7:15", "pace()");

const kes: { tahap: Tahap; masa5k?: number }[] = [
  { tahap: "sifar" },
  { tahap: "jalan" },
  ...[31, 33, 36, 40, 45, 50, 60].map((masa5k) => ({ tahap: "5k" as const, masa5k })),
];

const ORDER = ["Asas", "Daya tahan", "Kelajuan", "Ujian"];
let pelan = 0;
for (const bulan of BULAN)
  for (const hari of HARI)
    for (const k of kes) {
      const nama = `${bulan} bulan, ${hari} hari, ${k.tahap}${k.masa5k ? ` ${k.masa5k} min` : ""}`;
      const h = buatPelan({ bulan, hari, ...k });
      if (k.tahap !== "5k" && bulan * 4 < MINGGU_MIN[k.tahap]) {
        ok(!h.ok && h.cadanganBulan && h.cadanganBulan * 4 >= MINGGU_MIN[k.tahap], `${nama}: patut ditolak dengan cadangan`);
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
ok(!buatPelan({ bulan: 3, hari: 3, tahap: "5k", masa5k: 30 }).ok, "masa 30 = dah capai");
ok(!buatPelan({ bulan: 3, hari: 3, tahap: "5k" }).ok, "tahap 5k tanpa masa");
ok(!buatPelan({ bulan: 3, hari: 3, tahap: "5k", masa5k: MASA_MIN - 1 }).ok, "masa terlalu rendah");
ok(!buatPelan({ bulan: 3, hari: 3, tahap: "5k", masa5k: MASA_MAX + 1 }).ok, "masa terlalu tinggi");
ok(!buatPelan({ bulan: 5, hari: 3, tahap: "jalan" }).ok, "bulan bukan pilihan");
ok(!buatPelan({ bulan: 3, hari: 5, tahap: "jalan" }).ok, "hari bukan pilihan");
const sukar = buatPelan({ bulan: 2, hari: 3, tahap: "5k", masa5k: 45 });
ok(sukar.ok && sukar.amaran.length === 1, "45 min dalam 2 bulan = amaran");
const mudah = buatPelan({ bulan: 3, hari: 3, tahap: "5k", masa5k: 33 });
ok(mudah.ok && mudah.amaran.length === 0, "33 min dalam 3 bulan tanpa amaran");

// Ikut nadi (MAF): sesi mudah/panjang/jalan-lari bawa julat nadi; interval/tempo diberi nota.
for (const tahap of ["sifar", "jalan"] as const) {
  const tanpa = buatPelan({ bulan: 4, hari: 3, tahap });
  const dengan = buatPelan({ bulan: 4, hari: 3, tahap, nadi: { maf: 143, bawah: 133 } });
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
  const nilai = (i: Parameters<typeof analisis>[0]) => analisis(i)?.penilaian;
  ok(nilai({ bulan: 4, hari: 3, tahap: "sifar" }) === "munasabah", "analisis: sifar 4 bulan munasabah");
  ok(nilai({ bulan: 2, hari: 3, tahap: "sifar" }) === "tak-realistik", "analisis: sifar 2 bulan tak realistik");
  ok(nilai({ bulan: 3, hari: 3, tahap: "5k", masa5k: 36 }) === "munasabah", "analisis: 36 min 3 bulan munasabah");
  ok(nilai({ bulan: 2, hari: 3, tahap: "5k", masa5k: 36 }) === "mencabar", "analisis: 36 min 2 bulan mencabar");
  ok(nilai({ bulan: 2, hari: 4, tahap: "5k", masa5k: 45 }) === "tak-realistik", "analisis: 45 min 2 bulan tak realistik");
  ok(nilai({ bulan: 6, hari: 3, tahap: "jalan", masa5k: 55 }) === "tak-realistik", "analisis: jalan 50 min ikut masa");
  ok(analisis({ bulan: 6, hari: 3, tahap: "5k", masa5k: 55 })!.ringkas.includes("bawah 40 minit dulu"), "analisis: sasaran perantaraan");
  ok(analisis({ bulan: 3, hari: 3, tahap: "5k" }) === null, "analisis: 5k tanpa masa = null");
  // Pace interval/tempo peribadi turun setiap sesi laju.
  const h = buatPelan({ bulan: 4, hari: 3, tahap: "5k", masa5k: 40 });
  const paces = h.ok ? h.minggu.flatMap((w) => w.sesi).filter((s) => s.jenis === "tempo").map((s) => s.usaha.match(/~(\d+):(\d+)/)!).map((m) => +m[1] * 60 + +m[2]) : [];
  ok(paces.length > 1 && paces.every((p, i) => i === 0 || p < paces[i - 1]), "pace tempo turun setiap sesi");
  // Sesi mudah dalam seminggu tidak sama panjang.
  const d = buatPelan({ bulan: 3, hari: 4, tahap: "5k", masa5k: 34 });
  ok(d.ok && new Set(d.minggu[0].sesi.filter((s) => s.jenis === "mudah").map((s) => s.minit)).size > 1, "sesi mudah berbeza panjang");
}

// Hari sesi: mula Isnin, sesi akhir hujung minggu, tiada sesi berturut-turut.
ok([0, 1, 2, 3, 4, 5, 6].every((i) => {
  const d = isninMula(new Date(2026, 9, 11 + i)); // Ahad 11 Okt ... Sabtu 17 Okt
  return d.getDay() === 1 && d >= new Date(2026, 9, 11 + i) && d.getTime() - new Date(2026, 9, 11 + i).getTime() < 7 * 864e5;
}), "isninMula");
for (const hari of HARI) {
  const h = HARI_SESI[hari];
  ok(h.length === hari && h.at(-1)! >= 5 && h.every((x, i) => i === 0 || x - h[i - 1] >= 2), `HARI_SESI[${hari}]`);
}
const t = tarikhSesi(new Date(2026, 9, 19), 2, 4, 3); // Isnin 19 Okt, minggu 2, sesi akhir
ok(t.getFullYear() === 2026 && t.getMonth() === 10 && t.getDate() === 1 && t.getDay() === 0, "tarikhSesi = Ahad 1 Nov");

// Had tanpa akaun: kunci berbeza dikira, buka semula pelan lama sentiasa boleh, log masuk = tiada had.
const tiga = ["a", "b", "c"];
ok(HAD_TANPA_AKAUN === 3, "HAD_TANPA_AKAUN = 3");
ok(bolehBuatPelan("a", [], false) && bolehBuatPelan("c", ["a", "b"], false), "bawah had = boleh");
ok(!bolehBuatPelan("d", tiga, false), "pelan ke-4 tanpa akaun = tidak");
ok(bolehBuatPelan("b", tiga, false), "buka semula pelan lama = boleh");
ok(bolehBuatPelan("d", tiga, true), "log masuk = tiada had");
ok(bolehBuatPelan("c", ["a", "a", "b"], false), "kunci berulang dikira sekali");

if (gagal) throw new Error(`${gagal} semakan gagal`);
console.log(`ok - ${pelan} pelan disemak`);
