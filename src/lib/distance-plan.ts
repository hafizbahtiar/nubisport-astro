// Pelan 10K dan 21K (akaun sahaja): fungsi tulen, dikira dalam browser. Semak: bun scripts/check-distance-plan.ts
//
// Bertangga: 10K mula dari masa 5K, 21K dari masa 10K (boleh lari jarak itu tanpa henti).
// Sasaran lalai = habis dengan selamat; masa sasaran pilihan menambah sesi laju + analisis.
// Anggaran masa guna formula Riegel (T2 = T1 × (D2/D1)^1.06) - anggaran kasar, dilabel di page.
import { strides, formatPace, segment, repeatSegments, type Analysis, type Phase, type Week, type Verdict, type Session } from "./plan-5k";

export type Distance = "10k" | "21k";

export const DISTANCES = {
  "10k": {
    nama: "10K",
    km: 10,
    minggu: [8, 10, 12],
    prasyarat: { nama: "5K", km: 5, min: 15, max: 60 },
    sasaran: { min: 35, max: 120 },
    mulaKm: 6, // larian panjang minggu 1 (> jarak prasyarat)
    puncakKm: 10, // = jarak lumba; Higdon Novice 10K ~6 batu (docs/training-review.md)
    langkahKm: 1, // larian panjang naik paling banyak sebanyak ini seminggu
    mudah: [30, 45], // minit satu sesi mudah: awal -> puncak
    tirus: 1,
  },
  "21k": {
    nama: "21K",
    km: 21.0975,
    minggu: [12, 16, 20],
    prasyarat: { nama: "10K", km: 10, min: 35, max: 110 },
    sasaran: { min: 75, max: 240 },
    mulaKm: 11,
    puncakKm: 16, // Higdon Novice 1 half: 10 batu (docs/training-review.md)
    langkahKm: 2,
    mudah: [35, 55],
    tirus: 2,
  },
} as const satisfies Record<Distance, unknown>;

export interface DistanceInput {
  jarak: Distance;
  minggu: number;
  hari: number; // 3 | 4
  masa: number; // minit, masa prasyarat (5K untuk 10K, 10K untuk 21K)
  sasaran?: number; // minit, pilihan
  nadi?: { maf: number; bawah: number };
}

export type DistanceResult = { ok: false; sebab: string } | { ok: true; minggu: Week[]; amaran: string[]; ramalan: number };

const RINGAN = 0.75;
// Anggaran kasar: ~0.6% lebih laju seminggu latihan berstruktur (pelari baru-sederhana). Bukan kajian.
export const WEEKLY_GAIN = 0.006;
const HAD_PERATUS = 0.15; // potong lebih 15% dalam satu pelan = tidak realistik

/** Masa (minit) untuk jarak d2 dari masa t1 pada jarak d1 - Riegel. */
export const riegel = (t1: number, d1: number, d2: number) => t1 * (d2 / d1) ** 1.06;
/** "1:05:30" / "52:10" dari minit. */
export const formatTime = (minit: number) => {
  const s = Math.round(minit * 60);
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, "0");
  return `${h ? `${h}:` : ""}${mm}:${String(s % 60).padStart(2, "0")}`;
};
const bundar5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);
const separuh = (n: number) => Math.round(n * 2) / 2;

/** Semakan input yang dikongsi buildDistancePlan dan analyzeDistancePlan. null = sah. */
export function validateDistanceInput({ jarak, minggu, hari, masa, sasaran }: DistanceInput): string | null {
  const c = DISTANCES[jarak];
  if (!c) return "Pilih jarak 10K atau 21K.";
  if (!(c.minggu as readonly number[]).includes(minggu)) return `Pilih tempoh ${c.minggu.join(", ")} minggu.`;
  if (hari !== 3 && hari !== 4) return "Pilih 3 atau 4 hari seminggu.";
  const p = c.prasyarat;
  if (!Number.isInteger(masa) || masa < p.min || masa > p.max)
    return `Masukkan masa ${p.nama} sekarang dalam minit (${p.min}-${p.max}). Belum boleh lari ${p.nama} tanpa henti? Mula dengan pelan ${p.nama} dulu.`;
  if (sasaran !== undefined && (!Number.isInteger(sasaran) || sasaran < c.sasaran.min || sasaran > c.sasaran.max))
    return `Masa sasaran ${c.nama} dalam minit (${c.sasaran.min}-${c.sasaran.max}), atau kosongkan untuk sasaran habis.`;
  return null;
}

