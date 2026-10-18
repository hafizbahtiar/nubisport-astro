// Pelan yang tersimpan di pelayar (localStorage). Satu pelan = kunci
// "pelan-5k:<bulan>-<tahap>-<masa>-<hari>" atau "pelan-10k|21k:<minggu>-<masa>-<sasaran>-<hari>": senarai tanda siap ("minggu.sesi") disimpan di bawahnya,
// dan kunci itu tercatat dalam KUNCI_DIBUAT (had 3 pelan tanpa akaun + senarai dashboard).
// Storan boleh tiada (mod peribadi) - setiap baca/tulis selamat.

export const KUNCI_DIBUAT = "pelan-5k:dibuat";

export const kunciPelan = (bulan: number | string, tahap: string, masa: number | string | undefined, hari: number | string) =>
  `pelan-5k:${bulan}-${tahap}-${masa ?? ""}-${hari}`;

export const kunciJarak = (jarak: string, minggu: number, masa: number, sasaran: number | undefined, hari: number) =>
  `pelan-${jarak}:${minggu}-${masa}-${sasaran ?? ""}-${hari}`;

export function baca(k: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(k) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function simpan(k: string, v: string[]) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* mod peribadi: tidak disimpan */
  }
}

/** Buang pelan dan tanda siapnya. */
export function padamPelan(kunci: string) {
  simpan(KUNCI_DIBUAT, baca(KUNCI_DIBUAT).filter((k) => k !== kunci));
  try {
    localStorage.removeItem(kunci);
  } catch {
    /* mod peribadi */
  }
}
