// bun scripts/check-plan-sync.ts - semak padankan() dalam src/lib/plan-sync.ts (docs/plans/active-plan-sync.md).
import { matchActivities, planSessions, walkedNote, weeklyLoad, planFromParams, hrMax, VIGOROUS } from "../src/lib/plan-sync";
import { racePlan, isoDate, RACE_WEEKS } from "../src/lib/plan-5k";
import { DISTANCES } from "../src/lib/distance-plan";

let gagal = 0;
const ok = (c: unknown, msg: string) => {
  if (!c) {
    gagal++;
    console.error("GAGAL:", msg);
  }
  return !!c;
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

// v2: pelan ikut tarikh lumba (minggu + lumba) dan pace sendiri.
{
  const p = { minggu: "8", lumba: "2026-12-20", mula: "2026-10-26", hari: "3", tahap: "5k", masa: "33", pace: "350" };
  const s5 = planSessions("pelan-5k:8w-5k-33-3", p)!;
  ok(s5 && s5.length === 24 && s5.at(-1)!.jenis === "ujian", "5K lumba: 8 minggu × 3 sesi");
  ok(s5.at(-1)!.tarikh === "2026-12-20" && s5.at(-2)!.tarikh === "2026-12-16", `hari lumba = tarikh lumba (Ahad), bukan Sabtu: ${s5.at(-1)!.tarikh}`);
  ok(planFromParams("pelan-5k:8w-5k-33-3", p)?.minggu.length === 8, "planFromParams 5K minggu");
  const s10 = planSessions("pelan-10k:9-30-p360-3", { jarak: "10k", minggu: "9", hari: "3", masa: "30", pace: "360", mula: "2026-10-26" });
  ok(s10?.length === 27 && s10.some((x) => x.jenis === "interval"), "10K pace = ada sasaran, 9 minggu");
  ok(planSessions("pelan-5k:3-jalan--3", { bulan: "3", tahap: "jalan", hari: "3", mula: "2026-11-02", lumba: "bukan-tarikh" })?.at(-1)!.tarikh === sesi.at(-1)!.tarikh, "lumba rosak diabaikan");
}
// Beban mingguan: minit dirancang vs minit run/walk sebenar setiap minggu pelan (Isnin-Ahad, waktu Malaysia).
{
  const w = weeklyLoad(sesi, [
    a("2026-11-01T22:30:00Z", "run", 1800), // Isnin 2 Nov MY = minggu 1
    a("2026-11-08T15:00:00Z", "walk", 600), // Ahad 8 Nov 23:00 MY = minggu 1
    a("2026-11-08T22:30:00Z", "run", 1200), // Isnin 9 Nov MY = minggu 2
    a("2026-11-03T00:00:00Z", "ride", 9999), // bukan lari/jalan
  ]);
  const rancang1 = sesi.filter((x) => x.minggu === 1).reduce((n, x) => n + x.minit, 0);
  ok(w.length === 12 && w[0].no === 1 && w[0].rancang === rancang1, `weeklyLoad rancang: ${JSON.stringify(w[0])}`);
  ok(w[0].sebenar === 40 && w[1].sebenar === 20 && w[2].sebenar === 0, `weeklyLoad sebenar: ${w.slice(0, 3).map((x) => x.sebenar)}`);
}

// Intensiti (ACSM): sesi tempo/interval tak boleh ditanda oleh larian yang nadi puncaknya < 77% HRmax (Tanaka).
{
  ok(hrMax(30) === 187 && VIGOROUS === 0.77, "HRmax Tanaka 30 thn = 187, vigorous 77%");
  const t = planSessions("pelan-10k:x", { jarak: "10k", minggu: "10", masa: "30", sasaran: "60", hari: "3", mula: "2026-11-02" })!;
  const tempo = t.find((s) => s.jenis === "tempo" || s.jenis === "interval")!;
  ok(!!tempo, "pelan bersasaran ada sesi laju");
  const pada = `${tempo.tarikh}T00:00:00Z`; // 08:00 MY, hari sesi laju
  const lari = (maxHr: number | null) => ({ startedAt: pada, sport: "run", distanceM: 8000, movingS: tempo.minit * 60, runRatio: 0.95, maxHr });
  const dapat = (maxHr: number | null, umur: number | null) => {
    const x = lari(maxHr);
    return matchActivities(t, [x], t.filter((s) => s.minggu === tempo.minggu && s.id !== tempo.id).map((s) => s.id), umur).padan.get(x)?.id;
  };
  ok(dapat(130, 30) === undefined, "nadi puncak 130 (< 144) = larian mudah, sesi laju tak ditanda");
  ok(dapat(150, 30) === tempo.id, "nadi puncak 150 (>= 144) padan sesi laju");
  ok(dapat(null, 30) === tempo.id && dapat(130, null) === tempo.id, "tiada nadi / tiada umur = tak dapat dibuktikan, tak dihalang");
}

// Lumba setiap hari (Isnin 8 - Ahad 14 Feb 2027) × 3/4 hari × 5K/10K/21K/42K: tarikh dari planSessions (kad, .ics,
// padanan): naik, lumba = sesi terakhir = tarikh lumba, rehat sebelum lumba; beban mingguan = minit minggu pelan.
for (const [kunci, asas, had] of [
  ["pelan-5k:x", { tahap: "5k", masa: "33" }, RACE_WEEKS],
  ["pelan-10k:x", { jarak: "10k", masa: "30" }, [DISTANCES["10k"].minggu[0], DISTANCES["10k"].minggu.at(-1)!]],
  ["pelan-21k:x", { jarak: "21k", masa: "60" }, [DISTANCES["21k"].minggu[0], DISTANCES["21k"].minggu.at(-1)!]],
  ["pelan-42k:x", { jarak: "42k", masa: "130" }, [DISTANCES["42k"].minggu[0], DISTANCES["42k"].minggu.at(-1)!]],
] as const)
  for (const hari of [3, 4])
    for (let n = 8; n <= 14; n++) {
      const lumba = `2027-02-${String(n).padStart(2, "0")}`;
      // 42K perlu >= 16 minggu: mula awal sebulan supaya setiap tarikh lumba dalam julat.
      const mula = kunci.startsWith("pelan-42k") ? "2026-09-21" : "2026-10-21";
      const r = racePlan(new Date(`${mula}T00:00:00`), new Date(`${lumba}T00:00:00`), had, hari);
      const p = { ...asas, hari: String(hari), minggu: String(r.minggu), mula: isoDate(r.mula), lumba };
      const s = planSessions(kunci, p);
      const nama = `${kunci} ${hari} hari lumba ${lumba}`;
      if (!ok(s, `${nama}: tiada pelan`) || !s) continue;
      ok(s[0].tarikh === p.mula && s.every((x, k) => k === 0 || x.tarikh > s[k - 1].tarikh), `${nama}: tarikh tak naik`);
      ok(s.at(-1)!.jenis === "ujian" && s.at(-1)!.tarikh === lumba && s.every((x) => x.tarikh <= lumba), `${nama}: sesi selepas lumba`);
      ok(Date.parse(lumba) - Date.parse(s.at(-2)!.tarikh) >= 2 * 864e5, `${nama}: tiada rehat sebelum lumba`);
      const w = weeklyLoad(s, []);
      ok(w.length === r.minggu && w.every((x) => x.rancang === s.filter((y) => y.minggu === x.no).reduce((t, y) => t + y.minit, 0)), `${nama}: weeklyLoad`);
      // Aktiviti sehari selepas sesi pertama minggu akhir = minggu akhir (minggu pelan, bukan Isnin-Ahad).
      const akhir = s.find((x) => x.minggu === r.minggu)!;
      const esok = new Date(Date.parse(`${akhir.tarikh}T00:00:00Z`) + 864e5).toISOString().slice(0, 10);
      const wl = weeklyLoad(s, [a(`${esok}T00:00:00Z`, "run", 600)]);
      ok(wl.at(-1)!.sebenar === 10, `${nama}: aktiviti minggu akhir`);
    }

if (gagal) throw new Error(`${gagal} semakan gagal`);
console.log("plan-sync: semua semakan lulus.");
