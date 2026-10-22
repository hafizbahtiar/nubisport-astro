// Pelan "5K bawah 30 minit": fungsi tulen, dikira dalam browser.
// Semak: bun scripts/check-plan-5k.ts

export type Level = "sifar" | "jalan" | "5k";
export type Phase = "Asas" | "Daya tahan" | "Kelajuan" | "Tirus" | "Ujian";
export type SessionType = "jalan-lari" | "mudah" | "panjang" | "interval" | "tempo" | "ujian";

export interface Session {
  jenis: SessionType;
  minit: number;
  tajuk: string;
  arahan: string;
  usaha: string;
  /** Langkah untuk pemasa (src/lib/timer.ts). Tiada = sesi ikut jarak (ujian/lumba), tiada pemasa. */
  segmen?: Segment[];
}

/** Satu langkah pemasa. `laju` = bahagian kualiti (interval, tempo, langkah laju); `rehat` = antara set. */
export interface Segment {
  buat: "jalan" | "lari" | "laju" | "rehat";
  saat: number;
}
export const segment = (buat: Segment["buat"], minit: number): Segment => ({ buat, saat: Math.round(minit * 60) });
/** n × (kerja, rehat), tanpa rehat selepas set terakhir. */
export const repeatSegments = (n: number, kerja: Segment, rehat: Segment): Segment[] =>
  Array.from({ length: n }, (_, i) => (i < n - 1 ? [kerja, rehat] : [kerja])).flat();
/** Langkah laju di hujung lari mudah: n × 20 s laju, 40 s jalan. */
export const strides = (n: number): Segment[] => repeatSegments(n, { buat: "laju", saat: 20 }, { buat: "jalan", saat: 40 });

export interface Week {
  no: number;
  fasa: Phase;
  ringan: boolean;
  minit: number; // beban dirancang = jumlah minit sesi
  sesi: Session[];
}

export interface PlanInput {
  bulan: number;
  tahap: Level;
  hari: number;
  masa5k?: number; // minit - wajib untuk tahap "5k", pilihan untuk "jalan" (masa jalan-lari 5K)
  nadi?: { maf: number; bawah: number }; // pilihan "ikut nadi" - dari calcMaf (src/lib/maf.ts)
}

export type PlanResult =
  | { ok: false; sebab: string; cadanganBulan?: number }
  | { ok: true; minggu: Week[]; amaran: string[] };

export const PLAN_MONTHS = [2, 3, 4, 6] as const;
export const DAYS_PER_WEEK = [3, 4] as const;
export const LEVELS: Record<Level, string> = {
  sifar: "Belum boleh lari 1 km tanpa henti",
  jalan: "Boleh jalan-lari 5 km",
  "5k": "Boleh lari 5 km tanpa henti",
};
export const TARGET_MINUTES = 30;
export const TIME_MIN = 15;
export const TIME_MAX = 60;

// Anggaran kasar (dilabel di page), bukan hasil kajian:
// - minggu paling sedikit sebelum 5K bawah 30 minit munasabah dari tahap itu
export const MIN_WEEKS: Record<Exclude<Level, "5k">, number> = { sifar: 16, jalan: 12 };
// - tahap "5k": kira-kira 1.5 minggu latihan bagi setiap minit yang hendak dipotong
export const WEEKS_PER_MINUTE = 1.5;

const LONJAKAN = 1.1; // beban minggu bina naik paling banyak 10%
const RINGAN = 0.75; // setiap minggu ke-4: -25%
const MINIT_MULA: Record<Level, number> = { sifar: 20, jalan: 25, "5k": 30 }; // satu sesi
const MINIT_PUNCAK = 50; // satu sesi
const NISBAH_FASA: Record<Level, [asas: number, dayaTahan: number]> = {
  sifar: [0.5, 0.25],
  jalan: [0.3, 0.35],
  "5k": [0, 0.4],
};
// [lari, jalan] minit; tahap "jalan" mula di langkah 4. 20 -> 25 -> 30 min (NHS Couch to 5K naik
// 20 -> 25 -> 28 -> 30), bukan terus 20 -> 30. docs/training-review.md
const LANGKAH: [number, number][] = [
  [1, 2], [2, 2], [3, 2], [5, 2], [8, 2], [10, 1], [15, 1], [20, 1], [25, 1], [30, 0],
];
const LANGKAH_MULA: Record<Exclude<Level, "5k">, number> = { sifar: 0, jalan: 4 };

