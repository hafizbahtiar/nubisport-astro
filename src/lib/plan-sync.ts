// Pelan aktif + segerak aktiviti Strava (docs/plans/active-plan-sync.md). Satu pelan aktif setiap
// akaun (backend app_items `nubi/active/plan`, data.plan = kunci pelan awan). Aktiviti dipadankan
// dengan sesi di pelayar; sesi padan DITAMBAH ke tanda siap melalui cloud-sync (tidak pernah dibuang).
// Semak: bun scripts/check-plan-sync.ts
import { api, json, currentUser, type CurrentUser } from "./api";
import { todayMY, addDays } from "./date";
import { DISTANCES, buildDistancePlan, type Distance } from "./distance-plan";
import { icon } from "./icon";
import { buildPlan, startMonday, isoDate, sessionDate, type SessionType, type Week, type Level } from "./plan-5k";
import { readList, writeList } from "./saved-plans";
import { ENGINE_VERSION, syncProgress, listCloud, saveToCloud, pullCloud } from "./cloud-sync";

export interface PlanSession {
  id: string; // token tanda siap "<minggu>.<sesi>"
  minggu: number;
  tarikh: string; // yyyy-mm-dd
  jenis: SessionType;
  minit: number;
  tajuk: string;
  jarakM: number; // jarak lumba/ujian pelan ini (dipakai bila jenis "ujian")
}
export interface MatchableActivity {
  startedAt: string; // UTC
  sport: string;
  distanceM: number;
  movingS: number;
  runRatio?: number | null; // bahagian masa bergerak pada kadens lari; null = tiada kadens / sebelum migration 033
}
/** padan = sesi ditanda; tolak = gagal HANYA sebab nisbah lari (kebanyakannya jalan), dengan sesi yang hampir padan. */
export interface MatchResult<A> {
  padan: Map<A, PlanSession>;
  tolak: Map<A, PlanSession>;
}

/** Sesi bertarikh dari kunci + parameter pelan awan. null = tiada tarikh mula / pelan tidak sah. */
export function planSessions(kunci: string, p: Record<string, string>): PlanSession[] | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.mula ?? "")) return null;
  const jenis = /^pelan-(5k|10k|21k):/.exec(kunci)?.[1];
  const hari = Number(p.hari);
  // Nadi (MAF) tidak mengubah minit sesi, jadi tidak perlu di sini.
  const h =
    jenis === "5k"
      ? buildPlan({ bulan: Number(p.bulan), tahap: p.tahap as Level, hari, masa5k: p.masa ? Number(p.masa) : undefined })
      : jenis
        ? buildDistancePlan({ jarak: jenis as Distance, minggu: Number(p.minggu), hari, masa: Number(p.masa), sasaran: p.sasaran ? Number(p.sasaran) : undefined })
        : null;
  if (!h?.ok) return null;
  const jarakM = jenis === "5k" ? 5000 : DISTANCES[jenis as Distance].km * 1000;
  const isnin = startMonday(new Date(`${p.mula}T00:00:00`));
  return (h.minggu as Week[]).flatMap((w) =>
    w.sesi.map((s, i) => ({
      id: `${w.no}.${i}`,
      minggu: w.no,
      tarikh: isoDate(sessionDate(isnin, w.no, hari, i)),
      jenis: s.jenis,
      minit: s.minit,
      tajuk: s.tajuk,
      jarakM,
    })),
  );
}

