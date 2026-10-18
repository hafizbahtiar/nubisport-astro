// Simpan awan: pelan akaun di backend (`/me/apps/nubi/plan`, migration 029 di hono-workers).
// Pelayar kekal salinan kerja (luar talian berfungsi); awan = salinan yang ikut akaun ke peranti lain.
// Had slot datang dari backend (`limit`) - langganan nanti hanya menaikkannya di sana.
//
// Segerak: pelan di awan -> setiap tanda siap dihantar (dikumpul 1.5 s). Gagal (luar talian) =
// kunci ditanda "tertunda"; bila dibuka semula, salinan pelayar dihantar dulu. Selain itu awan menang
// (peranti lain mungkin dah tanda sesi).
import { api, json } from "./api";
import { ikon } from "./ikon";
import {
  baca,
  bacaParam,
  simpan,
  simpanParam,
  KUNCI_DIBUAT,
} from "./pelan-tersimpan";

/** Naikkan bila enjin pelan berubah sehingga sesi lama mungkin tak sama (lib/pelan-*.ts). */
export const VERSI_ENJIN = 2;

export interface PelanAwan {
  key: string;
  engine: number;
  data: Record<string, string>;
  progress: string[];
  updatedAt: string;
}
export interface Awan {
  limit: number;
  items: PelanAwan[];
}

const LALUAN = "/me/apps/nubi/plan";
const TERTUNDA = "awan:tertunda";
const k = (kunci: string) => `${LALUAN}/${encodeURIComponent(kunci)}`;

let awan: Promise<Awan | null> | null = null;
/** Senarai awan (satu permintaan setiap page). null = tiada sambungan / tak log masuk. */
export const senaraiAwan = () =>
(awan ??= api(LALUAN)
  .then(async (r) => (r.ok ? ((await json(r)).data as Awan) : null))
  .catch(() => null));

const tandaTertunda = (kunci: string, ya: boolean) => {
  const s = new Set(baca(TERTUNDA));
  ya ? s.add(kunci) : s.delete(kunci);
  simpan(TERTUNDA, [...s]);
};

async function hantar(kunci: string, ganti?: string): Promise<Response> {
  return api(
    `${k(kunci)}${ganti ? `?replace=${encodeURIComponent(ganti)}` : ""}`,
    {
      method: "PUT",
      body: JSON.stringify({
        engine: VERSI_ENJIN,
        data: bacaParam(kunci) ?? {},
        progress: baca(kunci),
      }),
    },
  );
}

/** Simpan pelan ke awan. `ganti` = pelan awan yang dikeluarkan untuk memberi slot. */
export async function simpanAwan(
  kunci: string,
  ganti?: string,
): Promise<"ok" | "penuh" | "ralat"> {
  try {
    const r = await hantar(kunci, ganti);
    awan = null;
    if (r.ok) return (tandaTertunda(kunci, false), "ok");
    return r.status === 409 ? "penuh" : "ralat";
  } catch {
    return "ralat";
  }
}

/** Keluarkan dari awan - pelan kekal dalam pelayar ini. */
export async function keluarAwan(kunci: string): Promise<boolean> {
  try {
    const r = await api(k(kunci), { method: "DELETE" });
    awan = null;
    tandaTertunda(kunci, false);
    return r.ok;
  } catch {
    return false;
  }
}

const pemasa = new Map<string, ReturnType<typeof setTimeout>>();
/** Tanda siap berubah pada pelan di awan: hantar (dikumpul). */
export function segerakSiap(kunci: string) {
  tandaTertunda(kunci, true);
  clearTimeout(pemasa.get(kunci));
  pemasa.set(
    kunci,
    setTimeout(() => {
      hantar(kunci)
        .then((r) => r.ok && tandaTertunda(kunci, false))
        .catch(() => { });
    }, 1500),
  );
}

/**
 * Gabung awan ke pelayar ini: pelan awan yang belum ada di sini ditambah (peranti baru), tanda
 * siap diambil dari awan kecuali ada perubahan tertunda di sini (yang itu dihantar).
 */
export async function tarikAwan(): Promise<Awan | null> {
  const a = await senaraiAwan();
  if (!a) return null;
  const dibuat = baca(KUNCI_DIBUAT);
  const tertunda = new Set(baca(TERTUNDA));
  for (const p of a.items) {
    if (!dibuat.includes(p.key)) dibuat.push(p.key);
    if (!bacaParam(p.key)) simpanParam(p.key, p.data);
    if (tertunda.has(p.key))
      void hantar(p.key).then((r) => r.ok && tandaTertunda(p.key, false));
    else simpan(p.key, p.progress);
  }
  simpan(KUNCI_DIBUAT, dibuat);
  return a;
}

/** Lencana status storan (global.css `.lencana`). */
export const lencana = (diAwan: boolean) =>
  diAwan
    ? `<span class="lencana lencana-awan">${ikon("awan")}Awan</span>`
    : `<span class="lencana">${ikon("peranti")}Peranti ini</span>`;

/**
 * Kotak awan di page pelan (versi akaun): lencana + butang simpan, dan segerak tanda siap.
 * `kemas` = lukis semula kotak semak dari `siap` (awan mungkin ada tanda dari peranti lain).
 * Pulang fungsi yang page panggil selepas setiap tanda siap berubah.
 */
export function kotakAwan(
  slot: HTMLElement,
  kunci: string,
  siap: Set<string>,
  kemas: () => void,
) {
  let diAwan = false;
  const lukis = (a: Awan) => {
    const guna = a.items.length;
    diAwan = a.items.some((p) => p.key === kunci);
    slot.innerHTML = diAwan
      ? `${lencana(true)} <span class="muted">Disegerak ke akaun anda (${guna}/${a.limit}).</span>
         <a class="link" href="/account#awan">Urus awan</a>`
      : `${lencana(false)} ${guna < a.limit
        ? `<button class="btn btn-outline btn-sm" type="button" data-simpan-awan>Simpan ke awan (${guna}/${a.limit})</button>`
        : `<span class="muted">Awan penuh (${guna}/${a.limit}).</span> <a class="link" href="/account#awan">Tukar pelan di awan</a>`
      }`;
    slot
      .querySelector<HTMLButtonElement>("[data-simpan-awan]")
      ?.addEventListener("click", async (e) => {
        const b = e.currentTarget as HTMLButtonElement;
        b.disabled = true;
        const r = await simpanAwan(kunci);
        if (r === "ralat") {
          b.disabled = false;
          b.textContent = "Gagal - cuba lagi";
          return;
        }
        const baru = await senaraiAwan();
        if (baru) lukis(baru);
      });
  };
  void senaraiAwan().then((a) => {
    if (!a) return;
    const p = a.items.find((i) => i.key === kunci);
    if (p) {
      const ubahParam =
        JSON.stringify(p.data) !== JSON.stringify(bacaParam(kunci) ?? {});
      if (
        ubahParam ||
        baca(TERTUNDA).includes(kunci) ||
        p.engine !== VERSI_ENJIN
      )
        segerakSiap(kunci);
      else {
        siap.clear();
        p.progress.forEach((x) => siap.add(x));
        simpan(kunci, p.progress);
        kemas();
      }
    }
    lukis(a);
  });
  return () => {
    if (diAwan) segerakSiap(kunci);
  };
}