/** Minggu latihan yang dianggarkan untuk sasaran ini (0 = sudah dalam kemampuan). */
export function distanceWeeksNeeded(input: DistanceInput): number {
  const c = DISTANCES[input.jarak];
  if (input.sasaran === undefined) return 0;
  const ramalan = riegel(input.masa, c.prasyarat.km, c.km);
  const peratus = (ramalan - input.sasaran) / ramalan;
  return peratus <= 0 ? 0 : Math.ceil(peratus / WEEKLY_GAIN);
}

export function buildDistancePlan(input: DistanceInput): DistanceResult {
  const salah = validateDistanceInput(input);
  if (salah) return { ok: false, sebab: salah };
  const { jarak, minggu: jumlah, hari, masa, sasaran, nadi } = input;
  const c = DISTANCES[jarak];
  const ramalan = riegel(masa, c.prasyarat.km, c.km);
  const amaran: string[] = [];

  // Pace (s/km) dari masa prasyarat: setara 5K, mudah = +75..105 s/km (perbualan selesa).
  const p5 = (riegel(masa, c.prasyarat.km, 5) * 60) / 5;
  const paceMudah = `~${formatPace(p5 + 75)}-${formatPace(p5 + 105)}/km`;
  const paceLumba = ((sasaran ?? ramalan) * 60) / c.km;
  const minitKm = (km: number) => bundar5((km * (p5 + 100)) / 60);

  const USAHA_MUDAH = nadi
    ? `Nadi ${nadi.bawah}-${nadi.maf}, jangan lebih ${nadi.maf} - kalau terlebih, perlahankan atau jalan · ${paceMudah}`
    : `Mudah - boleh bercakap ayat penuh · ${paceMudah}`;

  const mudah = (minit: number, tambah = "", tajuk = "Lari mudah"): Session => ({
    jenis: "mudah", minit, tajuk, arahan: `Lari ${minit} min pada rentak santai.${tambah}`, usaha: USAHA_MUDAH,
    segmen: [segment("lari", minit), ...(tambah ? strides(tambah.includes("6 ×") ? 6 : 4) : [])],
  });
  const laju6 = " Akhiri dengan 6 × 20 saat langkah laju (rehat jalan 40 saat) - laju tapi santai, bukan pecut.";
  const panjang = (km: number): Session => ({
    jenis: "panjang",
    minit: minitKm(km),
    tajuk: `Larian panjang ${km} km`,
    arahan: `Lari ${km} km tanpa henti, lebih perlahan daripada biasa. Bawa air; ${km >= 15 ? "makan gel/kurma setiap 45 min, " : ""}boleh jalan sekejap untuk minum.`,
    usaha: USAHA_MUDAH,
    segmen: [segment("lari", minitKm(km))], // anggaran masa untuk km itu
  });
  const fartlek = (minit: number): Session => ({
    jenis: "tempo",
    minit,
    tajuk: "Fartlek ringan",
    arahan: `Panas badan 10 min. ${Math.max(4, Math.round((minit - 20) / 3))} × 1 min sedikit laju, 2 min mudah antara. Sejuk badan 10 min.`,
    segmen: [segment("lari", 10), ...repeatSegments(Math.max(4, Math.round((minit - 20) / 3)), segment("laju", 1), segment("lari", 2)), segment("lari", 10)],
    usaha: "Bahagian laju: sukar sedikit, masih boleh cakap beberapa perkataan",
  });
  const tempo = (minitTempo: number, saat: number): Session => ({
    jenis: "tempo",
    minit: 20 + minitTempo,
    tajuk: "Tempo",
    arahan: `Panas badan 10 min. ${minitTempo} min pada rentak tempo. Sejuk badan 10 min.`,
    segmen: [segment("lari", 10), segment("laju", minitTempo), segment("lari", 10)],
    usaha: `Sukar bercakap, tetap terkawal · ~${formatPace(saat)}/km minggu ini`,
  });
  const interval = (ulang: number, saat: number): Session => ({
    jenis: "interval",
    minit: 15 + ulang * 5,
    tajuk: "Interval",
    arahan: `Panas badan 10 min. ${ulang} × 800 m (atau 3-4 min) laju, rehat 2 min joging antara set. Sejuk badan 5 min.`,
    segmen: [segment("lari", 10), ...repeatSegments(ulang, segment("laju", 3.5), segment("rehat", 2)), segment("jalan", 5)],
    usaha: `Laju tapi terkawal · ~${formatPace(saat)}/km minggu ini`,
  });

  // Fasa: minggu bina = jumlah - tirus - 1 (lumba).
  const bina = jumlah - c.tirus - 1;
  const nAsas = Math.round(bina * (sasaran ? 0.35 : 0.5));
  const nDaya = sasaran ? Math.round(bina * 0.35) : bina - nAsas;
  const fasaOf = (w: number): Phase => (w < nAsas ? "Asas" : w < nAsas + nDaya ? "Daya tahan" : "Kelajuan");
  let kualitiTotal = 0;
  for (let w = nAsas + nDaya; w < bina; w++) if (w % 4 !== 3) kualitiTotal++;
  // Pace sesi laju turun beransur dari pace lumba sekarang (Riegel) ke pace sasaran.
  const paceRamalan = (ramalan * 60) / c.km;
  const paceKualiti = (k: number) => paceRamalan + ((paceLumba - paceRamalan) * (k + 1)) / Math.max(1, kualitiTotal);

  const minggu: Week[] = [];
  const naik = bina - Math.floor(bina / 4); // minggu bina bukan ringan
  let km: number = c.mulaKm;
  let biasa = 0;
  let kualiti = 0;
  for (let w = 0; w < bina; w++) {
    const ringan = w % 4 === 3;
    const fasa = fasaOf(w);
    if (!ringan) {
      const sasaranKm = c.mulaKm + ((c.puncakKm - c.mulaKm) * biasa) / Math.max(1, naik - 1);
      km = biasa === 0 ? c.mulaKm : Math.min(separuh(sasaranKm), km + c.langkahKm);
      biasa++;
    }
    const kmMinggu = ringan ? separuh(km * RINGAN) : km;
    const e0 = c.mudah[0] + ((c.mudah[1] - c.mudah[0]) * w) / Math.max(1, bina - 1);
    const e = bundar5(ringan ? e0 * RINGAN : e0);

    let slot2: Session;
    if (ringan || (fasa === "Asas" && w === 0)) slot2 = mudah(e);
    else if (fasa === "Asas") slot2 = mudah(e, laju6, "Lari mudah + langkah laju");
    else if (fasa === "Daya tahan") slot2 = sasaran ? tempo(Math.min(25, 12 + 2 * (w - nAsas)), paceRamalan + 10) : fartlek(e);
    else {
      const k = kualiti++;
      const s = paceKualiti(k);
      slot2 = k % 2 === 0 ? interval(Math.min(6, 3 + Math.floor(k / 2)), s - 20) : tempo(Math.min(30, 15 + 3 * Math.floor(k / 2)), s + 5);
    }
    const sesi = [mudah(e), slot2, ...(hari === 4 ? [mudah(bundar5(e * 0.8))] : []), panjang(kmMinggu)];
    minggu.push({ no: w + 1, fasa, ringan, minit: sesi.reduce((a, s) => a + s.minit, 0), sesi });
  }

  // Tirus: larian panjang turun (10K: 60%; 21K: 75% kemudian 50%), sesi mudah lebih pendek.
  const nisbahTirus = c.tirus === 1 ? [0.6] : [0.75, 0.5];
  nisbahTirus.forEach((r, i) => {
    const e = bundar5(c.mudah[1] * 0.7);
    const kunci = sasaran
      ? { ...tempo(10, paceLumba), tajuk: "Rasa pace lumba", arahan: `Panas badan 10 min. 10 min pada pace sasaran ${c.nama}. Sejuk badan 10 min.`, usaha: `Pace sasaran ~${formatPace(paceLumba)}/km - terasa terkawal` }
      : mudah(e, laju6, "Lari mudah + langkah laju");
    const sesi = [mudah(e), kunci, ...(hari === 4 ? [mudah(bundar5(e * 0.8))] : []), panjang(separuh(km * r))];
    minggu.push({ no: bina + i + 1, fasa: "Tirus", ringan: true, minit: sesi.reduce((a, s) => a + s.minit, 0), sesi });
  });

  // Minggu lumba: sesi pendek, kemudian hari lumba hujung minggu.
  const lumba: Session = {
    jenis: "ujian",
    minit: bundar5((sasaran ?? ramalan) + 25),
    tajuk: `Hari lumba ${c.nama}`,
    arahan: `Panas badan jalan + lari santai 10 min. Lari ${c.nama} - km pertama lebih perlahan daripada pace sasaran, separuh kedua boleh dipercepat. Minum di setiap stesen air.`,
    usaha: sasaran
      ? `Pace sasaran ~${formatPace(paceLumba)}/km = ${formatTime(sasaran)}`
      : `Habis dengan selamat - rentak boleh bercakap beberapa perkataan (anggaran ~${formatTime(ramalan)})`,
  };
  const pendek = Array.from({ length: hari - 1 }, (_, i) => mudah(i === 0 ? 30 : 20, i === 0 ? " Akhiri dengan 4 × 20 saat langkah laju." : ""));
  minggu.push({ no: jumlah, fasa: "Ujian", ringan: true, minit: [...pendek, lumba].reduce((a, s) => a + s.minit, 0), sesi: [...pendek, lumba] });

  if (nadi)
    for (const w of minggu)
      for (const s of w.sesi)
        if (s.jenis === "interval" || s.jenis === "tempo") s.usaha += ` · Nadi melebihi ${nadi.maf} - normal untuk sesi ini saja.`;

  const perlu = distanceWeeksNeeded(input);
  if (perlu > jumlah) amaran.push(`Masa sasaran ${formatTime(sasaran!)} ketat untuk ${jumlah} minggu dari ${c.prasyarat.nama} ${masa} minit - lihat "Realistik tak?".`);
  return { ok: true, minggu, amaran, ramalan };
}

