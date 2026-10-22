// Profil latihan (akaun): tarikh lahir, keadaan MAF, hari seminggu, masa 5K/10K/21K terkini - supaya
// borang MAF dan pelan terisi sendiri. Disimpan sebagai app_items `profil` (satu rekod "saya",
// /me/apps/nubi/profil) - bukan jadual baru: data milik seorang pengguna (IDEA.md). Hanya pemilik
// akaun yang boleh baca. URL sentiasa menang (pautan kongsi / pelan seterusnya).
// Semak: bun scripts/check-profile.ts
import { api, json } from "./api";
import { todayMY } from "./date";

export interface TrainingProfile {
  lahir?: string; // YYYY-MM-DD
  keadaan?: string; // kunci CONDITIONS (lib/maf.ts)
  hari?: string;
  masa5k?: string; // minit
  masa10k?: string;
  masa21k?: string;
}

const LALUAN = "/me/apps/nubi/profil";

let profil: Promise<TrainingProfile> | null = null;
/** Profil akaun ({} jika belum diisi, tiada sambungan atau tidak log masuk). */
export const readProfile = () =>
(profil ??= api(LALUAN)
  .then(async (r) => (r.ok ? ((await json(r)).data?.items?.[0]?.data ?? {}) : {}))
  .catch(() => ({})));

export async function saveProfile(p: TrainingProfile): Promise<boolean> {
  const data = Object.fromEntries(Object.entries(p).filter(([, v]) => v));
  try {
    const r = await api(`${LALUAN}/saya`, {
      method: "PUT",
      body: JSON.stringify({ engine: 1, data, progress: [] }),
    });
    profil = null;
    return r.ok;
  } catch {
    return false;
  }
}

/** Medan dari `isi` yang masih kosong dalam profil `p` (nilai sedia ada tak pernah ditulis ganti). */
export const emptyOnly = (p: TrainingProfile, isi: TrainingProfile): TrainingProfile =>
  Object.fromEntries(Object.entries(isi).filter(([k, v]) => v && !p[k as keyof TrainingProfile]));

/**
 * Isi profil kali pertama dari borang pelan: tambah medan yang kosong saja. Profil dibaca terus (bukan
 * readProfile, yang pulang {} bila gagal) - gagal baca = tak tulis apa-apa, supaya profil tak terpadam.
 * Pulang kunci yang disimpan.
 */
export async function fillEmptyProfile(isi: TrainingProfile): Promise<string[]> {
  const r = await api(LALUAN).catch(() => null);
  if (!r?.ok) return [];
  const p: TrainingProfile = (await json(r)).data?.items?.[0]?.data ?? {};
  const baru = emptyOnly(p, isi);
  const k = Object.keys(baru);
  return k.length && (await saveProfile({ ...p, ...baru })) ? k : [];
}

/** Umur penuh (tahun) pada `hariIni` dari tarikh lahir "YYYY-MM-DD"; null jika tidak sah. */
export function ageOn(lahir: string, hariIni = todayMY()): number | null {
  const l = /^(\d{4})-(\d{2})-(\d{2})$/.exec(lahir);
  const h = /^(\d{4})-(\d{2})-(\d{2})$/.exec(hariIni);
  if (!l || !h || lahir > hariIni) return null;
  const belumHariJadi = h[2] + h[3] < l[2] + l[3];
  return Number(h[1]) - Number(l[1]) - (belumHariJadi ? 1 : 0);
}

/**
 * Isi borang dari profil: umur, keadaan, hari, masa (`masa` pilih 5K atau 10K). Medan yang ada
 * dalam URL tidak disentuh. Tidak menunggu - borang sudah boleh diguna sebelum profil tiba.
 */
export async function prefillForm(borang: HTMLFormElement, q: URLSearchParams, masa: (p: TrainingProfile) => string | undefined) {
  const p = await readProfile();
  const u = p.lahir ? ageOn(p.lahir) : null;
  const nilai: Record<string, string | undefined> = {
    umur: u === null ? undefined : String(u),
    keadaan: p.keadaan,
    hari: p.hari,
    masa: masa(p),
  };
  for (const [k, v] of Object.entries(nilai)) {
    const el = borang.elements.namedItem(k);
    if (!v || q.has(k) || !el) continue;
    if (el instanceof RadioNodeList) el.value = v;
    else if (el instanceof HTMLInputElement && !el.value) el.value = v;
    else continue;
    (el instanceof RadioNodeList ? el[0] : el)?.dispatchEvent(new Event("change", { bubbles: true }));
  }
}