// Hari sesi, kiraan dari Isnin (0 = Isnin ... 6 = Ahad). Sesi akhir (larian panjang / ujian)
// jatuh hujung minggu, dan tiada dua sesi berturut-turut.
export const DAY_NAMES = ["Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu", "Ahad"];
export const SESSION_DAYS: Record<number, number[]> = { 3: [0, 2, 5], 4: [0, 2, 4, 6] };

/**
 * Terlepas sesi: minggu pertama yang ada sesi lepas belum siap, selepas sesi terakhir yang ditanda
 * (lubang lama yang sudah dilangkau tidak dikira), dan hanya jika minggu itu sebelum minggu semasa - satu
 * sesi terlepas minggu ini tidak perlu anjak. Minggu itu disambung Isnin ini jika hari ini Isnin, jika
 * tidak Isnin depan (supaya tiada sesi minggu itu yang sudah lepas lagi). Tanda siap ikut nombor minggu,
 * jadi kekal selepas dianjak.
 */
export function resumePoint(
  minggu: Week[],
  isnin: Date,
  siap: Set<string>,
  kini = new Date(),
): { no: number; mula: Date; isninMinggu: Date; anjak: number } | null {
  const hariIni = new Date(kini.getFullYear(), kini.getMonth(), kini.getDate());
  const sesi = minggu.flatMap((w) => w.sesi.map((_, i) => ({ no: w.no, id: `${w.no}.${i}`, d: sessionDate(isnin, w.no, w.sesi.length, i) })));
  let akhir = -1;
  sesi.forEach((s, n) => siap.has(s.id) && (akhir = n));
  const lepas = sesi.find((s, n) => n > akhir && s.d < hariIni);
  const mingguKini = Math.floor((hariIni.getTime() - isnin.getTime()) / (7 * 864e5)) + 1;
  if (!lepas || lepas.no >= mingguKini) return null;
  const isninMinggu = startMonday(hariIni); // hari ini jika Isnin, jika tidak Isnin depan
  const mula = new Date(isninMinggu);
  mula.setDate(mula.getDate() - (lepas.no - 1) * 7);
  const anjak = Math.round((mula.getTime() - isnin.getTime()) / (7 * 864e5));
  return anjak > 0 ? { no: lepas.no, mula, isninMinggu, anjak } : null;
}

/** yyyy-mm-dd waktu tempatan (param `mula`). */
export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Isnin pada atau selepas `d` - pelan bermula Isnin supaya hari sesi kekal sama setiap minggu. */
export function startMonday(d: Date): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + ((8 - r.getDay()) % 7));
  return r;
}

/** Tarikh sesi ke-`sesi` (dari 0) dalam minggu ke-`minggu` (dari 1). */
export function sessionDate(isnin: Date, minggu: number, hari: number, sesi: number): Date {
  const r = new Date(isnin);
  r.setDate(r.getDate() + (minggu - 1) * 7 + SESSION_DAYS[hari][sesi]);
  return r;
}

const turun5 = (n: number) => Math.floor(n / 5) * 5;
const bulanUntuk = (minggu: number) => PLAN_MONTHS.find((b) => b * 4 >= minggu);
const PACE_SASARAN = (TARGET_MINUTES * 60) / 5; // 360 s/km

/** Anggaran minggu latihan sebelum 5K bawah 30 minit munasabah, ikut tahap + masa sekarang. */
export function weeksNeeded(tahap: Level, masa5k?: number): number {
  const ikutMasa = masa5k ? Math.ceil((masa5k - TARGET_MINUTES) * WEEKS_PER_MINUTE) : 0;
  return tahap === "5k" ? ikutMasa : Math.max(MIN_WEEKS[tahap], ikutMasa);
}

