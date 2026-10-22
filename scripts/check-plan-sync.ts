// bun scripts/check-plan-sync.ts - semak padankan() dalam src/lib/plan-sync.ts (docs/plans/active-plan-sync.md).
import { matchActivities, planSessions, walkedNote } from "../src/lib/plan-sync";

let gagal = 0;
const ok = (c: unknown, msg: string) => {
  if (!c) {
    gagal++;
    console.error("GAGAL:", msg);
  }
};

// Pelan 5K jalan, 3 hari: sesi Isnin/Rabu/Sabtu dari Isnin 2 Nov 2026 (minggu 1 = jalan-lari).
const sesi = planSessions("pelan-5k:3-jalan--3", { bulan: "3", tahap: "jalan", hari: "3", mula: "2026-11-02" })!;
ok(sesi && sesi[0].id === "1.0" && sesi[0].tarikh === "2026-11-02" && sesi[1].tarikh === "2026-11-04", "tarikh sesi");
ok(sesi[0].jenis === "jalan-lari", "minggu 1 jalan-lari");
const cukup = sesi[0].minit * 60;
// 06:30 waktu Malaysia Isnin = 22:30 UTC Ahad.
const a = (startedAt: string, sport = "run", movingS = cukup, distanceM = 3000, runRatio: number | null = null) =>
  ({ startedAt, sport, distanceM, movingS, runRatio });
const id = (m: { padan: Map<unknown, { id: string }> }, x: unknown) => m.padan.get(x)?.id;

{
  const x = a("2026-11-01T22:30:00Z");
  ok(id(matchActivities(sesi, [x], []), x) === "1.0", "hari sama (zon masa Malaysia)");
}
{
  const x = a("2026-11-03T10:00:00Z"); // Selasa: tiada sesi -> 1.0 (Isnin) dan 1.1 (Rabu) sama jauh, sesi awal
  ok(id(matchActivities(sesi, [x], []), x) === "1.0", "sama jauh pilih sesi lebih awal");
  ok(id(matchActivities(sesi, [x], ["1.0"]), x) === "1.1", "dirancang esok, buat hari ini - padan");
  ok(id(matchActivities(sesi, [x], ["1.0", "1.1"]), x) === "1.2", "mana-mana sesi minggu sama");
  ok(matchActivities(sesi, [x], ["1.0", "1.1", "1.2"]).padan.size === 0, "semua sesi minggu sudah siap");
}
{
  const jumaat = a("2026-11-06T00:00:00Z"); // Sabtu (esok) lebih dekat dari Rabu
  ok(id(matchActivities(sesi, [jumaat], []), jumaat) === "1.2", "tarikh paling hampir");
  const ahad = a("2026-11-08T00:00:00Z");
  ok(id(matchActivities(sesi, [ahad], ["1.1", "1.2"]), ahad) === "1.0", "dirancang Isnin, buat Ahad minggu sama - padan");
  const isninDepan = a("2026-11-08T22:30:00Z"); // Isnin 9 Nov waktu Malaysia = minggu 2
  ok(matchActivities(sesi, [isninDepan], ["2.0", "2.1", "2.2"]).padan.size === 0, "tak lintas minggu pelan");
}
{
  const x = a("2026-11-02T00:00:00Z", "ride");
  const w = a("2026-11-02T00:00:00Z", "walk");
  ok(matchActivities(sesi, [x], []).padan.size === 0, "ride tidak padan");
  ok(id(matchActivities(sesi, [w], []), w) === "1.0", "walk padan jalan-lari");
}
{
  const x = a("2026-11-02T00:00:00Z", "run", cukup * 0.59);
  ok(matchActivities(sesi, [x], []).padan.size === 0, "terlalu pendek (< 60%)");
  const y = a("2026-11-02T00:00:00Z", "run", cukup * 0.6);
  ok(matchActivities(sesi, [y], []).padan.size === 1, "tepat 60% padan");
}
{
  const pendek = a("2026-11-02T00:00:00Z", "run", cukup);
  const lama = a("2026-11-02T10:00:00Z", "run", cukup + 600);
  const m = matchActivities(sesi, [pendek, lama], []);
  ok(id(m, lama) === "1.0" && id(m, pendek) === "1.1", "dua aktiviti sehari: paling lama dapat hari sama, lain ke sesi terdekat");
}
{
  const isnin = a("2026-11-02T00:00:00Z");
  const selasa = a("2026-11-03T00:00:00Z", "run", cukup * 3); // lebih lama, tapi hari sama didahulukan
  const m = matchActivities(sesi, [selasa, isnin], []);
  ok(id(m, isnin) === "1.0" && id(m, selasa) === "1.1", "hari sama didahulukan sebelum hari lain");
}
// Nisbah lari (runRatio): jalan-lari perlu >= 15% lari.
{
  const w1 = a("2026-11-02T00:00:00Z", "walk", cukup, 3000, 0.1);
  const m = matchActivities(sesi, [w1], []);
  ok(m.padan.size === 0 && m.tolak.get(w1)?.id === "1.0", "jalan-lari: 10% lari ditolak dengan sebab");
  const w2 = a("2026-11-02T00:00:00Z", "walk", cukup, 3000, 0.2);
  ok(id(matchActivities(sesi, [w2], []), w2) === "1.0", "jalan-lari: 20% lari padan");
}
ok(planSessions("pelan-5k:3-jalan--3", { bulan: "3", tahap: "jalan", hari: "3" }) === null, "pelan tanpa tarikh = null");
ok(planSessions("pelan-5k:2-sifar--3", { bulan: "2", tahap: "sifar", hari: "3", mula: "2026-11-02" }) === null, "pelan tidak sah = null");

