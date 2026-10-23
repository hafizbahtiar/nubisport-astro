// Kalkulator defisit (/deficit): kalori sehari untuk turun berat dengan selamat + contoh pecahan makro.
// Dalam pelayar, tiada simpanan. Pelan + sumber penuh: docs/plans/deficit-calculator.md.
// - REE: Mifflin-St Jeor 1990 (Am J Clin Nutr 51:241), sampel umur 19-78; paling tepat antara 4
//   persamaan (Frankenfield 2005, J Am Diet Assoc 105:775), ralat individu masih besar.
// - Gaya hidup: PAL FAO/WHO/UNU 2004 (Human energy requirements, Jadual 5.3), tanpa larian.
// - Larian: persamaan ACSM lari datar, VO2 = 0.2 x m/min + 3.5; bersih (tanpa 3.5 rehat, sudah dalam
//   REE x PAL) = 200 ml O2/kg/km x 5 kcal/L = 1.0 kcal/kg/km.
// - Defisit: 7700 kcal/kg (3500 kcal/lb), dihad 25% keperluan; lantai 1,200 / 1,500 kcal (Harvard
//   Health); turun <= 1% berat seminggu (Helms et al. 2014, JISSN 11:20).
// - Makro: Atwater 4/4/9 kcal/g; protein 1.2-2.0 g/kg (AND/DC/ACSM 2016); rendah karbo < 26% tenaga
//   (Feinman et al. 2015, Nutrition 31:1).
// Semak: bun scripts/check-deficit.ts

export const LIFESTYLES = {
  duduk: { pal: 1.4, nama: "Kebanyakan duduk (pejabat, memandu)" },
  ringan: { pal: 1.55, nama: "Duduk + banyak berjalan / berdiri" },
  fizikal: { pal: 1.75, nama: "Kerja fizikal (berdiri, angkat barang)" },
  berat: { pal: 2.0, nama: "Kerja fizikal berat (buruh, ladang)" },
} as const;
export type Lifestyle = keyof typeof LIFESTYLES;

export const RATES = [0.25, 0.5, 0.75, 1] as const; // kg seminggu
export const KCAL_PER_KG = 7700;
const RUN_KCAL_PER_KG_KM = 1.0;
const MAX_DEFICIT_SHARE = 0.25;
const FLOOR = { lelaki: 1500, perempuan: 1200 } as const;
export type Sex = keyof typeof FLOOR;

/** Protein ikut g/kg atau % tenaga; karbo % (lemak = baki) atau lemak % (karbo = baki). */
interface DietTemplate {
  nama: string;
  proteinGkg?: number;
  proteinPct?: number;
  lemakPct?: number;
  karboPct?: number;
  amaran?: string;
}
export const DIET_TEMPLATES: Record<string, DietTemplate> = {
  seimbang: { nama: "Seimbang", proteinPct: 0.15, lemakPct: 0.3 },
  pelari: { nama: "Pelari", proteinGkg: 1.6, lemakPct: 0.25 },
  proteinTinggi: { nama: "Protein tinggi", proteinGkg: 2.0, lemakPct: 0.3 },
  rendahKarbo: {
    nama: "Rendah karbo",
    karboPct: 0.25,
    proteinPct: 0.25,
    amaran: "Sesi laju (interval, tempo) bergantung pada karbohidrat - jangkakan rasa lebih berat.",
  },
};

export interface DeficitInput {
  umur: number;
  jantina: string;
  tinggi: number; // cm
  berat: number; // kg
  gaya: string;
  km: number; // larian seminggu
  kgSeminggu: number;
}
export interface Macro {
  id: string;
  nama: string;
  karbo: number; // g
  protein: number;
  lemak: number;
  amaran?: string;
}
export type DeficitResult =
  | { ok: false; sebab: string }
  | {
    ok: true;
    ree: number;
    keperluan: number; // REE x PAL + larian
    larian: number; // purata sehari
    sasaran: number;
    kgSebenar: number; // kadar turun selepas had
    had: "lantai" | "25%" | null;
    makro: Macro[];
  };

const dalam = (n: number, min: number, max: number) => n >= min && n <= max;

export function calcDeficit(i: DeficitInput): DeficitResult {
  if (!(Number.isInteger(i.umur) && dalam(i.umur, 19, 78)))
    return { ok: false, sebab: "Kalkulator ini untuk umur 19-78 tahun sahaja (julat kajian formula). Rujuk doktor atau dietitian." };
  if (!Object.hasOwn(FLOOR, i.jantina)) return { ok: false, sebab: "Pilih jantina." };
  if (!dalam(i.tinggi, 130, 220)) return { ok: false, sebab: "Tinggi mesti 130-220 cm." };
  if (!dalam(i.berat, 35, 250)) return { ok: false, sebab: "Berat mesti 35-250 kg." };
  if (!Object.hasOwn(LIFESTYLES, i.gaya)) return { ok: false, sebab: "Pilih gaya hidup." };
  if (!dalam(i.km, 0, 200)) return { ok: false, sebab: "Larian seminggu mesti 0-200 km." };
  if (!(RATES as readonly number[]).includes(i.kgSeminggu)) return { ok: false, sebab: "Pilih sasaran seminggu." };
  const maks = RATES.filter((r) => r <= i.berat * 0.01).at(-1);
  if (i.kgSeminggu > i.berat * 0.01)
    return {
      ok: false,
      sebab: maks
        ? `${i.kgSeminggu} kg seminggu lebih 1% berat badan anda - terlalu laju. Pilih ${maks} kg atau kurang.`
        : "Sasaran terlalu laju untuk berat anda. Rujuk doktor atau dietitian.",
    };

  const jantina = i.jantina as Sex;
  const ree = 10 * i.berat + 6.25 * i.tinggi - 5 * i.umur + (jantina === "lelaki" ? 5 : -161);
  const larian = (RUN_KCAL_PER_KG_KM * i.berat * i.km) / 7;
  const keperluan = ree * LIFESTYLES[i.gaya as Lifestyle].pal + larian;
  const diminta = (i.kgSeminggu * KCAL_PER_KG) / 7;
  const defisit = Math.min(diminta, keperluan * MAX_DEFICIT_SHARE);
  const sasaran = Math.max(FLOOR[jantina], keperluan - defisit);
  const had = keperluan - defisit < FLOOR[jantina] ? "lantai" : defisit < diminta ? "25%" : null;
  const kgSebenar = (Math.max(0, keperluan - sasaran) * 7) / KCAL_PER_KG;

  const makro: Macro[] = [];
  for (const [id, t] of Object.entries(DIET_TEMPLATES)) {
    const protein = t.proteinGkg ? t.proteinGkg * i.berat : ((t.proteinPct ?? 0) * sasaran) / 4;
    const karbo = t.karboPct ? (t.karboPct * sasaran) / 4 : (sasaran * (1 - (t.lemakPct ?? 0)) - 4 * protein) / 4;
    const lemak = t.karboPct ? (sasaran - 4 * protein - 4 * karbo) / 9 : ((t.lemakPct ?? 0) * sasaran) / 9;
    if (karbo < 0 || lemak < 0) continue; // protein g/kg melebihi kalori - templat tak sesuai
    makro.push({ id, nama: t.nama, karbo, protein, lemak, amaran: t.amaran });
  }
  return { ok: true, ree, keperluan, larian, sasaran, kgSebenar, had, makro };
}
