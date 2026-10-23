// bun scripts/check-deficit.ts - src/lib/deficit.ts. Nombor jangkaan dikira tangan (docs/plans/deficit-calculator.md).
import { calcDeficit, type DeficitInput } from "../src/lib/deficit";

let gagal = 0;
const ok = (c: unknown, msg: string) => {
  if (!c) {
    gagal++;
    console.error("GAGAL:", msg);
  }
};
const dekat = (a: number, b: number, tol = 0.01) => Math.abs(a - b) < tol;

const lelaki: DeficitInput = { umur: 30, jantina: "lelaki", tinggi: 170, berat: 70, gaya: "ringan", km: 20, kgSeminggu: 0.5 };
const a = calcDeficit(lelaki);
ok(a.ok && dekat(a.ree, 1617.5), "REE lelaki 30 th 70 kg 170 cm = 1617.5");
ok(a.ok && dekat(a.larian, 200) && dekat(a.keperluan, 2707.125), "20 km seminggu = 200 kcal sehari; keperluan 2707.1");
ok(a.ok && dekat(a.sasaran, 2157.125) && a.had === null && dekat(a.kgSebenar, 0.5), "defisit 550 -> sasaran 2157, kadar 0.5 kg");
const b = calcDeficit({ ...lelaki, jantina: "perempuan", km: 0, gaya: "duduk" });
ok(b.ok && dekat(b.ree, 1451.5), "REE perempuan sama = 1451.5");

const g = (id: string) => (a.ok ? a.makro.find((m) => m.id === id) : undefined);
const sama = (id: string, c: number, p: number, f: number) => {
  const m = g(id);
  ok(m && Math.round(m.karbo) === c && Math.round(m.protein) === p && Math.round(m.lemak) === f, `${id} = ${c}/${p}/${f} g`);
  ok(m && a.ok && dekat(4 * m.karbo + 4 * m.protein + 9 * m.lemak, a.sasaran, 1e-6), `${id}: jumlah = sasaran kcal`);
};
sama("seimbang", 297, 81, 72);
sama("pelari", 292, 112, 60);
sama("proteinTinggi", 237, 140, 72);
sama("rendahKarbo", 135, 135, 120);
ok(g("rendahKarbo")?.amaran && !g("pelari")?.amaran, "amaran pada rendah karbo sahaja");

// Lantai: perempuan 40 th 50 kg 155 cm, duduk, tiada larian. Keperluan 1550.85, had 25% -> 1163 < 1200.
const c = calcDeficit({ umur: 40, jantina: "perempuan", tinggi: 155, berat: 50, gaya: "duduk", km: 0, kgSeminggu: 0.5 });
ok(c.ok && c.sasaran === 1200 && c.had === "lantai" && dekat(c.kgSebenar, (350.85 * 7) / 7700), "lantai 1200, kadar sebenar ~0.32 kg");
// Had 25% tanpa lantai: 1 kg seminggu (1100 kcal) pada keperluan 2707 -> 676.8.
const d = calcDeficit({ ...lelaki, berat: 100, kgSeminggu: 1 });
ok(d.ok && d.had === "25%" && dekat(d.sasaran, d.keperluan * 0.75), "defisit dihad 25% keperluan");
// Keperluan bawah lantai: sasaran = lantai, kadar 0.
const e = calcDeficit({ umur: 78, jantina: "perempuan", tinggi: 130, berat: 35, gaya: "duduk", km: 0, kgSeminggu: 0.25 });
ok(e.ok && e.sasaran === 1200 && e.kgSebenar === 0 && e.had === "lantai", "keperluan bawah lantai = lantai, kadar 0");
ok(!e.ok || e.makro.every((m) => m.karbo >= 0 && m.lemak >= 0), "tiada gram negatif");

const tolak = (i: Partial<DeficitInput>, msg: string) => ok(!calcDeficit({ ...lelaki, ...i }).ok, msg);
const laju = calcDeficit({ ...lelaki, berat: 50, kgSeminggu: 0.75 });
ok(!laju.ok && laju.sebab.includes("0.5 kg"), "> 1% berat seminggu ditolak, cadang 0.5 kg untuk 50 kg");
tolak({ umur: 18 }, "umur 18 ditolak");
tolak({ umur: 79 }, "umur 79 ditolak");
tolak({ umur: 30.5 }, "umur bukan integer ditolak");
tolak({ jantina: "constructor" }, "jantina kunci prototaip ditolak");
tolak({ gaya: "__proto__" }, "gaya kunci prototaip ditolak");
tolak({ kgSeminggu: 2 }, "kadar luar senarai ditolak");
tolak({ berat: NaN }, "NaN ditolak");
tolak({ tinggi: 300 }, "tinggi luar julat ditolak");
tolak({ km: -1 }, "km negatif ditolak");

if (gagal) throw new Error(`${gagal} semakan gagal`);
console.log("ok - defisit");
