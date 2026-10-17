// bun scripts/check-pelan-5k.ts - semak src/lib/pelan-5k.ts untuk setiap gabungan input.
import { BULAN, HARI, MASA_MAX, MASA_MIN, MINGGU_MIN, buatPelan, pace, type Tahap } from "../src/lib/pelan-5k";

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

if (gagal) throw new Error(`${gagal} semakan gagal`);
console.log(`ok - ${pelan} pelan disemak`);
