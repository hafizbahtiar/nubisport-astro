// bun scripts/check-sesuai.ts - semak band IPU (rasmi JAS) + nasihat cuaca (MET) dalam src/lib/sesuai.ts.
import {
  NEGERI,
  ipuTertinggi,
  nasihatCuaca,
  jamMY,
  tahapIpu,
  waktuLari,
  type HariCuaca,
  type StesenIpu,
} from "../src/lib/sesuai";

let gagal = 0;
const ok = (c: unknown, msg: string) => {
  if (!c) {
    gagal++;
    console.error("GAGAL:", msg);
  }
};

// Band rasmi JAS: 0-50 Baik, 51-100 Sederhana, 101-200 Tidak sihat, 201-300 Sangat tidak sihat, 301+ Berbahaya.
const BAND = [
  [0, "Baik"],
  [50, "Baik"],
  [51, "Sederhana"],
  [100, "Sederhana"],
  [101, "Tidak sihat"],
  [200, "Tidak sihat"],
  [201, "Sangat tidak sihat"],
  [300, "Sangat tidak sihat"],
  [301, "Berbahaya"],
  [500, "Berbahaya"],
] as const;
for (const [api, label] of BAND)
  ok(tahapIpu(api).label === label, `IPU ${api} = ${label}`);
ok(tahapIpu(120).nasihat.includes("dalam rumah"), "IPU > 100: cadang lari dalam rumah");
for (const api of [10, 80, 150, 250, 400]) {
  const t = tahapIpu(api);
  ok(
    t.nasihat.length > 5 && !t.nasihat.includes("undefined"),
    `nasihat IPU ${api} berisi`,
  );
}

// Stesen tertinggi (konservatif); bacaan null diabaikan.
const st = (id: string, api: number | null): StesenIpu => ({
  id,
  station: id,
  state: "X",
  api,
  pollutant: null,
  time: 0,
});
ok(ipuTertinggi([st("a", 40), st("b", 120), st("c", null)])?.id === "b", "ambil bacaan tertinggi");
ok(ipuTertinggi([st("a", null), st("b", 12)])?.id === "b", "abai bacaan null");
ok(ipuTertinggi([st("a", null)]) === null, "semua null = null");
ok(ipuTertinggi([]) === null, "senarai kosong = null");

// Nasihat cuaca
const hari = (o: Partial<HariCuaca> = {}): HariCuaca => ({
  date: "2027-02-08",
  summary: "Separa berawan",
  when: null,
  morning: null,
  afternoon: null,
  night: null,
  min: 24,
  max: 32,
  ...o,
});
ok(
  nasihatCuaca(hari({ afternoon: "Ribut petir di beberapa tempat" })).some((n) => n.includes("lari pagi")),
  "ribut petir petang + pagi cerah -> lari pagi",
);
ok(
  nasihatCuaca(hari({ morning: "Ribut petir", summary: "Ribut petir di beberapa tempat" })).some((n) =>
    n.startsWith("Ribut petir diramal - elak"),
  ),
  "ribut petir sepanjang hari",
);
ok(nasihatCuaca(hari({ max: 34 })).some((n) => n.includes("11 pagi")), "33 °C ke atas = nasihat panas");
ok(!nasihatCuaca(hari({ max: 32 })).some((n) => n.includes("Panas")), "32 °C = tiada nasihat panas");
ok(nasihatCuaca(hari({ summary: "Jerebu" })).some((n) => n.includes("IPU")), "jerebu -> semak IPU");
ok(nasihatCuaca(hari()).length === 0, "hari tenang = tiada amaran");

// Jadual negeri: nama mesti sama dengan data JAS, id mesti id MET (St###).
ok(NEGERI.length === 16, "16 negeri");
ok(new Set(NEGERI.map((n) => n.nama)).size === 16, "nama negeri unik");
ok(new Set(NEGERI.map((n) => n.met)).size === 16, "id MET unik");
ok(NEGERI.every((n) => /^St\d{3}$/.test(n.met)), "id MET berbentuk St###");

// Waktu lari terbaik: Subuh -> 11:00 dan max(16:00, Asar) -> Maghrib; tamat dibuang; ribut ke belakang.
ok(NEGERI.every((n) => /^[A-Z]{3}\d{2}$/.test(n.zon)), "zon JAKIM berbentuk ABC01");
const w = { date: "2026-10-18", fajr: "05:50", syuruk: "06:56", asr: "16:18", maghrib: "19:01" };
const t1 = waktuLari(w, "05:00");
ok(t1.length === 2 && t1[0].nama === "Pagi" && t1[0].dari === "05:50" && t1[0].hingga === "11:00", "pagi Subuh -> 11:00");
ok(t1[1].dari === "16:18" && t1[1].hingga === "19:01", "petang Asar (lepas 4 petang) -> Maghrib");
ok(waktuLari({ ...w, asr: "15:50" }, "05:00")[1].dari === "16:00", "Asar sebelum 4 petang -> mula 16:00");
ok(waktuLari(w, "11:00").map((t) => t.nama).join() === "Petang", "11:00 = pagi tamat");
ok(waktuLari(w, "19:30").length === 0, "lepas Maghrib = tiada");
const rp = waktuLari(w, "05:00", hari({ morning: "Ribut petir di beberapa tempat" }));
ok(rp[0].nama === "Petang" && rp[1].ribut, "ribut pagi -> petang dulu");
ok(jamMY(new Date("2026-10-18T00:30:00Z")) === "08:30", "jam Malaysia UTC+8");

if (gagal) throw new Error(`${gagal} semakan gagal`);
console.log("ok - sesuai (IPU + cuaca + waktu lari)");
