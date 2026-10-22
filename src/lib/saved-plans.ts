// Pelan yang tersimpan di pelayar (localStorage). Satu pelan = kunci
// "pelan-5k:<bulan atau Nw>-<tahap>-<masa>-<hari>" atau "pelan-10k|21k:<minggu>-<masa>-<sasaran atau pPace>-<hari>": senarai tanda siap ("minggu.sesi") disimpan di bawahnya,
// dan kunci itu tercatat dalam CREATED_KEY (had 3 pelan tanpa akaun + senarai dashboard).
// Storan boleh tiada (mod peribadi) - setiap baca/tulis selamat.

export const CREATED_KEY = "pelan-5k:dibuat";

export const planKey = (bulan: number | string, tahap: string, masa: number | string | undefined, hari: number | string) =>
  `pelan-5k:${bulan}-${tahap}-${masa ?? ""}-${hari}`;

export const distancePlanKey = (jarak: string, minggu: number, masa: number, sasaran: number | string | undefined, hari: number) =>
  `pelan-${jarak}:${minggu}-${masa}-${sasaran ?? ""}-${hari}`;

export function readList(k: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(k) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function writeList(k: string, v: string[]) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* mod peribadi: tidak disimpan */
  }
}

// Parameter URL pelan (tarikh mula, MAF...) disimpan di "<kunci>#p" supaya dashboard dan awan
// buka semula pelan yang sama, bukan hanya input dalam kunci.
const PARAM = /^(bulan|tahap|hari|masa|mula|maf|umur|keadaan|jarak|minggu|sasaran|lumba|pace)$/;
export const planParams = (q: URLSearchParams): Record<string, string> =>
  Object.fromEntries([...q].filter(([k, v]) => PARAM.test(k) && v && v.length <= 100));

export function readParams(kunci: string): Record<string, string> | null {
  try {
    const v = JSON.parse(localStorage.getItem(`${kunci}#p`) ?? "null");
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;
  }
}

export function writeParams(kunci: string, p: Record<string, string>) {
  try {
    localStorage.setItem(`${kunci}#p`, JSON.stringify(p));
  } catch {
    /* mod peribadi */
  }
}

/** Buang pelan, tanda siap dan parameternya (pelayar ini sahaja - awan: lib/cloud-sync.ts). */
export function deletePlan(kunci: string) {
  writeList(CREATED_KEY, readList(CREATED_KEY).filter((k) => k !== kunci));
  try {
    localStorage.removeItem(kunci);
    localStorage.removeItem(`${kunci}#p`);
  } catch {
    /* mod peribadi */
  }
}