const hariAntara = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 864e5;
/** Isnin bagi tarikh ISO - minggu pelan bermula Isnin (startMonday). */
const isninOf = (d: string) => addDays(d, -((new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7));
const sesuai = (s: PlanSession, a: MatchableActivity, nisbah: boolean) =>
  (a.sport === "run" || (a.sport === "walk" && s.jenis === "jalan-lari")) &&
  (!nisbah || a.runRatio == null || a.runRatio >= (s.jenis === "jalan-lari" ? 0.15 : 0.7)) &&
  (s.jenis === "ujian" ? a.distanceM >= 0.95 * s.jarakM : a.movingS >= 0.6 * s.minit * 60);

// Hari sama dahulu untuk semua aktiviti, kemudian tarikh paling hampir dalam minggu pelan yang sama
// (seri -> sesi lebih awal). `diambil` diubah.
function pilih<A extends MatchableActivity>(sesi: PlanSession[], aktiviti: A[], diambil: Set<string>, nisbah: boolean) {
  const hasil = new Map<A, PlanSession>();
  for (const samaHari of [true, false])
    for (const a of aktiviti) {
      if (hasil.has(a)) continue;
      const hari = todayMY(new Date(a.startedAt));
      const minggu = isninOf(hari);
      const calon = sesi.filter(
        (s) => !diambil.has(s.id) && (samaHari ? s.tarikh === hari : isninOf(s.tarikh) === minggu) && sesuai(s, a, nisbah),
      );
      const s = calon.reduce<PlanSession | undefined>((b, s) => (!b || hariAntara(s.tarikh, hari) < hariAntara(b.tarikh, hari) ? s : b), undefined);
      if (s) (diambil.add(s.id), hasil.set(a, s));
    }
  return hasil;
}

/**
 * Padankan aktiviti dengan sesi belum siap (tarikh Malaysia, minggu pelan Isnin-Ahad, tak pernah lintas minggu).
 * Aktiviti paling lama dahulu. Satu aktiviti untuk satu sesi. Aktiviti bukan dalam padan/tolak = tambahan.
 */
export function matchActivities<A extends MatchableActivity>(sesi: PlanSession[], aktiviti: A[], siap: Iterable<string>): MatchResult<A> {
  const diambil = new Set(siap);
  const susun = [...aktiviti].sort((x, y) => y.movingS - x.movingS);
  const padan = pilih(sesi, susun, diambil, true);
  // Sesi yang masih kosong yang akan padan kalau nisbah lari diabaikan = gagal sebab nisbah saja.
  const tolak = pilih(sesi, susun.filter((a) => !padan.has(a)), new Set(diambil), false);
  return { padan, tolak };
}

/** Mesej untuk aktiviti dalam `tolak`. */
export const walkedNote = (a: MatchableActivity, s: PlanSession) =>
  `Aktiviti ni kebanyakannya jalan (${Math.round((a.runRatio ?? 0) * 100)}% lari), jadi ${sessionLabel(s)} tak ditanda. Tanda sendiri kalau betul.`;

export const sessionLabel = (s: PlanSession) => `Minggu ${s.minggu}, ${s.tajuk}`;

// ---------- Pelayar ----------

/** Ahli Nubi (peranan app ahli/admin, atau owner) - hanya ahli ada aktiviti untuk dipadankan. */
export const isMember = (s: CurrentUser | null) => s?.role === "owner" || s?.apps?.nubi === "ahli" || s?.apps?.nubi === "admin";

const AKTIF = "/me/apps/nubi/active";
const AKTIVITI = "/me/apps/nubi/activities";
let aktif: Promise<string | null> | null = null;
/** Kunci pelan aktif (satu permintaan setiap page), atau null. */
export const activePlanKey = () =>
(aktif ??= api(AKTIF)
  .then(async (r) => (r.ok ? (((await json(r)).data?.items?.[0]?.data?.plan as string) ?? null) : null))
  .catch(() => null));

/** Pelan aktif yang boleh dipadankan: di awan, ada tarikh mula, enjin semasa. Selain itu null. */
export async function activePlan(): Promise<{ kunci: string; sesi: PlanSession[] } | null> {
  const [k, a] = await Promise.all([activePlanKey(), pullCloud()]);
  const p = k ? a?.items.find((i) => i.key === k) : undefined;
  if (!p || p.engine !== ENGINE_VERSION) return null;
  const sesi = planSessions(p.key, p.data);
  return sesi && { kunci: p.key, sesi };
}

/** Tambah sesi padan ke tanda siap (pelayar + awan). Gagal hantar = tertunda, dihantar kemudian. */
async function tanda<A extends MatchableActivity>(p: { kunci: string; sesi: PlanSession[] }, aktiviti: A[]) {
  const siap = readList(p.kunci);
  const m = matchActivities(p.sesi, aktiviti, siap);
  if (m.padan.size) {
    writeList(p.kunci, [...siap, ...[...m.padan.values()].map((s) => s.id)]);
    if ((await saveToCloud(p.kunci)) !== "ok") syncProgress(p.kunci);
  }
  return m;
}

/** Padankan aktiviti yang baru disimpan. null = tiada pelan aktif yang boleh dipadankan. */
export async function syncActivities<A extends MatchableActivity>(aktiviti: A[]): Promise<MatchResult<A> | null> {
  const p = await activePlan();
  return p && tanda(p, aktiviti);
}

/** Aktiviti dalam [dari, hingga) - tarikh Malaysia, dengan sehari lebihan di kiri (UTC). */
export async function activitiesBetween<A extends MatchableActivity>(dari: string, hingga?: string): Promise<A[] | null> {
  const r = await api(`${AKTIVITI}?from=${addDays(dari, -1)}${hingga ? `&to=${hingga}` : ""}`).catch(() => null);
  return r?.ok ? ((await json(r)).data.activities as A[]) : null;
}

/**
 * Sesi pelan aktif bagi satu aktiviti - dikira semula dari aktiviti minggu pelan itu, tiada storan.
 * ditanda false = sesi itu hampir padan tapi aktiviti kebanyakannya jalan (walkedNote).
 */
export async function sessionFor<A extends MatchableActivity>(a: A): Promise<{ sesi: PlanSession; ditanda: boolean } | null> {
  const p = await activePlan();
  if (!p) return null;
  const isnin = isninOf(todayMY(new Date(a.startedAt)));
  const sekitar = (await activitiesBetween<A>(isnin, addDays(isnin, 7))) ?? [];
  const m = matchActivities(p.sesi, [a, ...sekitar.filter((x) => x.startedAt !== a.startedAt)], []);
  const padan = m.padan.get(a), tolak = m.tolak.get(a);
  return padan ? { sesi: padan, ditanda: true } : tolak ? { sesi: tolak, ditanda: false } : null;
}

/** Jadikan pelan aktif, kemudian padankan aktiviti sejak tarikh mula. Pulang bilangan sesi ditanda, null = gagal. */
export async function setActivePlan(kunci: string): Promise<number | null> {
  const r = await api(`${AKTIF}/plan`, {
    method: "PUT",
    body: JSON.stringify({ engine: ENGINE_VERSION, data: { plan: kunci }, progress: [] }),
  }).catch(() => null);
  if (!r?.ok) return null;
  aktif = Promise.resolve(kunci);
  const p = await activePlan();
  if (!p) return 0;
  const a = await activitiesBetween(addDays(p.sesi[0].tarikh, -1));
  return a ? (await tanda(p, a)).padan.size : 0;
}

/**
 * Baris "pelan aktif" di page pelan (ahli sahaja): lencana Aktif atau butang "Jadikan pelan aktif".
 * Dilukis semula bila kotak awan berubah (event "cloud-change" dari mountCloudBox). `kemas` = lukis semula tanda siap.
 */
export async function mountActivePlanBox(slot: HTMLElement, kunci: string, adaMula: boolean, siap: Set<string>, kemas: () => void) {
  if (!isMember(await currentUser())) return;
  const lukis = async (pesan = "") => {
    const [k, a] = await Promise.all([activePlanKey(), listCloud()]);
    if (!a) return;
    const diAwan = a.items.some((i) => i.key === kunci);
    slot.innerHTML =
      k === kunci
        ? `<span class="lencana lencana-awan">${icon("aktiviti")}Aktif</span> <span class="muted">${pesan || "Aktiviti Strava yang dimuat naik akan tanda sesi siap sendiri."}</span>`
        : !diAwan
          ? `<span class="muted">Simpan pelan ini ke awan untuk jadikan ia pelan aktif.</span>`
          : !adaMula
            ? `<span class="muted">Isi "Tarikh mula" di atas dan tekan "Buat pelan" untuk jadikan ia pelan aktif.</span>`
            : `<button class="btn btn-outline btn-sm" type="button" data-aktifkan>Jadikan pelan aktif</button>
               <span class="muted">Aktiviti Strava akan tanda sesi pelan ini siap.</span>`;
    slot.querySelector<HTMLButtonElement>("[data-aktifkan]")?.addEventListener("click", async (e) => {
      const b = e.currentTarget as HTMLButtonElement;
      b.disabled = true;
      const n = await setActivePlan(kunci);
      if (n === null) {
        b.disabled = false;
        b.textContent = "Gagal - cuba lagi";
        return;
      }
      readList(kunci).forEach((x) => siap.add(x));
      kemas();
      void lukis(n ? `${n} sesi ditanda siap dari aktiviti Strava.` : "Tiada aktiviti Strava yang padan setakat ini.");
    });
  };
  document.addEventListener("cloud-change", () => void lukis());
  await lukis();
}
