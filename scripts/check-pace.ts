// bun scripts/check-pace.ts - src/lib/pace.ts (kalkulator pace + pelan seterusnya).
import { buildPlan, type Level } from "../src/lib/plan-5k";
import { buildDistancePlan, type Distance } from "../src/lib/distance-plan";
import { parseTime, calcPace, nextPlan } from "../src/lib/pace";

let gagal = 0;
const ok = (c: unknown, msg: string) => {
  if (!c) {
    gagal++;
    console.error("GAGAL:", msg);
  }
};
const dekat = (a: number, b: number, t = 0.01) => Math.abs(a - b) < t;

ok(parseTime("28") === 28 && parseTime("28.5") === 28.5 && parseTime("28,5") === 28.5, "minit");
ok(parseTime("28:30") === 28.5 && dekat(parseTime("1:05:30")!, 65.5), "mm:ss / h:mm:ss");
ok(parseTime("28:61") === null && parseTime("1:61:00") === null && parseTime("abc") === null && parseTime("0") === null && parseTime("") === null, "tak sah");

const a = calcPace(5, 30);
ok(a.ok && a.paceSaat === 360 && dekat(a.kmj, 10) && a.ramalan.length === 3, "5K 30 min = 6:00/km, 10 km/j, 3 ramalan");
ok(a.ok && dekat(a.ramalan[0].minit, 62.55, 0.1), "ramalan 10K dari 5K 30 = ~62.5 (Riegel)");
const b = calcPace(10, undefined, 330);
ok(b.ok && dekat(b.minit, 55), "pace 5:30 x 10 km = 55 min");
ok(calcPace(3, 20).ok && calcPace(3, 20).ok && (calcPace(3, 20) as { ramalan: unknown[] }).ramalan.length === 4, "jarak lain = 4 ramalan");
ok(!calcPace(5, 5).ok && !calcPace(5, 200).ok && !calcPace(0.1, 1).ok && !calcPace(5).ok, "luar julat ditolak");

// Setiap pautan pelan seterusnya mesti buka pelan yang sah (bukan ralat borang).
const semakPautan = (nama: string, href: string) => {
  const u = new URL(href, "https://x");
  const g = (k: string) => u.searchParams.get(k);
  if (u.pathname.endsWith("plan-5k")) {
    const h = buildPlan({ bulan: Number(g("bulan")), tahap: g("tahap") as Level, hari: Number(g("hari")), masa5k: Number(g("masa")) });
    ok(h.ok, `${nama}: ${href} -> ${h.ok ? "" : h.sebab}`);
  } else {
    const h = buildDistancePlan({ jarak: g("jarak") as Distance, minggu: Number(g("minggu")), hari: Number(g("hari")), masa: Number(g("masa")) });
    ok(h.ok, `${nama}: ${href} -> ${h.ok ? "" : h.sebab}`);
  }
};
let pautan = 0;
for (const hari of [3, 4]) {
  for (let m = 15; m <= 60; m += 0.5)
    for (const p of nextPlan("5k", m, hari, "/account/plan-5k").pautan) (pautan++, semakPautan(`5k ${m}`, p.href));
  for (let m = 35; m <= 110; m += 1) for (const p of nextPlan("10k", m, hari).pautan) (pautan++, semakPautan(`10k ${m}`, p.href));
  for (let m = 75; m <= 240; m += 1) for (const p of nextPlan("21k", m, hari).pautan) (pautan++, semakPautan(`21k ${m}`, p.href));
}
const s30 = nextPlan("5k", 29.9, 3);
ok(s30.pautan.length === 1 && s30.pautan[0].href.includes("jarak=10k") && s30.pautan[0].href.includes("masa=30"), "5K 29:54 -> 10K, masa bundar ke atas 30");
const s33 = nextPlan("5k", 32.2, 4, "/plan-5k");
ok(s33.pautan[0].href.startsWith("/plan-5k?") && s33.pautan[0].href.includes("masa=33") && s33.pautan[0].href.includes("hari=4"), "5K 32:12 -> 5K baru 33 min, hari kekal");
ok(nextPlan("5k", 70, 3).pautan.length === 0 && nextPlan("21k", 60, 3).pautan.length === 0 && nextPlan("42k", 300, 3).pautan.length === 0, "luar julat / 42K = tiada pautan");
const s21 = nextPlan("21k", 129.5, 3);
ok(s21.pautan.length === 1 && s21.pautan[0].href.startsWith("/account/plan-42k?") && s21.pautan[0].href.includes("masa=130"), "21K 2:09:30 -> pelan 42K, masa 130");

if (gagal) throw new Error(`${gagal} semakan gagal`);
console.log(`ok - pace + ${pautan} pautan pelan seterusnya disemak`);