// Pelan 10K: sesi biasa run sahaja; hari lumba ikut jarak (>= 95%).
const j = planSessions("pelan-10k:12-35--3", { jarak: "10k", minggu: "12", hari: "3", masa: "35", mula: "2026-11-02" })!;
ok(j && j.length > 0, "pelan 10K dibina");
{
  const w = a("2026-11-02T00:00:00Z", "walk", j[0].minit * 60);
  ok(j[0].jenis !== "jalan-lari" && matchActivities(j, [w], []).padan.size === 0, "walk tidak padan sesi lari");
  // Sesi lari perlu >= 70% lari; null = tiada kadens, padan.
  const r = (n: number | null) => a("2026-11-02T00:00:00Z", "run", j[0].minit * 60, 3000, n);
  const jalan = r(0.35);
  const m = matchActivities(j, [jalan], []);
  ok(j[0].tarikh === "2026-11-02" && m.padan.size === 0 && m.tolak.get(jalan) === j[0], "Run yang kebanyakannya jalan (35%) ditolak");
  const nota = walkedNote(jalan, j[0]);
  ok(nota.includes("35% lari") && nota.includes(j[0].tajuk) && nota.includes("Tanda sendiri"), `nota: ${nota}`);
  const tujuh = r(0.7), tiada = r(null);
  ok(id(matchActivities(j, [tujuh], []), tujuh) === j[0].id && matchActivities(j, [tujuh], []).tolak.size === 0, "70% lari padan");
  ok(id(matchActivities(j, [tiada], []), tiada) === j[0].id, "runRatio null padan");
  ok(matchActivities(j, [a("2026-11-02T00:00:00Z", "run", 60, 100, 0.1)], []).tolak.size === 0, "pendek + jalan: bukan sebab nisbah, tiada nota");
  const lumba = j.at(-1)!;
  ok(lumba.jenis === "ujian" && lumba.jarakM === 10000, "hari lumba 10 km");
  const hari = `${lumba.tarikh}T00:00:00Z`;
  const cukupJarak = a(hari, "run", 60, 9500);
  const kurang = a(hari, "run", 99999, 9400);
  ok(id(matchActivities(j, [cukupJarak], []), cukupJarak) === lumba.id, "lumba 95% jarak padan (masa tidak dikira)");
  ok(id(matchActivities(j, [kurang], []), kurang) !== lumba.id, "lumba < 95% jarak tidak padan");
}

if (gagal) throw new Error(`${gagal} semakan gagal`);
console.log("plan-sync: semua semakan lulus.");
