// bun scripts/check-pace.ts - src/lib/pace.ts (kalkulator pace + pelan seterusnya).
import { buatPelan, type Tahap } from "../src/lib/pelan-5k";
import { buatPelanJarak } from "../src/lib/pelan-jarak";
import { bacaMasa, kiraPace, pelanSeterusnya } from "../src/lib/pace";

let gagal = 0;
const ok = (c: unknown, msg: string) => {
  if (!c) {
    gagal++;
    console.error("GAGAL:", msg);
  }
};
const dekat = (a: number, b: number, t = 0.01) => Math.abs(a - b) < t;

ok(bacaMasa("28") === 28 && bacaMasa("28.5") === 28.5 && bacaMasa("28,5") === 28.5, "minit");
ok(bacaMasa("28:30") === 28.5 && dekat(bacaMasa("1:05:30")!, 65.5), "mm:ss / h:mm:ss");
ok(bacaMasa("28:61") === null && bacaMasa("1:61:00") === null && bacaMasa("abc") === null && bacaMasa("0") === null && bacaMasa("") === null, "tak sah");

const a = kiraPace(5, 30);
ok(a.ok && a.paceSaat === 360 && dekat(a.kmj, 10) && a.ramalan.length === 3, "5K 30 min = 6:00/km, 10 km/j, 3 ramalan");
ok(a.ok && dekat(a.ramalan[0].minit, 62.55, 0.1), "ramalan 10K dari 5K 30 = ~62.5 (Riegel)");
const b = kiraPace(10, undefined, 330);
ok(b.ok && dekat(b.minit, 55), "pace 5:30 x 10 km = 55 min");
ok(kiraPace(3, 20).ok && kiraPace(3, 20).ok && (kiraPace(3, 20) as { ramalan: unknown[] }).ramalan.length === 4, "jarak lain = 4 ramalan");
ok(!kiraPace(5, 5).ok && !kiraPace(5, 200).ok && !kiraPace(0.1, 1).ok && !kiraPace(5).ok, "luar julat ditolak");

// Setiap pautan pelan seterusnya mesti buka pelan yang sah (bukan ralat borang).
const semakPautan = (nama: string, href: string) => {
  const u = new URL(href, "https://x");
  const g = (k: string) => u.searchParams.get(k);
  if (u.pathname.endsWith("pelan-5k")) {
    const h = buatPelan({ bulan: Number(g("bulan")), tahap: g("tahap") as Tahap, hari: Number(g("hari")), masa5k: Number(g("masa")) });
    ok(h.ok, `${nama}: ${href} -> ${h.ok ? "" : h.sebab}`);
  } else {
    const h = buatPelanJarak({ jarak: g("jarak") as "10k" | "21k", minggu: Number(g("minggu")), hari: Number(g("hari")), masa: Number(g("masa")) });
    ok(h.ok, `${nama}: ${href} -> ${h.ok ? "" : h.sebab}`);
  }
};
let pautan = 0;
for (const hari of [3, 4]) {
  for (let m = 15; m <= 60; m += 0.5)
    for (const p of pelanSeterusnya("5k", m, hari, "/account/pelan-5k").pautan) (pautan++, semakPautan(`5k ${m}`, p.href));
  for (let m = 35; m <= 110; m += 1) for (const p of pelanSeterusnya("10k", m, hari).pautan) (pautan++, semakPautan(`10k ${m}`, p.href));
}
const s30 = pelanSeterusnya("5k", 29.9, 3);
ok(s30.pautan.length === 1 && s30.pautan[0].href.includes("jarak=10k") && s30.pautan[0].href.includes("masa=30"), "5K 29:54 -> 10K, masa bundar ke atas 30");
const s33 = pelanSeterusnya("5k", 32.2, 4, "/pelan-5k");
ok(s33.pautan[0].href.startsWith("/pelan-5k?") && s33.pautan[0].href.includes("masa=33") && s33.pautan[0].href.includes("hari=4"), "5K 32:12 -> 5K baru 33 min, hari kekal");
ok(pelanSeterusnya("5k", 70, 3).pautan.length === 0 && pelanSeterusnya("21k", 130, 3).pautan.length === 0, "luar julat / 21K = tiada pautan");

if (gagal) throw new Error(`${gagal} semakan gagal`);
console.log(`ok - pace + ${pautan} pautan pelan seterusnya disemak`);
