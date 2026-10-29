// Pelan yang tersimpan di pelayar (localStorage). Satu pelan = kunci
// "pelan-5k:<bulan atau Nw>-<tahap>-<masa>-<hari>[-pPace]" atau "pelan-10k|21k|42k:<minggu>-<masa>-<sasaran atau pPace>-<hari>": senarai tanda siap ("minggu.sesi") disimpan di bawahnya,
// dan kunci itu tercatat dalam CREATED_KEY (had 3 pelan tanpa akaun + senarai dashboard).
// Storan boleh tiada (mod peribadi) - setiap baca/tulis selamat.
import { paramsFromKey } from "./plan-core";

export { planKey, distancePlanKey, paramsFromKey, remapProgress, planParams } from "./plan-core";

export const CREATED_KEY = "pelan-5k:dibuat";

/**
 * Kunci untuk halaman ini: kunci dalam URL (dibuka dari dashboard) hanya dipakai kalau ia
 * pelan sedia ada dengan jenis yang sama. Selain itu pelan baharu - jadi "Buat pelan"
 * sentiasa mencipta pelan baru, "Kemas kini pelan" menulis params di bawah kunci lama.
 */
export const pickPlanKey = (dipilih: string | null, dibuat: string[], baharu: string): string => {
  const jenis = baharu.split(":")[0];
  return dipilih && dipilih.startsWith(`${jenis}:`) && dibuat.includes(dipilih) ? dipilih : baharu;
};

/**
 * URL untuk "Kemas kini pelan": kekalkan param yang bukan medan borang (contoh `pace` dari
 * borang pace), ganti medan borang (kosong = dibuang), dan bawa `kunci` pelan.
 */
export function planParamsFromForm(borang: HTMLFormElement, q: URLSearchParams, kunci: string): URLSearchParams {
  const baru = new URLSearchParams(q);
  const nama = new Set(
    [...borang.querySelectorAll<HTMLElement>("[name]")].map((e) => e.getAttribute("name")!),
  );
  for (const n of nama) baru.delete(n);
  for (const [k, v] of new FormData(borang)) baru.set(k, String(v));
  baru.set("kunci", kunci);
  return baru;
}

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

/**
 * Params pelan untuk page view: kunci mesti jenis page ini (`pelan-5k`, `pelan-10k`...) dan ada dalam
 * CREATED_KEY - kunci asing dari URL tak cipta pelan baharu. null = bukan pelan tersimpan.
 */
export const savedPlanParams = (kunci: string | null, jenis: string): Record<string, string> | null =>
  kunci?.startsWith(`${jenis}:`) && readList(CREATED_KEY).includes(kunci) ? (readParams(kunci) ?? paramsFromKey(kunci)) : null;

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
