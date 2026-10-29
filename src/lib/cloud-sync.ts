// Simpan awan: pelan akaun di backend (`/me/apps/nubi/plan`, migration 029 di hono-workers).
// Pelayar kekal salinan kerja (luar talian berfungsi); awan = salinan yang ikut akaun ke peranti lain.
// Had slot datang dari backend (`limit`) - langganan nanti hanya menaikkannya di sana.
//
// Segerak: pelan di awan -> setiap tanda siap dihantar (dikumpul 1.5 s). Gagal (luar talian) =
// kunci ditanda "tertunda"; bila dibuka semula, salinan pelayar dihantar dahulu. Selain itu awan menang
// (peranti lain mungkin sudah tanda sesi).
import { api, json } from "./api";
import { icon } from "./icon";
import {
  readList,
  readParams,
  writeList,
  writeParams,
  CREATED_KEY,
} from "./saved-plans";
import { ENGINE_VERSION } from "./plan-core";

export { ENGINE_VERSION } from "./plan-core";

export interface CloudPlan {
  key: string;
  engine: number;
  data: Record<string, string>;
  progress: string[];
  updatedAt: string;
}
export interface CloudList {
  limit: number;
  items: CloudPlan[];
}

const LALUAN = "/me/apps/nubi/plan";
const TERTUNDA = "awan:tertunda";
const k = (kunci: string) => `${LALUAN}/${encodeURIComponent(kunci)}`;

let awan: Promise<CloudList | null> | null = null;
/** Senarai awan (satu permintaan setiap page). null = tiada sambungan / tidak log masuk. */
export const listCloud = () =>
(awan ??= api(LALUAN)
  .then(async (r) => (r.ok ? ((await json(r)).data as CloudList) : null))
  .catch(() => null));

const tandaTertunda = (kunci: string, ya: boolean) => {
  const s = new Set(readList(TERTUNDA));
  ya ? s.add(kunci) : s.delete(kunci);
  writeList(TERTUNDA, [...s]);
};

async function hantar(kunci: string, ganti?: string): Promise<Response> {
  return api(
    `${k(kunci)}${ganti ? `?replace=${encodeURIComponent(ganti)}` : ""}`,
    {
      method: "PUT",
      body: JSON.stringify({
        engine: ENGINE_VERSION,
        data: readParams(kunci) ?? {},
        progress: readList(kunci),
      }),
    },
  );
}

/** Simpan pelan ke awan. `ganti` = pelan awan yang dikeluarkan untuk memberi slot. */
export async function saveToCloud(
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
export async function removeFromCloud(kunci: string): Promise<boolean> {
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
export function syncProgress(kunci: string) {
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
export async function pullCloud(): Promise<CloudList | null> {
  const a = await listCloud();
  if (!a) return null;
  const dibuat = readList(CREATED_KEY);
  const tertunda = new Set(readList(TERTUNDA));
  for (const p of a.items) {
    if (!dibuat.includes(p.key)) dibuat.push(p.key);
    if (!readParams(p.key)) writeParams(p.key, p.data);
    if (tertunda.has(p.key))
      void hantar(p.key).then((r) => r.ok && tandaTertunda(p.key, false));
    else writeList(p.key, p.progress);
  }
  writeList(CREATED_KEY, dibuat);
  return a;
}

/** Lencana status storan (global.css `.lencana`). */
export const storageBadge = (diAwan: boolean) =>
  diAwan
    ? `<span class="lencana lencana-awan">${icon("awan")}Awan</span>`
    : `<span class="lencana">${icon("peranti")}Peranti ini</span>`;

/**
 * Kotak awan di page pelan (versi akaun): lencana + butang simpan, dan segerak tanda siap.
 * `kemas` = lukis semula kotak semak dari `siap` (awan mungkin ada tanda dari peranti lain).
 * Pulang fungsi yang page panggil selepas setiap tanda siap berubah.
 */
export function mountCloudBox(
  slot: HTMLElement,
  kunci: string,
  siap: Set<string>,
  kemas: () => void,
) {
  let diAwan = false;
  const lukis = (a: CloudList) => {
    const guna = a.items.length;
    diAwan = a.items.some((p) => p.key === kunci);
    slot.innerHTML = diAwan
      ? `${storageBadge(true)} <span class="muted">Disegerakkan ke akaun anda (${guna}/${a.limit}).</span>
         <a class="link" href="/account#awan">Urus awan</a>`
      : `${storageBadge(false)} ${guna < a.limit
        ? `<button class="btn btn-outline btn-sm" type="button" data-simpan-awan>Simpan ke awan (${guna}/${a.limit})</button>`
        : `<span class="muted">Awan penuh (${guna}/${a.limit}).${a.limit === 1 ? " Ahli boleh simpan 5." : ""}</span> <a class="link" href="/account#awan">Tukar pelan di awan</a>`
      }`;
    slot
      .querySelector<HTMLButtonElement>("[data-simpan-awan]")
      ?.addEventListener("click", async (e) => {
        const b = e.currentTarget as HTMLButtonElement;
        b.disabled = true;
        const r = await saveToCloud(kunci);
        if (r === "ralat") {
          b.disabled = false;
          b.textContent = "Gagal - cuba lagi";
          return;
        }
        const baru = await listCloud();
        if (baru) lukis(baru);
      });
    document.dispatchEvent(new Event("cloud-change")); // lib/plan-sync.ts mountActivePlanBox lukis semula
  };
  void listCloud().then((a) => {
    if (!a) return;
    const p = a.items.find((i) => i.key === kunci);
    if (p) {
      const ubahParam =
        JSON.stringify(p.data) !== JSON.stringify(readParams(kunci) ?? {});
      if (
        ubahParam ||
        readList(TERTUNDA).includes(kunci) ||
        p.engine !== ENGINE_VERSION
      )
        syncProgress(kunci);
      else {
        siap.clear();
        p.progress.forEach((x) => siap.add(x));
        writeList(kunci, p.progress);
        kemas();
      }
    }
    lukis(a);
  });
  return () => {
    if (diAwan) syncProgress(kunci);
  };
}
