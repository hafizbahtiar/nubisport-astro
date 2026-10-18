// Pelan "5K bawah 30 minit": fungsi tulen, dikira dalam browser.
// Semak: bun scripts/check-pelan-5k.ts

export type Tahap = "sifar" | "jalan" | "5k";
export type Fasa = "Asas" | "Daya tahan" | "Kelajuan" | "Tirus" | "Ujian";
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
  masa5k?: number; // minit - wajib untuk tahap "5k", pilihan untuk "jalan" (masa jalan-lari 5K)
  nadi?: { maf: number; bawah: number }; // pilihan "ikut nadi" - dari kiraMaf (src/lib/maf.ts)
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
// [lari, jalan] minit; tahap "jalan" mula di langkah 4. 20 -> 25 -> 30 min (NHS Couch to 5K naik
// 20 -> 25 -> 28 -> 30), bukan terus 20 -> 30. docs/semakan-latihan.md
const LANGKAH: [number, number][] = [
  [1, 2], [2, 2], [3, 2], [5, 2], [8, 2], [10, 1], [15, 1], [20, 1], [25, 1], [30, 0],
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
const PACE_SASARAN = (SASARAN_MINIT * 60) / 5; // 360 s/km

/** Anggaran minggu latihan sebelum 5K bawah 30 minit munasabah, ikut tahap + masa sekarang. */
export function mingguPerlu(tahap: Tahap, masa5k?: number): number {
  const ikutMasa = masa5k ? Math.ceil((masa5k - SASARAN_MINIT) * MINGGU_SETIAP_MINIT) : 0;
  return tahap === "5k" ? ikutMasa : Math.max(MINGGU_MIN[tahap], ikutMasa);
}

/** Bilangan minggu setiap fasa (minggu akhir = ujian, tidak dikira). */
export function fasaMinggu(tahap: Tahap, jumlahMinggu: number) {
  const bina = jumlahMinggu - 1;
  const [rAsas, rDaya] = NISBAH_FASA[tahap];
  const asas = Math.round(bina * rAsas);
  const dayaTahan = Math.round(bina * rDaya);
  let kualiti = 0; // minggu Kelajuan bukan ringan = satu sesi laju
  for (let w = asas + dayaTahan; w < bina; w++) if (w % 4 !== 3) kualiti++;
  return { bina, asas, dayaTahan, kelajuan: bina - asas - dayaTahan, kualiti };
}


export type Penilaian = "munasabah" | "mencabar" | "tak-realistik";
export interface Analisis {
  penilaian: Penilaian;
  ringkas: string;
  butiran: { label: string; nilai: string; nota: string }[];
}

const KADAR_BIASA = 1 / MINGGU_SETIAP_MINIT; // minit dipotong seminggu (anggaran kasar)

/** Kenapa sasaran munasabah atau tidak untuk input ini. Input mesti sudah lulus buatPelan's semakan
 *  asas (bulan/hari/tahap/masa sah) - selain itu null. */
export function analisis(input: Input): Analisis | null {
  const { bulan, tahap, hari, masa5k, nadi } = input;
  if (!(BULAN as readonly number[]).includes(bulan) || !(HARI as readonly number[]).includes(hari) || !(tahap in TAHAP)) return null;
  const adaMasa = masa5k !== undefined && tahap !== "sifar";
  if (adaMasa && (!Number.isInteger(masa5k) || masa5k < MASA_MIN || masa5k > MASA_MAX || masa5k <= SASARAN_MINIT)) return null;
  if (tahap === "5k" && !adaMasa) return null;

  const ada = bulan * 4;
  const perlu = mingguPerlu(tahap, adaMasa ? masa5k : undefined);
  const nisbah = ada / perlu;
  const penilaian: Penilaian = nisbah >= 1 ? "munasabah" : nisbah >= 0.75 ? "mencabar" : "tak-realistik";
  const f = fasaMinggu(tahap, ada);
  const butiran: Analisis["butiran"] = [];

  if (adaMasa) {
    const p0 = (masa5k * 60) / 5;
    const potong = masa5k - SASARAN_MINIT;
    butiran.push({
      label: "Jurang",
      nilai: `${masa5k} → bawah ${SASARAN_MINIT} minit`,
      nota: `Pace sekarang ~${pace(p0)}/km, sasaran ${pace(PACE_SASARAN)}/km: setiap km perlu ${Math.round(p0 - PACE_SASARAN)} saat lebih cepat (${Math.round((potong / masa5k) * 100)}% lebih laju).`,
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
      nilai: TAHAP[tahap],
      nota:
        tahap === "sifar"
          ? "Langkah pertama ialah lari tanpa henti, bukan laju. Badan perlu belajar dulu - kelajuan datang selepas itu."
          : "Tiada masa 5K, jadi anggaran ikut tahap sahaja. Masukkan masa jalan-lari 5K anda untuk anggaran lebih tepat.",
    });
  }

  butiran.push({
    label: "Masa",
    nilai: `${ada} minggu (perlu ~${perlu})`,
    nota:
      nisbah >= 1
        ? "Cukup, termasuk minggu ringan setiap minggu ke-4."
        : `Kurang ${perlu - ada} minggu dari anggaran. ${bulanUntuk(perlu) ? `${bulanUntuk(perlu)} bulan memadai.` : "Lebih dari 6 bulan - pecahkan kepada dua sasaran."}`,
  });
  butiran.push({
    label: "Pecahan pelan",
    nilai: [f.asas && `Asas ${f.asas}`, `Daya tahan ${f.dayaTahan}`, `Kelajuan ${f.kelajuan}`, "Ujian 1"].filter(Boolean).join(" · "),
    nota:
      f.kualiti >= 4
        ? `${f.kualiti} sesi laju (interval/tempo) - cukup untuk membiasakan kaki dengan pace sasaran.`
        : `Hanya ${f.kualiti} sesi laju - sedikit untuk membiasakan kaki dengan pace ${pace(PACE_SASARAN)}/km. Tempoh lebih panjang beri lebih banyak.`,
  });
  butiran.push({
    label: "Hari seminggu",
    nilai: `${hari} hari`,
    nota:
      hari === 3
        ? "Cukup untuk mula. 4 hari beri ~33% lebih masa lari jika badan izinkan."
        : "Cukup - jangan tambah lagi, rehat juga sebahagian latihan.",
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
        : `5K bawah ${SASARAN_MINIT} minit dalam ${bulan} bulan tak realistik dari situasi anda. ${b ? `Pilih ${b} bulan.` : `Sasarkan bawah ${masa5k! - Math.floor((6 * 4 - 1) * KADAR_BIASA)} minit dulu, kemudian ulang pelan.`
        }`;
  return { penilaian, ringkas, butiran };
}

/** "7:30" dari saat sekilometer. */
export function pace(saat: number): string {
  const s = Math.round(saat);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function buatPelan(input: Input): Hasil {
  const { bulan, tahap, hari, masa5k, nadi } = input;
  if (!(BULAN as readonly number[]).includes(bulan)) return { ok: false, sebab: "Pilih tempoh 2, 3, 4 atau 6 bulan." };
  if (!(HARI as readonly number[]).includes(hari)) return { ok: false, sebab: "Pilih 3 atau 4 hari seminggu." };
  if (!(tahap in TAHAP)) return { ok: false, sebab: "Pilih tahap sekarang." };

  const jumlahMinggu = bulan * 4;
  const amaran: string[] = [];
  let paceMudah = "";

  const adaMasa = tahap === "5k" || (tahap === "jalan" && masa5k !== undefined);
  if (adaMasa) {
    if (!Number.isInteger(masa5k) || masa5k! < MASA_MIN || masa5k! > MASA_MAX)
      return { ok: false, sebab: `Masukkan masa 5K sekarang dalam minit (${MASA_MIN}-${MASA_MAX}).` };
    if (masa5k! <= SASARAN_MINIT)
      return { ok: false, sebab: "Anda dah lari 5K dalam 30 minit atau kurang - tahniah! Pelan ini untuk yang belum sampai ke situ." };
  }
  // Pace 5K sekarang (s/km) - asas pace peribadi. Tiada = pace sasaran tetap + ikut rasa.
  const p0 = adaMasa ? (masa5k! * 60) / 5 : undefined;
  if (tahap !== "5k" && jumlahMinggu < MINGGU_MIN[tahap]) {
    const b = bulanUntuk(MINGGU_MIN[tahap])!;
    return {
      ok: false,
      sebab: `${bulan} bulan terlalu singkat untuk 5K bawah 30 minit dari tahap ini - cukup untuk habiskan 5K, tapi bukan dalam 30 minit. Cadangan: ${b} bulan atau lebih.`,
      cadanganBulan: b,
    };
  }
  const perlu = mingguPerlu(tahap, adaMasa ? masa5k : undefined);
  if (jumlahMinggu < perlu) {
    const b = bulanUntuk(perlu);
    amaran.push(
      b
        ? `Dari ${masa5k ? `${masa5k} minit` : "tahap ini"}, ${bulan} bulan adalah sasaran yang mencabar. Cadangan: ${b} bulan.`
        : `Dari ${masa5k} minit, 6 bulan pun mencabar. Sasarkan 5K bawah ${masa5k! - 16} minit dulu, kemudian ulang pelan.`,
    );
  }
  // Pace mudah dari pace 5K sekarang + 75-105 s/km (perbualan selesa).
  if (p0 && tahap === "5k") paceMudah = ` · ~${pace(p0 + 75)}-${pace(p0 + 105)}/km`;

  const USAHA_MUDAH = nadi
    ? `Nadi ${nadi.bawah}-${nadi.maf}, jangan lebih ${nadi.maf} - perlahankan atau jalan bila terlebih${paceMudah}`
    : `Mudah - boleh bercakap ayat penuh${paceMudah}`;
  const { bina, asas: mAsas, dayaTahan: mDaya } = fasaMinggu(tahap, jumlahMinggu);
  const puncak = MINIT_PUNCAK * hari;
  // Sesi kualiti = minggu Kelajuan bukan ringan. Pace sasaran minggu ke-k turun beransur dari
  // pace sekarang ke 6:00/km pada sesi kualiti terakhir.
  const bilKualiti = fasaMinggu(tahap, jumlahMinggu).kualiti;
  const paceMinggu = (k: number) => (p0 ? p0 + ((PACE_SASARAN - p0) * (k + 1)) / bilKualiti : PACE_SASARAN);

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
  const mudahLaju = (minit: number): Sesi => ({
    ...mudah(minit, " Akhiri dengan 6 × 20 saat langkah laju (rehat jalan 40 saat) - laju tapi santai, bukan pecut."),
    tajuk: "Lari mudah + langkah laju",
  });
  // Larian panjang + sesi mudah yang berbeza panjang (bukan 27/27/36), jumlah = beban.
  // `laju`: sesi mudah kedua dapat langkah laju (fasa Daya tahan - sedia kaki untuk Kelajuan).
  const BERAT_MUDAH = [1, 0.8, 0.9];
  const mudahDanPanjang = (beban: number, bil: number, depan: Sesi[] = [], laju = false): Sesi[] => {
    const baki = beban - depan.reduce((a, s) => a + s.minit, 0);
    const berat = BERAT_MUDAH.slice(0, bil - 1);
    const jumlahBerat = berat.reduce((a, b) => a + b, 0) + 1.4;
    const ms = berat.map((b) => Math.round((baki * b) / jumlahBerat));
    const sesiMudah = ms.map((m, i) => (laju && i === 1 ? mudahLaju(m) : mudah(m)));
    return [...depan, ...sesiMudah, panjang(baki - ms.reduce((a, b) => a + b, 0))];
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
      // Minggu ringan tidak naik langkah. Bila langkah naik, sesi pertama ulang langkah minggu
      // lalu (kukuhkan dulu), sesi selebihnya cuba langkah baru; sesi hujung minggu paling panjang.
      const lalu = langkah;
      if (!ringan && w > 0) {
        const akhir = LANGKAH.length - 1;
        const mula = LANGKAH_MULA[tahap as Exclude<Tahap, "5k">];
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

  // MAF: interval/tempo memang melebihi had - katakan supaya pelari tak risau.
  if (nadi)
    for (const w of minggu)
      for (const s of w.sesi)
        if (s.jenis === "interval" || s.jenis === "tempo") s.usaha += ` · Nadi melebihi ${nadi.maf} - normal untuk sesi ini sahaja.`;

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

// `peribadi` = pace dikira dari masa 5K pengguna (turun setiap minggu); tanpa itu = pace sasaran akhir.
function interval(ulang: number, saat: number, peribadi: boolean): Sesi {
  const minit = 15 + ulang * 4;
  return {
    jenis: "interval",
    minit,
    tajuk: "Interval",
    arahan: `Panas badan 10 min. ${ulang} × 400 m (atau 2 min) laju, rehat 90 saat jalan/joging antara set. Sejuk badan 5 min.`,
    usaha: peribadi
      ? `Laju tapi terkawal · ~${pace(saat)}/km minggu ini`
      : `Laju tapi terkawal · sasaran akhir ~${pace(PACE_SASARAN - 30)}/km. Belum mampu? Ikut rasa: sukar bercakap.`,
  };
}

function tempo(minitTempo: number, saat: number, peribadi: boolean): Sesi {
  return {
    jenis: "tempo",
    minit: 20 + minitTempo,
    tajuk: "Tempo",
    arahan: `Panas badan 10 min. ${minitTempo} min pada rentak tempo. Sejuk badan 10 min.`,
    usaha: peribadi
      ? `Sukar bercakap, tetap terkawal · ~${pace(saat)}/km minggu ini`
      : `Sukar bercakap, tetap terkawal · sasaran akhir ~${pace(PACE_SASARAN)}/km`,
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
