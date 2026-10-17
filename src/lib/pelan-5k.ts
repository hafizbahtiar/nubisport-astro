// Pelan "5K bawah 30 minit": fungsi tulen, dikira dalam browser.
// Semak: bun scripts/check-pelan-5k.ts

export type Tahap = "sifar" | "jalan" | "5k";
export type Fasa = "Asas" | "Daya tahan" | "Kelajuan" | "Ujian";
export type Jenis = "jalan-lari" | "mudah" | "panjang" | "interval" | "tempo" | "ujian";

export interface Sesi {
  jenis: Jenis;
  minit: number;
  tajuk: string;
  arahan: string;
  usaha: string;
}

export interface Minggu {
  no: number;
  fasa: Fasa;
  ringan: boolean;
  minit: number; // beban dirancang = jumlah minit sesi
  sesi: Sesi[];
}

export interface Input {
  bulan: number;
  tahap: Tahap;
  hari: number;
  masa5k?: number; // minit, tahap "5k" sahaja
}

export type Hasil =
  | { ok: false; sebab: string; cadanganBulan?: number }
  | { ok: true; minggu: Minggu[]; amaran: string[] };

export const BULAN = [2, 3, 4, 6] as const;
export const HARI = [3, 4] as const;
export const TAHAP: Record<Tahap, string> = {
  sifar: "Belum boleh lari 1 km tanpa henti",
  jalan: "Boleh jalan-lari 5 km",
  "5k": "Boleh lari 5 km tanpa henti",
};
export const SASARAN_MINIT = 30;
export const MASA_MIN = 15;
export const MASA_MAX = 60;

// Anggaran kasar (dilabel di page), bukan hasil kajian:
// - minggu paling sedikit sebelum 5K bawah 30 minit munasabah dari tahap itu
export const MINGGU_MIN: Record<Exclude<Tahap, "5k">, number> = { sifar: 16, jalan: 12 };
// - tahap "5k": kira-kira 1.5 minggu latihan bagi setiap minit yang hendak dipotong
export const MINGGU_SETIAP_MINIT = 1.5;

const LONJAKAN = 1.1; // beban minggu bina naik paling banyak 10%
const RINGAN = 0.75; // setiap minggu ke-4: -25%
const MINIT_MULA: Record<Tahap, number> = { sifar: 20, jalan: 25, "5k": 30 }; // satu sesi
const MINIT_PUNCAK = 50; // satu sesi
const NISBAH_FASA: Record<Tahap, [asas: number, dayaTahan: number]> = {
  sifar: [0.5, 0.25],
  jalan: [0.3, 0.35],
  "5k": [0, 0.4],
};
// [lari, jalan] minit; tahap "jalan" mula di langkah 4
const LANGKAH: [number, number][] = [
  [1, 2], [2, 2], [3, 2], [5, 2], [8, 2], [10, 1], [15, 1], [20, 1], [30, 0],
];
const LANGKAH_MULA: Record<Exclude<Tahap, "5k">, number> = { sifar: 0, jalan: 4 };

// Hari sesi, kiraan dari Isnin (0 = Isnin ... 6 = Ahad). Sesi akhir (larian panjang / ujian)
// jatuh hujung minggu, dan tiada dua sesi berturut-turut.
export const NAMA_HARI = ["Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu", "Ahad"];
export const HARI_SESI: Record<number, number[]> = { 3: [0, 2, 5], 4: [0, 2, 4, 6] };

/** Isnin pada atau selepas `d` - pelan bermula Isnin supaya hari sesi kekal sama setiap minggu. */
export function isninMula(d: Date): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + ((8 - r.getDay()) % 7));
  return r;
}

/** Tarikh sesi ke-`sesi` (dari 0) dalam minggu ke-`minggu` (dari 1). */
export function tarikhSesi(isnin: Date, minggu: number, hari: number, sesi: number): Date {
  const r = new Date(isnin);
  r.setDate(r.getDate() + (minggu - 1) * 7 + HARI_SESI[hari][sesi]);
  return r;
}

const turun5 = (n: number) => Math.floor(n / 5) * 5;
const bulanUntuk = (minggu: number) => BULAN.find((b) => b * 4 >= minggu);