/** Bilangan minggu setiap fasa (minggu akhir = ujian, tidak dikira). */
export function phaseWeeks(tahap: Level, jumlahMinggu: number) {
  const bina = jumlahMinggu - 1;
  const [rAsas, rDaya] = NISBAH_FASA[tahap];
  const asas = Math.round(bina * rAsas);
  const dayaTahan = Math.round(bina * rDaya);
  let kualiti = 0; // minggu Kelajuan bukan ringan = satu sesi laju
  for (let w = asas + dayaTahan; w < bina; w++) if (w % 4 !== 3) kualiti++;
  return { bina, asas, dayaTahan, kelajuan: bina - asas - dayaTahan, kualiti };
}


export type Verdict = "munasabah" | "mencabar" | "tak-realistik";
export interface Analysis {
  penilaian: Verdict;
  ringkas: string;
  butiran: { label: string; nilai: string; nota: string }[];
}

const KADAR_BIASA = 1 / WEEKS_PER_MINUTE; // minit dipotong seminggu (anggaran kasar)

/** Kenapa sasaran munasabah atau tidak untuk input ini. Input mesti sudah lulus buildPlan's semakan
 *  asas (bulan/hari/tahap/masa sah) - selain itu null. */
export function analyzePlan(input: PlanInput): Analysis | null {
  const { bulan, tahap, hari, masa5k, nadi } = input;
  if (!(PLAN_MONTHS as readonly number[]).includes(bulan) || !(DAYS_PER_WEEK as readonly number[]).includes(hari) || !(tahap in LEVELS)) return null;
  const adaMasa = masa5k !== undefined && tahap !== "sifar";
  if (adaMasa && (!Number.isInteger(masa5k) || masa5k < TIME_MIN || masa5k > TIME_MAX || masa5k <= TARGET_MINUTES)) return null;
  if (tahap === "5k" && !adaMasa) return null;

  const ada = bulan * 4;
  const perlu = weeksNeeded(tahap, adaMasa ? masa5k : undefined);
  const nisbah = ada / perlu;
  const penilaian: Verdict = nisbah >= 1 ? "munasabah" : nisbah >= 0.75 ? "mencabar" : "tak-realistik";
  const f = phaseWeeks(tahap, ada);
  const butiran: Analysis["butiran"] = [];

  if (adaMasa) {
    const p0 = (masa5k * 60) / 5;
    const potong = masa5k - TARGET_MINUTES;
    butiran.push({
      label: "Jurang",
      nilai: `${masa5k} → bawah ${TARGET_MINUTES} minit`,
      nota: `Pace sekarang ~${formatPace(p0)}/km, sasaran ${formatPace(PACE_SASARAN)}/km: setiap km perlu ${Math.round(p0 - PACE_SASARAN)} saat lebih cepat (${Math.round((potong / masa5k) * 100)}% lebih laju).`,
    });
    const kadar = potong / f.bina;
    butiran.push({
      label: "Kadar diperlukan",
      nilai: `${kadar.toFixed(1)} minit / minggu`,
      nota:
        kadar <= KADAR_BIASA
          ? `Dalam kadar biasa pelari baru (~${KADAR_BIASA.toFixed(1)} minit seminggu, anggaran kasar).`
          : `Lebih ${(kadar / KADAR_BIASA).toFixed(1)}× kadar biasa (~${KADAR_BIASA.toFixed(1)} minit seminggu, anggaran kasar). Badan perlu masa - otot, jantung dan tendon menyesuaikan diri pada kadar berbeza.`,
    });
  } else {
    butiran.push({
      label: "Titik mula",
      nilai: LEVELS[tahap],
      nota:
        tahap === "sifar"
          ? "Langkah pertama ialah lari tanpa henti, bukan laju. Badan perlu belajar dulu - kelajuan datang lepas itu."
          : "Tiada masa 5K, jadi anggaran ikut tahap saja. Masukkan masa jalan-lari 5K anda untuk anggaran lebih tepat.",
    });
  }

  butiran.push({
    label: "Masa",
    nilai: `${ada} minggu (perlu ~${perlu})`,
    nota:
      nisbah >= 1
        ? "Cukup, termasuk minggu ringan setiap minggu ke-4."
        : `Kurang ${perlu - ada} minggu daripada anggaran. ${bulanUntuk(perlu) ? `${bulanUntuk(perlu)} bulan dah cukup.` : "Lebih daripada 6 bulan - pecahkan kepada dua sasaran."}`,
  });
  butiran.push({
    label: "Pecahan pelan",
    nilai: [f.asas && `Asas ${f.asas}`, `Daya tahan ${f.dayaTahan}`, `Kelajuan ${f.kelajuan}`, "Ujian 1"].filter(Boolean).join(" · "),
    nota:
      f.kualiti >= 4
        ? `${f.kualiti} sesi laju (interval/tempo) - cukup untuk biasakan kaki dengan pace sasaran.`
        : `Hanya ${f.kualiti} sesi laju - sedikit untuk biasakan kaki dengan pace ${formatPace(PACE_SASARAN)}/km. Tempoh lebih panjang = lebih banyak sesi laju.`,
  });
  butiran.push({
    label: "Hari seminggu",
    nilai: `${hari} hari`,
    nota:
      hari === 3
        ? "Cukup untuk bermula. 4 hari beri ~33% lebih masa berlari kalau badan okey."
        : "Cukup - jangan tambah lagi, rehat pun sebahagian latihan.",
  });
  if (nadi)
    butiran.push({
      label: "Ikut nadi",
      nilai: `Had ${nadi.maf} denyut/min`,
      nota: "Awal pelan, larian mudah mungkin perlu jalan untuk kekal bawah had. Asas aerobik lebih kukuh, tapi kelajuan naik lebih perlahan.",
    });

  const b = bulanUntuk(perlu);
  const ringkas =
    penilaian === "munasabah"
      ? "Sasaran munasabah untuk situasi anda. Kuncinya konsisten - ikut sesi, jangan kejar laju pada hari mudah."
      : penilaian === "mencabar"
        ? "Boleh, tapi ketat - hampir tiada ruang untuk minggu terlepas, sakit atau cedera."
        : `5K bawah ${TARGET_MINUTES} minit dalam ${bulan} bulan tak realistik bagi situasi anda. ${b ? `Pilih ${b} bulan.` : `Sasarkan bawah ${masa5k! - Math.floor((6 * 4 - 1) * KADAR_BIASA)} minit dulu, kemudian ulang pelan.`
        }`;
  return { penilaian, ringkas, butiran };
}

