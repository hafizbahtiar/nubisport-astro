// Pelan yang tersimpan di pelayar (localStorage). Satu pelan = kunci
// "pelan-5k:<bulan atau Nw>-<tahap>-<masa>-<hari>[-pPace]" atau "pelan-10k|21k|42k:<minggu>-<masa>-<sasaran atau pPace>-<hari>": senarai tanda siap ("minggu.sesi") disimpan di bawahnya,
// dan kunci itu tercatat dalam CREATED_KEY (had 3 pelan tanpa akaun + senarai dashboard).
// Storan boleh tiada (mod peribadi) - setiap baca/tulis selamat.
import type { Week } from "./plan-5k";

export const CREATED_KEY = "pelan-5k:dibuat";

export const planKey = (bulan: number | string, tahap: string, masa: number | string | undefined, hari: number | string, pace?: number | string) =>
  `pelan-5k:${bulan}-${tahap}-${masa ?? ""}-${hari}${pace ? `-p${pace}` : ""}`;

export const distancePlanKey = (jarak: string, minggu: number, masa: number, sasaran: number | string | undefined, hari: number) =>
  `pelan-${jarak}:${minggu}-${masa}-${sasaran ?? ""}-${hari}`;

/** Parameter dari kunci bila rekod `#p` tiada (pelan lama). null = kunci tak dikenali. */
export function paramsFromKey(key: string): Record<string, string> | null {
  const [kind, body] = key.split(":");
  if (!kind?.startsWith("pelan-") || !body) return null;
  const [a, b, c, d, ...rest] = body.split("-");
  if (!a || !b || !d) return null;
  if (kind === "pelan-5k") {
    const pace = rest.find((x) => /^p\d+$/.test(x))?.slice(1);
    return { bulan: a, tahap: b, ...(c ? { masa: c } : {}), hari: d, ...(pace ? { pace } : {}) };
  }
  const distance = kind.slice("pelan-".length);
  if (distance === "10k" || distance === "21k" || distance === "42k")
    return { jarak: distance, minggu: a, masa: b, ...(c ? { sasaran: c } : {}), hari: d };
  return null;
}

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

/**
 * "Kemas kini pelan": tanda "<minggu>.<sesi>" ikut indeks, jadi bila struktur minggu berubah (contoh 3 -> 4
 * hari) indeks beralih dan tanda jatuh pada sesi lain. Petakan setiap tanda ke (minggu, jenis, kali ke-n jenis
 * itu dalam minggu) dan cari sesi yang sama dalam pelan baharu. Tiada padanan = tanda dibuang.
 */
export function remapProgress(siap: string[], lama: Week[], baru: Week[]): string[] {
  const peta = (minggu: Week[]) => {
    const m = new Map<string, string>(); // id -> "minggu:jenis:n"
    for (const w of minggu) {
      const kali: Record<string, number> = {};
      w.sesi.forEach((s, i) => m.set(`${w.no}.${i}`, `${w.no}:${s.jenis}:${(kali[s.jenis] = (kali[s.jenis] ?? 0) + 1)}`));
    }
    return m;
  };
  const dari = peta(lama);
  const ke = new Map([...peta(baru)].map(([id, k]) => [k, id]));
  return [...new Set(siap.map((id) => ke.get(dari.get(id) ?? "")).filter((id): id is string => !!id))];
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