/** "Realistik tak?" untuk masa sasaran. Tiada sasaran / input tidak sah = null. */
export function analyzeDistancePlan(input: DistanceInput): Analysis | null {
  if (validateDistanceInput(input) || input.sasaran === undefined) return null;
  const { jarak, minggu, hari, masa, sasaran } = input;
  const c = DISTANCES[jarak];
  const ramalan = riegel(masa, c.prasyarat.km, c.km);
  const peratus = (ramalan - sasaran) / ramalan;
  const perlu = distanceWeeksNeeded(input);
  const nisbah = perlu === 0 ? Infinity : minggu / perlu;
  const penilaian: Verdict =
    peratus > HAD_PERATUS ? "tak-realistik" : nisbah >= 1 ? "munasabah" : nisbah >= 0.75 ? "mencabar" : "tak-realistik";

  const butiran: Analysis["butiran"] = [
    {
      label: "Anggaran sekarang",
      nilai: `${c.nama} ~${formatTime(ramalan)}`,
      nota: `Dari ${c.prasyarat.nama} ${masa} minit (formula Riegel, anggaran kasar - jarak lebih jauh biasanya lebih perlahan bagi pelari yang belum biasa).`,
    },
    {
      label: "Jurang",
      nilai: peratus <= 0 ? "Tiada" : `${formatTime(ramalan)} → ${formatTime(sasaran)}`,
      nota:
        peratus <= 0
          ? "Sasaran ini dah dalam kemampuan anda - pelan fokus pada daya tahan supaya pace kekal hingga akhir."
          : `Perlu ~${Math.round(peratus * 100)}% lebih laju: pace ${formatPace((ramalan * 60) / c.km)} → ${formatPace((sasaran * 60) / c.km)}/km.`,
    },
    {
      label: "Masa",
      nilai: `${minggu} minggu (perlu ~${perlu})`,
      nota:
        peratus > HAD_PERATUS
          ? `Lebih ${Math.round(HAD_PERATUS * 100)}% dalam satu pelan terlalu banyak. Sasarkan ~${formatTime(ramalan * (1 - 0.1))} dulu.`
          : nisbah >= 1
            ? `Cukup (anggaran ~${(WEEKLY_GAIN * 100).toFixed(1)}% lebih laju seminggu, kasar).`
            : `Kurang ${perlu - minggu} minggu daripada anggaran. Pilih tempoh lebih panjang atau masa sasaran lebih longgar.`,
    },
    {
      label: "Larian panjang puncak",
      nilai: `${c.puncakKm} km`,
      nota: `Cukup untuk ${c.nama} - baki jarak datang dari tirus dan semangat hari lumba.`,
    },
    {
      label: "Hari seminggu",
      nilai: `${hari} hari`,
      nota: hari === 3 ? "Cukup. 4 hari beri lebih masa berlari kalau badan okey." : "Cukup - jangan tambah lagi, rehat pun sebahagian latihan.",
    },
  ];
  const ringkas =
    penilaian === "munasabah"
      ? "Sasaran munasabah untuk situasi anda. Kuncinya konsisten - larian panjang lebih penting daripada sesi laju."
      : penilaian === "mencabar"
        ? "Boleh, tapi ketat - hampir tiada ruang untuk minggu terlepas, sakit atau cedera."
        : `${c.nama} dalam ${formatTime(sasaran)} tak realistik bagi situasi anda dalam ${minggu} minggu. Habiskan dulu, atau sasarkan ~${formatTime(Math.max(sasaran, ramalan * (1 - 0.1)))}.`;
  return { penilaian, ringkas, butiran };
}