/** "7:30" dari saat sekilometer. */
export function pace(saat: number): string {
  const s = Math.round(saat);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function buatPelan(input: Input): Hasil {
  const { bulan, tahap, hari, masa5k } = input;
  if (!(BULAN as readonly number[]).includes(bulan)) return { ok: false, sebab: "Pilih tempoh 2, 3, 4 atau 6 bulan." };
  if (!(HARI as readonly number[]).includes(hari)) return { ok: false, sebab: "Pilih 3 atau 4 hari seminggu." };
  if (!(tahap in TAHAP)) return { ok: false, sebab: "Pilih tahap sekarang." };

  const jumlahMinggu = bulan * 4;
  const amaran: string[] = [];
  let paceMudah = "";

  if (tahap === "5k") {
    if (!Number.isInteger(masa5k) || masa5k! < MASA_MIN || masa5k! > MASA_MAX)
      return { ok: false, sebab: `Masukkan masa 5K sekarang dalam minit (${MASA_MIN}-${MASA_MAX}).` };
    if (masa5k! <= SASARAN_MINIT)
      return { ok: false, sebab: "Anda dah lari 5K dalam 30 minit atau kurang - tahniah! Pelan ini untuk yang belum sampai ke situ." };
    const perlu = Math.ceil((masa5k! - SASARAN_MINIT) * MINGGU_SETIAP_MINIT);
    if (jumlahMinggu < perlu) {
      const b = bulanUntuk(perlu);
      amaran.push(
        b
          ? `Dari ${masa5k} minit, ${bulan} bulan adalah sasaran yang mencabar. Cadangan: ${b} bulan.`
          : `Dari ${masa5k} minit, 6 bulan pun mencabar. Sasarkan 5K bawah ${masa5k! - 6} minit dulu, kemudian ulang pelan.`,
      );
    }
    const s = (masa5k! * 60) / 5;
    paceMudah = ` · ~${pace(s + 75)}-${pace(s + 105)}/km`;
  } else if (jumlahMinggu < MINGGU_MIN[tahap]) {
    const b = bulanUntuk(MINGGU_MIN[tahap])!;
    return {
      ok: false,
      sebab: `${bulan} bulan terlalu singkat untuk 5K bawah 30 minit dari tahap ini - cukup untuk habiskan 5K, tapi bukan dalam 30 minit. Cadangan: ${b} bulan atau lebih.`,
      cadanganBulan: b,
    };
  }

  const USAHA_MUDAH = `Mudah - boleh bercakap ayat penuh${paceMudah}`;
  const bina = jumlahMinggu - 1; // minggu akhir = ujian
  const [rAsas, rDaya] = NISBAH_FASA[tahap];
  const mAsas = Math.round(bina * rAsas);
  const mDaya = Math.round(bina * rDaya);
  const puncak = MINIT_PUNCAK * hari;

  const mudah = (minit: number, tambah = ""): Sesi => ({
    jenis: "mudah",
    minit,
    tajuk: "Lari mudah",
    arahan: `Lari ${minit} min pada rentak santai.${tambah}`,
    usaha: USAHA_MUDAH,
  });
  const panjang = (minit: number): Sesi => ({
    jenis: "panjang",
    minit,
    tajuk: "Larian panjang",
    arahan: `Lari ${minit} min tanpa henti, lebih perlahan dari biasa. Boleh jalan sekejap untuk minum.`,
    usaha: USAHA_MUDAH,
  });
  // Satu larian panjang + selebihnya mudah, jumlah = beban.
  const mudahDanPanjang = (beban: number, bil: number, depan: Sesi[] = []): Sesi[] => {
    const baki = beban - depan.reduce((a, s) => a + s.minit, 0);
    const p = Math.round((baki * 1.4) / (bil - 1 + 1.4));
    const m = Math.round((baki - p) / (bil - 1));
    return [...depan, ...Array.from({ length: bil - 1 }, () => mudah(m)), panjang(baki - m * (bil - 1))];
  };

  const minggu: Minggu[] = [];
  let beban = MINIT_MULA[tahap] * hari;
  let langkah = tahap === "5k" ? 0 : LANGKAH_MULA[tahap];
  let kualiti = 0;

  for (let w = 0; w < bina; w++) {
    const ringan = w % 4 === 3;
    if (w > 0 && !ringan) beban = Math.min(Math.max(turun5(beban * LONJAKAN), beban), puncak);
    const minit = ringan ? turun5(beban * RINGAN) : beban;
    const fasa: Fasa = w < mAsas ? "Asas" : w < mAsas + mDaya ? "Daya tahan" : "Kelajuan";
    let sesi: Sesi[];

    if (fasa === "Asas") {
      // Minggu ringan tidak naik langkah.
      if (!ringan && w > 0) {
        const akhir = LANGKAH.length - 1;
        const mula = LANGKAH_MULA[tahap as Exclude<Tahap, "5k">];
        langkah = mAsas > 1 ? Math.round(mula + ((akhir - mula) * w) / (mAsas - 1)) : akhir;
      }
      const per = Math.round(minit / hari);
      sesi = Array.from({ length: hari }, (_, i) =>
        jalanLari(i === hari - 1 ? minit - per * (hari - 1) : per, LANGKAH[langkah], USAHA_MUDAH),
      );
    } else if (fasa === "Kelajuan" && !ringan) {
      const k = kualiti++;
      const q = k % 2 === 0 ? interval(Math.min(8, 4 + Math.floor(k / 2))) : tempo(Math.min(20, 10 + 2 * Math.floor(k / 2)));
      sesi = mudahDanPanjang(minit, hari - 1, [q]);
    } else {
      sesi = mudahDanPanjang(minit, hari);
    }
    minggu.push({ no: w + 1, fasa, ringan, minit, sesi });
  }

  const ujian: Sesi = {
    jenis: "ujian",
    minit: 45,
    tajuk: "Hari ujian 5K",
    arahan: "Panas badan jalan + lari santai 10 min. Lari 5 km - mula terkawal, km pertama jangan laju. Sejuk badan 5 min.",
    usaha: `Sasaran ${pace((SASARAN_MINIT * 60) / 5)}/km rata = bawah 30 minit`,
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

  return { ok: true, minggu, amaran };
}

function jalanLari(minit: number, [lari, jalan]: [number, number], usaha: string): Sesi {
  const teras = minit - 10; // 5 min panas + 5 min sejuk badan (jalan)
  if (jalan === 0 || teras <= lari) {
    const l = Math.min(lari, teras);
    return {
      jenis: "jalan-lari",
      minit,
      tajuk: "Lari tanpa henti",
      arahan: `Jalan 5 min. Lari ${l} min tanpa henti. Jalan ${minit - 5 - l} min.`,
      usaha,
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
  };
}

function interval(ulang: number): Sesi {
  const minit = 15 + ulang * 4;
  return {
    jenis: "interval",
    minit,
    tajuk: "Interval",
    arahan: `Panas badan 10 min. ${ulang} × 400 m (atau 2 min) laju, rehat 90 saat jalan/joging antara set. Sejuk badan 5 min.`,
    usaha: `Laju tapi terkawal · ~${pace(330)}/km. Belum mampu? Ikut rasa: sukar bercakap.`,
  };
}

function tempo(minitTempo: number): Sesi {
  return {
    jenis: "tempo",
    minit: 20 + minitTempo,
    tajuk: "Tempo",
    arahan: `Panas badan 10 min. ${minitTempo} min pada pace sasaran. Sejuk badan 10 min.`,
    usaha: `Sukar bercakap, tetap terkawal · ~${pace(360)}/km`,
  };
}

// Had pelan tanpa akaun. ponytail: had lembut sahaja - pelan dikira dalam pelayar (laman statik), jadi
// padam storan / mod inkognito memintasnya. Ini dorongan untuk daftar, bukan kawalan. Had sebenar =
// jana pelan di server (kemudian).
export const HAD_TANPA_AKAUN = 3;

/** `kunci` = kunci pelan tanpa tarikh mula; `dahDibuat` = kunci berbeza yang pernah dibuka. */
export function bolehBuatPelan(kunci: string, dahDibuat: string[], logMasuk: boolean): boolean {
  return logMasuk || dahDibuat.includes(kunci) || new Set(dahDibuat).size < HAD_TANPA_AKAUN;
}