/** "7:30" dari saat sekilometer. */
export function formatPace(saat: number): string {
  const s = Math.round(saat);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function buildPlan(input: PlanInput): PlanResult {
  const { bulan, tahap, hari, masa5k, nadi } = input;
  if (!(PLAN_MONTHS as readonly number[]).includes(bulan)) return { ok: false, sebab: "Pilih tempoh 2, 3, 4 atau 6 bulan." };
  if (!(DAYS_PER_WEEK as readonly number[]).includes(hari)) return { ok: false, sebab: "Pilih 3 atau 4 hari seminggu." };
  if (!(tahap in LEVELS)) return { ok: false, sebab: "Pilih tahap sekarang." };

  const jumlahMinggu = bulan * 4;
  const amaran: string[] = [];
  let paceMudah = "";

  const adaMasa = tahap === "5k" || (tahap === "jalan" && masa5k !== undefined);
  if (adaMasa) {
    if (!Number.isInteger(masa5k) || masa5k! < TIME_MIN || masa5k! > TIME_MAX)
      return { ok: false, sebab: `Masukkan masa 5K sekarang dalam minit (${TIME_MIN}-${TIME_MAX}).` };
    if (masa5k! <= TARGET_MINUTES)
      return { ok: false, sebab: "Anda dah lari 5K dalam 30 minit atau kurang - tahniah! Pelan ini untuk yang belum sampai ke situ." };
  }
  // Pace 5K sekarang (s/km) - asas pace peribadi. Tiada = pace sasaran tetap + ikut rasa.
  const p0 = adaMasa ? (masa5k! * 60) / 5 : undefined;
  if (tahap !== "5k" && jumlahMinggu < MIN_WEEKS[tahap]) {
    const b = bulanUntuk(MIN_WEEKS[tahap])!;
    return {
      ok: false,
      sebab: `${bulan} bulan terlalu singkat untuk 5K bawah 30 minit dari tahap ini - cukup untuk habiskan 5K, tapi bukan dalam 30 minit. Cadangan: ${b} bulan atau lebih.`,
      cadanganBulan: b,
    };
  }
  const perlu = weeksNeeded(tahap, adaMasa ? masa5k : undefined);
  if (jumlahMinggu < perlu) {
    const b = bulanUntuk(perlu);
    amaran.push(
      b
        ? `Dari ${masa5k ? `${masa5k} minit` : "tahap ini"}, ${bulan} bulan memang mencabar. Cadangan: ${b} bulan.`
        : `Dari ${masa5k} minit, 6 bulan pun mencabar. Sasarkan 5K bawah ${masa5k! - 16} minit dulu, kemudian ulang pelan.`,
    );
  }
  // Pace mudah dari pace 5K sekarang + 75-105 s/km (perbualan selesa).
  if (p0 && tahap === "5k") paceMudah = ` · ~${formatPace(p0 + 75)}-${formatPace(p0 + 105)}/km`;

  const USAHA_MUDAH = nadi
    ? `Nadi ${nadi.bawah}-${nadi.maf}, jangan lebih ${nadi.maf} - kalau terlebih, perlahankan atau jalan${paceMudah}`
    : `Mudah - boleh bercakap ayat penuh${paceMudah}`;
  const { bina, asas: mAsas, dayaTahan: mDaya } = phaseWeeks(tahap, jumlahMinggu);
  const puncak = MINIT_PUNCAK * hari;
  // Sesi kualiti = minggu Kelajuan bukan ringan. Pace sasaran minggu ke-k turun beransur dari
  // pace sekarang ke 6:00/km pada sesi kualiti terakhir.
  const bilKualiti = phaseWeeks(tahap, jumlahMinggu).kualiti;
  const paceMinggu = (k: number) => (p0 ? p0 + ((PACE_SASARAN - p0) * (k + 1)) / bilKualiti : PACE_SASARAN);

  const mudah = (minit: number, tambah = ""): Session => ({
    jenis: "mudah",
    minit,
    tajuk: "Lari mudah",
    arahan: `Lari ${minit} min pada rentak santai.${tambah}`,
    usaha: USAHA_MUDAH,
    segmen: [segment("lari", minit), ...(tambah ? strides(tambah.includes("6 ×") ? 6 : 4) : [])],
  });
  const panjang = (minit: number): Session => ({
    jenis: "panjang",
    minit,
    tajuk: "Larian panjang",
    arahan: `Lari ${minit} min tanpa henti, lebih perlahan daripada biasa. Boleh jalan sekejap untuk minum.`,
    usaha: USAHA_MUDAH,
    segmen: [segment("lari", minit)],
  });
  const mudahLaju = (minit: number): Session => ({
    ...mudah(minit, " Akhiri dengan 6 × 20 saat langkah laju (rehat jalan 40 saat) - laju tapi santai, bukan pecut."),
    tajuk: "Lari mudah + langkah laju",
  });
  // Larian panjang + sesi mudah yang berbeza panjang (bukan 27/27/36), jumlah = beban.
  // `laju`: sesi mudah kedua dapat langkah laju (fasa Daya tahan - sedia kaki untuk Kelajuan).
  const BERAT_MUDAH = [1, 0.8, 0.9];
  const mudahDanPanjang = (beban: number, bil: number, depan: Session[] = [], laju = false): Session[] => {
    const baki = beban - depan.reduce((a, s) => a + s.minit, 0);
    const berat = BERAT_MUDAH.slice(0, bil - 1);
    const jumlahBerat = berat.reduce((a, b) => a + b, 0) + 1.4;
    const ms = berat.map((b) => Math.round((baki * b) / jumlahBerat));
    const sesiMudah = ms.map((m, i) => (laju && i === 1 ? mudahLaju(m) : mudah(m)));
    return [...depan, ...sesiMudah, panjang(baki - ms.reduce((a, b) => a + b, 0))];
  };

  const minggu: Week[] = [];
  let beban = MINIT_MULA[tahap] * hari;
  let langkah = tahap === "5k" ? 0 : LANGKAH_MULA[tahap];
  let kualiti = 0;

  for (let w = 0; w < bina; w++) {
    const ringan = w % 4 === 3;
    if (w > 0 && !ringan) beban = Math.min(Math.max(turun5(beban * LONJAKAN), beban), puncak);
    const minit = ringan ? turun5(beban * RINGAN) : beban;
    const fasa: Phase = w < mAsas ? "Asas" : w < mAsas + mDaya ? "Daya tahan" : "Kelajuan";
    let sesi: Session[];

    if (fasa === "Asas") {
      // Minggu ringan tidak naik langkah. Bila langkah naik, sesi pertama ulang langkah minggu
      // lalu (kukuhkan dahulu), sesi selebihnya cuba langkah baru; sesi hujung minggu paling panjang.
      const lalu = langkah;
      if (!ringan && w > 0) {
        const akhir = LANGKAH.length - 1;
        const mula = LANGKAH_MULA[tahap as Exclude<Level, "5k">];
        langkah = mAsas > 1 ? Math.round(mula + ((akhir - mula) * w) / (mAsas - 1)) : akhir;
      }
      const per = Math.round(minit / (hari + 0.2));
      sesi = Array.from({ length: hari }, (_, i) =>
        jalanLari(i === hari - 1 ? minit - per * (hari - 1) : per, LANGKAH[i === 0 ? lalu : langkah], USAHA_MUDAH),
      );
    } else if (fasa === "Kelajuan" && !ringan) {
      const k = kualiti++;
      const sasaran = paceMinggu(k);
      const q =
        k % 2 === 0
          ? interval(Math.min(8, 4 + Math.floor(k / 2)), sasaran - 15, !!p0)
          : tempo(Math.min(20, 10 + 2 * Math.floor(k / 2)), sasaran + 10, !!p0);
      sesi = mudahDanPanjang(minit, hari - 1, [q]);
    } else {
      sesi = mudahDanPanjang(minit, hari, [], fasa === "Daya tahan" && !ringan);
    }
    minggu.push({ no: w + 1, fasa, ringan, minit, sesi });
  }

  const ujian: Session = {
    jenis: "ujian",
    minit: 45,
    tajuk: "Hari ujian 5K",
    arahan: "Panas badan jalan + lari santai 10 min. Lari 5 km - mula terkawal, km pertama jangan laju. Sejuk badan 5 min.",
    usaha: `Sasaran ${formatPace((TARGET_MINUTES * 60) / 5)}/km rata = bawah 30 minit`,
  };
  const minitAkhir = Math.max(turun5(beban * 0.6), 45 + 20 * (hari - 1));
  const m = Math.round((minitAkhir - 45) / (hari - 1));
  minggu.push({
    no: jumlahMinggu,
    fasa: "Ujian",
    ringan: true,
    minit: minitAkhir,
    sesi: [
      ...Array.from({ length: hari - 1 }, (_, i) =>
        mudah(i === hari - 2 ? minitAkhir - 45 - m * (hari - 2) : m, i === 0 ? " Akhiri dengan 4 × 20 saat langkah laju." : ""),
      ),
      ujian,
    ],
  });

  // MAF: interval/tempo memang melebihi had - katakan supaya pelari tidak risau.
  if (nadi)
    for (const w of minggu)
      for (const s of w.sesi)
        if (s.jenis === "interval" || s.jenis === "tempo") s.usaha += ` · Nadi melebihi ${nadi.maf} - normal untuk sesi ini saja.`;

  return { ok: true, minggu, amaran };
}

function jalanLari(minit: number, [lari, jalan]: [number, number], usaha: string): Session {
  const teras = minit - 10; // 5 min panas + 5 min sejuk badan (jalan)
  if (jalan === 0 || teras <= lari) {
    const l = Math.min(lari, teras);
    return {
      jenis: "jalan-lari",
      minit,
      tajuk: "Lari tanpa henti",
      arahan: `Jalan 5 min. Lari ${l} min tanpa henti. Jalan ${minit - 5 - l} min.`,
      usaha,
      segmen: [segment("jalan", 5), segment("lari", l), segment("jalan", minit - 5 - l)],
    };
  }
  const ulang = Math.max(1, Math.floor(teras / (lari + jalan)));
  // Baki kitaran jadi satu lari pendek, supaya sejuk badan kekal ~5 min (bukan sampai 14).
  const baki = Math.max(0, Math.min(lari, teras - ulang * (lari + jalan)));
  return {
    jenis: "jalan-lari",
    minit,
    tajuk: "Jalan-lari",
    arahan: `Jalan 5 min. (Lari ${lari} min + jalan ${jalan} min) × ${ulang}${baki ? `, kemudian lari ${baki} min` : ""}. Jalan ${minit - 5 - ulang * (lari + jalan) - baki} min.`,
    usaha,
    segmen: [
      segment("jalan", 5),
      ...Array.from({ length: ulang }, () => [segment("lari", lari), segment("jalan", jalan)]).flat(),
      ...(baki ? [segment("lari", baki)] : []),
      segment("jalan", minit - 5 - ulang * (lari + jalan) - baki),
    ],
  };
}

// `peribadi` = pace dikira dari masa 5K pengguna (turun setiap minggu); tanpa itu = pace sasaran akhir.
function interval(ulang: number, saat: number, peribadi: boolean): Session {
  const minit = 15 + ulang * 4;
  return {
    jenis: "interval",
    minit,
    tajuk: "Interval",
    arahan: `Panas badan 10 min. ${ulang} × 400 m (atau 2 min) laju, rehat 90 saat jalan/joging antara set. Sejuk badan 5 min.`,
    segmen: [segment("lari", 10), ...repeatSegments(ulang, segment("laju", 2), segment("rehat", 1.5)), segment("jalan", 5)],
    usaha: peribadi
      ? `Laju tapi terkawal · ~${formatPace(saat)}/km minggu ini`
      : `Laju tapi terkawal · sasaran akhir ~${formatPace(PACE_SASARAN - 30)}/km. Belum mampu? Ikut rasa: sukar bercakap.`,
  };
}

function tempo(minitTempo: number, saat: number, peribadi: boolean): Session {
  return {
    jenis: "tempo",
    minit: 20 + minitTempo,
    tajuk: "Tempo",
    arahan: `Panas badan 10 min. ${minitTempo} min pada rentak tempo. Sejuk badan 10 min.`,
    segmen: [segment("lari", 10), segment("laju", minitTempo), segment("lari", 10)],
    usaha: peribadi
      ? `Sukar bercakap, tetap terkawal · ~${formatPace(saat)}/km minggu ini`
      : `Sukar bercakap, tetap terkawal · sasaran akhir ~${formatPace(PACE_SASARAN)}/km`,
  };
}

// Had pelan tanpa akaun. ponytail: had lembut sahaja - pelan dikira dalam pelayar (laman statik), jadi
// padam storan / mod inkognito memintasnya. Ini dorongan untuk daftar, bukan kawalan. Had sebenar =
// jana pelan di server (kemudian).
export const GUEST_PLAN_LIMIT = 3;

/** `kunci` = kunci pelan tanpa tarikh mula; `dahDibuat` = kunci berbeza yang pernah dibuka. */
export function canBuildPlan(kunci: string, dahDibuat: string[], logMasuk: boolean): boolean {
  return logMasuk || dahDibuat.includes(kunci) || new Set(dahDibuat).size < GUEST_PLAN_LIMIT;
}
