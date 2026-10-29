// Pelan aktif + segerak aktiviti Strava (docs/plans/active-plan-sync.md). Satu pelan aktif setiap
// akaun (backend app_items `nubi/active/plan`, data.plan = kunci pelan awan). Aktiviti dipadankan
// dengan sesi di pelayar; sesi padan DITAMBAH ke tanda siap melalui cloud-sync (tidak pernah dibuang).
// Semak: bun scripts/check-plan-sync.ts
import { api, json, currentUser, type CurrentUser } from "./api";
import { todayMY, addDays } from "./date";
import { DISTANCES, buildDistancePlan, type Distance } from "./distance-plan";
import { formatDuration, formatKm, paceFromDistance } from "./activity-file";
import { icon } from "./icon";
import { buildPlan, startMonday, isoDate, isWalkDate, sessionDate, formatPace, type SessionType, type Segment, type Week, type Level } from "./plan-5k";
import { readList, writeList } from "./saved-plans";
import { syncProgress, listCloud, saveToCloud, pullCloud } from "./cloud-sync";
import { readProfile, ageOn } from "./profile";
import { confirmDialog } from "./confirm";
import { ENGINE_VERSION, ISO, planFromParams, planSessionDate, planSessions, type PlanSession } from "./plan-core";

export { ENGINE_VERSION, planFromParams, planSessionDate, planSessions, type PlanSession } from "./plan-core";

export interface MatchableActivity {
  startedAt: string; // UTC
  sport: string;
  distanceM: number;
  movingS: number;
  runRatio?: number | null; // bahagian masa bergerak pada kadens lari; null = tiada kadens / sebelum migration 033
  maxHr?: number | null; // nadi puncak; null = tiada nadi dalam fail
}

/** HRmax = 208 - 0.7 × umur (Tanaka 2001), persamaan yang disyorkan ACSM's Guidelines for Exercise Testing and Prescription. */
export const hrMax = (umur: number) => 208 - 0.7 * umur;
/** ACSM Position Stand (Garber et al. 2011, Med Sci Sports Exerc 43(7):1334-59): intensiti "vigorous" = 77-95% HRmax. */
export const VIGOROUS = 0.77;
/**
 * Sesi interval/tempo mesti sampai intensiti vigorous. Aktiviti yang nadi PUNCAKNYA pun bawah 77% HRmax
 * jelas larian mudah - tak boleh tanda sesi laju. Tiada nadi atau umur = tak dapat dibuktikan, jadi tak dihalang.
 */
export const easyForQuality = (s: { jenis: SessionType }, a: MatchableActivity, umur: number | null | undefined) =>
  (s.jenis === "interval" || s.jenis === "tempo") && !!umur && a.maxHr != null && a.maxHr < VIGOROUS * hrMax(umur);
/** padan = sesi ditanda; tolak = gagal HANYA sebab nisbah lari (kebanyakannya jalan), dengan sesi yang hampir padan. */
export interface MatchResult<A> {
  padan: Map<A, PlanSession>;
  tolak: Map<A, PlanSession>;
}

const hariAntara = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 864e5;
/** Minggu pelan bagi tarikh ISO: 7 hari dari sesi pertama minggu itu (Isnin, atau dianjak bagi pelan lumba). */
const weekOf = (sesi: PlanSession[], d: string) =>
  sesi.find((s) => s.id.endsWith(".0") && s.tarikh <= d && d < addDays(s.tarikh, 7))?.minggu;
const sesuai = (s: PlanSession, a: MatchableActivity, nisbah: boolean, umur?: number | null) =>
  (s.walk
    ? a.sport === "run" || a.sport === "walk"
    : a.sport === "run" || (a.sport === "walk" && s.jenis === "jalan-lari")) &&
  (s.walk || !easyForQuality(s, a, umur)) &&
  (s.walk || !nisbah || a.runRatio == null || a.runRatio >= (s.jenis === "jalan-lari" ? 0.15 : 0.7)) &&
  (s.jenis === "ujian" ? a.distanceM >= 0.95 * s.jarakM : a.movingS >= 0.6 * s.minit * 60);

// Hari sama dahulu untuk semua aktiviti, kemudian tarikh paling hampir dalam minggu pelan yang sama
// (seri -> sesi lebih awal). `diambil` diubah.
function pilih<A extends MatchableActivity>(sesi: PlanSession[], aktiviti: A[], diambil: Set<string>, nisbah: boolean, umur?: number | null) {
  const hasil = new Map<A, PlanSession>();
  for (const samaHari of [true, false])
    for (const a of aktiviti) {
      if (hasil.has(a)) continue;
      const hari = todayMY(new Date(a.startedAt));
      const minggu = weekOf(sesi, hari);
      const calon = sesi.filter(
        (s) => !diambil.has(s.id) && (samaHari ? s.tarikh === hari : s.minggu === minggu) && sesuai(s, a, nisbah, umur),
      );
      const s = calon.reduce<PlanSession | undefined>((b, s) => (!b || hariAntara(s.tarikh, hari) < hariAntara(b.tarikh, hari) ? s : b), undefined);
      if (s) (diambil.add(s.id), hasil.set(a, s));
    }
  return hasil;
}

/**
 * Padankan aktiviti dengan sesi belum siap (tarikh Malaysia, minggu pelan weekOf, tak pernah lintas minggu).
 * Aktiviti paling lama dahulu. Satu aktiviti untuk satu sesi. Aktiviti bukan dalam padan/tolak = tambahan.
 * `umur` (profil) = semakan intensiti sesi laju (easyForQuality).
 */
export function matchActivities<A extends MatchableActivity>(sesi: PlanSession[], aktiviti: A[], siap: Iterable<string>, umur?: number | null): MatchResult<A> {
  const diambil = new Set(siap);
  const susun = [...aktiviti].sort((x, y) => y.movingS - x.movingS);
  const padan = pilih(sesi, susun, diambil, true, umur);
  // Sesi yang masih kosong yang akan padan kalau nisbah lari diabaikan = gagal sebab nisbah saja.
  const tolak = pilih(sesi, susun.filter((a) => !padan.has(a)), new Set(diambil), false, umur);
  return { padan, tolak };
}

/** Minit dirancang vs minit run/walk sebenar setiap minggu pelan (weekOf, waktu Malaysia). Tiada storan. */
export function weeklyLoad(sesi: PlanSession[], aktiviti: MatchableActivity[]): { no: number; rancang: number; sebenar: number }[] {
  const minggu = new Map<number, { no: number; rancang: number; sebenar: number }>();
  for (const s of sesi) {
    const w = minggu.get(s.minggu) ?? { no: s.minggu, rancang: 0, sebenar: 0 };
    w.rancang += s.minit;
    minggu.set(s.minggu, w);
  }
  for (const a of aktiviti) {
    const w = (a.sport === "run" || a.sport === "walk") && minggu.get(weekOf(sesi, todayMY(new Date(a.startedAt)))!);
    if (w) w.sebenar += a.movingS / 60;
  }
  return [...minggu.values()].map((w) => ({ ...w, sebenar: Math.round(w.sebenar) }));
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
interface ActivePointer {
  plan: string | null;
  walkUntil: string | null;
}
let aktif: Promise<ActivePointer | null> | null = null;
const pointer = () =>
(aktif ??= api(AKTIF)
  .then(async (r) => {
    if (!r.ok) return null;
    const data = ((await json(r)).data?.items?.[0]?.data ?? {}) as Record<string, unknown>;
    return {
      plan: typeof data.plan === "string" ? data.plan : null,
      walkUntil: typeof data.jalan === "string" && ISO.test(data.jalan) ? data.jalan : null,
    };
  })
  .catch(() => null));
const validWalk = (v: string | null) => (v && v >= todayMY() ? v : null);
/** Kunci pelan aktif (satu permintaan setiap page), atau null. */
export const activePlanKey = async () => (await pointer())?.plan ?? null;
/** Tarikh akhir mod jalan pelan aktif; null = tiada / dah tamat. */
export const activeWalkUntil = async () => validWalk((await pointer())?.walkUntil ?? null);

type ActivePlan = { kunci: string; sesi: PlanSession[]; umur: number | null; walkUntil: string | null };
/** Kenapa pelan aktif tak boleh dipadankan: tiada / bukan di awan, enjin lama, tiada tarikh mula. */
export type ActivePlanState = { ok: true; plan: ActivePlan } | { ok: false; sebab: "tiada" | "enjin" | "mula" };

/** Pelan aktif + sebab kalau tak boleh dipadankan (dipapar di page pelan, bukan "Tak dapat sync"). */
export async function activePlanState(): Promise<ActivePlanState> {
  const [p, a, profil] = await Promise.all([pointer(), pullCloud(), readProfile()]);
  const plan = p?.plan ? a?.items.find((i) => i.key === p.plan) : undefined;
  if (!plan) return { ok: false, sebab: "tiada" };
  if (plan.engine !== ENGINE_VERSION) return { ok: false, sebab: "enjin" };
  const walkUntil = validWalk(p?.walkUntil ?? null);
  const sesi = planSessions(plan.key, plan.data, walkUntil);
  if (!sesi) return { ok: false, sebab: "mula" };
  return { ok: true, plan: { kunci: plan.key, sesi, umur: profil.lahir ? ageOn(profil.lahir) : null, walkUntil } };
}

/** Set/clear mod jalan pelan aktif. `until` = tarikh akhir inklusif (YYYY-MM-DD); null = tamat. */
export async function setWalkUntil(until: string | null): Promise<boolean> {
  const p = await pointer();
  if (!p?.plan) return false;
  const end = until && ISO.test(until) ? until : null;
  const data: Record<string, string> = { plan: p.plan };
  if (end) data.jalan = end;
  const r = await api(`${AKTIF}/plan`, {
    method: "PUT",
    body: JSON.stringify({ engine: ENGINE_VERSION, data, progress: [] }),
  }).catch(() => null);
  if (!r?.ok) return false;
  aktif = Promise.resolve({ plan: p.plan, walkUntil: end });
  return true;
}

/** Mod jalan untuk satu pelan: jadikan aktif dahulu kalau perlu, kemudian set tarikh. */
export async function setWalkForPlan(key: string, until: string | null): Promise<boolean> {
  const p = await pointer();
  if (p?.plan !== key && (await setActivePlan(key)) === null) return false;
  return setWalkUntil(until);
}

/** Untuk page pelan: pelan ini aktif? kalau ya, tarikh akhir mod jalan. */
export async function activeWalkFor(key: string): Promise<{ active: boolean; until: string | null }> {
  const p = await pointer();
  return p?.plan === key
    ? { active: true, until: validWalk(p.walkUntil) }
    : { active: false, until: null };
}

/** Butang mod jalan di page pelan: 7/14 hari, lanjut 7 hari, atau tamat. */
export function mountWalk(slot: HTMLElement, until: string | null, key: string) {
  slot.addEventListener("click", async (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>("[data-jalan], [data-jalan-tamat], [data-jalan-lanjut]");
    if (!b) return;
    const days = b.dataset.jalan ? Number(b.dataset.jalan) : 0;
    const next = b.hasAttribute("data-jalan-tamat")
      ? null
      : b.hasAttribute("data-jalan-lanjut") && until
        ? addDays(until, 7)
        : addDays(todayMY(), Math.max(1, days) - 1);
    b.disabled = true;
    if (!(await setWalkForPlan(key, next))) {
      b.disabled = false;
      b.textContent = "Gagal - cuba lagi";
      return;
    }
    location.reload();
  });
}

/** Pelan aktif yang boleh dipadankan: di awan, ada tarikh mula, enjin semasa. Selain itu null. */
export async function activePlan(): Promise<ActivePlan | null> {
  const st = await activePlanState();
  return st.ok ? st.plan : null;
}

/**
 * Padankan SEMUA aktiviti sejak pelan bermula, tanpa tanda siap sedia ada - padanan yang sama dengan
 * paparan (sessionFor, mountActuals), jadi kad Strava dan tanda siap sentiasa merujuk sesi yang sama.
 * Sesi padan ditambah ke tanda siap (pelayar + awan; gagal hantar = tertunda). Tanda manual tak disentuh.
 * null = aktiviti tak dapat dimuatkan.
 */
async function tanda(p: ActivePlan) {
  const semua = await activitiesBetween<ActivityRow>(p.sesi[0].tarikh);
  if (!semua) return null;
  const m = matchActivities(p.sesi, semua, [], p.umur);
  const siap = readList(p.kunci);
  const baru = [...new Set([...m.padan.values()].map((s) => s.id))].filter((id) => !siap.includes(id));
  if (baru.length) {
    writeList(p.kunci, [...siap, ...baru]);
    if ((await saveToCloud(p.kunci)) !== "ok") syncProgress(p.kunci);
  }
  return { m, baru: baru.length };
}

/** Selepas muat naik: padankan semula, pulang hasil untuk aktiviti yang baru disimpan sahaja. null = tiada pelan aktif. */
export async function syncActivities<A extends MatchableActivity>(aktiviti: A[]): Promise<MatchResult<A> | null> {
  const p = await activePlan();
  const t = p && (await tanda(p));
  if (!t) return null;
  const hasil: MatchResult<A> = { padan: new Map(), tolak: new Map() };
  for (const a of aktiviti) {
    const sama = (x: MatchableActivity) => x.startedAt === a.startedAt;
    const padan = [...t.m.padan].find(([x]) => sama(x));
    const tolak = [...t.m.tolak].find(([x]) => sama(x));
    if (padan) hasil.padan.set(a, padan[1]);
    else if (tolak) hasil.tolak.set(a, tolak[1]);
  }
  return hasil;
}

/**
 * Butang "Sync aktiviti": padankan SEMUA aktiviti sejak pelan aktif bermula. Tiada tanda dibuang,
 * jadi selamat ditekan berulang. Pulang bilangan sesi BAHARU ditanda; null = tiada pelan aktif
 * atau aktiviti tak dapat dimuatkan.
 */
export async function syncActivePlan(): Promise<number | null> {
  const p = await activePlan();
  const t = p && (await tanda(p));
  return t ? t.baru : null;
}

/**
 * Sebelum padam aktiviti: sesi pelan aktif yang ditanda siap dan dipadankan dengan aktiviti ini.
 * Tanda itu mungkin juga ditanda manual, jadi page TANYA dulu sebelum unmark (untick). null = tiada.
 */
export async function ticksFrom(aktiviti: MatchableActivity[] | "semua"): Promise<{ kunci: string; sesi: PlanSession[] } | null> {
  const p = await activePlan();
  const semua = p && (await activitiesBetween<ActivityRow>(p.sesi[0].tarikh));
  if (!p || !semua) return null;
  const m = matchActivities(p.sesi, semua, [], p.umur);
  const siap = new Set(readList(p.kunci));
  const sesi = semua
    .filter((a) => aktiviti === "semua" || aktiviti.some((x) => x.startedAt === a.startedAt))
    .map((a) => m.padan.get(a))
    .filter((s): s is PlanSession => !!s && siap.has(s.id));
  return sesi.length ? { kunci: p.kunci, sesi } : null;
}

/** Lepas aktiviti dipadam: tanya, kemudian buang tanda siap yang datang darinya. */
export async function offerUntick(t: { kunci: string; sesi: PlanSession[] } | null) {
  if (!t) return;
  const ya = await confirmDialog({
    title: "Buang tanda siap juga?",
    message: `${t.sesi.map(sessionLabel).join("; ")} ditanda siap dari aktiviti yang dipadam. Buang tanda itu? Pilih "Kekal" kalau anda memang buat sesi itu.`,
    confirmLabel: "Buang tanda",
    cancelLabel: "Kekal",
  });
  if (ya) await untick(t.kunci, t.sesi.map((s) => s.id));
}

/** Buang tanda siap (pelayar + awan). */
export async function untick(kunci: string, ids: string[]) {
  writeList(kunci, readList(kunci).filter((x) => !ids.includes(x)));
  if ((await saveToCloud(kunci)) !== "ok") syncProgress(kunci);
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
  const no = weekOf(p.sesi, todayMY(new Date(a.startedAt)));
  const mula = p.sesi.find((s) => s.minggu === no)?.tarikh; // sesi pertama = awal minggu pelan
  if (!mula) return null; // luar pelan - tiada sesi untuk dipadankan
  const sekitar = (await activitiesBetween<A>(mula, addDays(mula, 7))) ?? [];
  const m = matchActivities(p.sesi, [a, ...sekitar.filter((x) => x.startedAt !== a.startedAt)], [], p.umur);
  const padan = m.padan.get(a), tolak = m.tolak.get(a);
  return padan ? { sesi: padan, ditanda: true } : tolak ? { sesi: tolak, ditanda: false } : null;
}

/** Jadikan pelan aktif, kemudian padankan aktiviti sejak tarikh mula. Pulang bilangan sesi ditanda, null = gagal. */
/** If the member has exactly one cloud plan and no active pointer, activate it. */
export async function autoActivateOnly(): Promise<boolean> {
  if (!isMember(await currentUser())) return false;
  const [k, a] = await Promise.all([activePlanKey(), listCloud()]);
  if (!a || a.items.length !== 1 || k === a.items[0].key) return false;
  return (await setActivePlan(a.items[0].key)) !== null;
}

export async function setActivePlan(kunci: string): Promise<number | null> {
  const r = await api(`${AKTIF}/plan`, {
    method: "PUT",
    body: JSON.stringify({ engine: ENGINE_VERSION, data: { plan: kunci }, progress: [] }),
  }).catch(() => null);
  if (!r?.ok) return null;
  aktif = Promise.resolve({ plan: kunci, walkUntil: null });
  const p = await activePlan();
  if (!p) return 0;
  return (await tanda(p))?.baru ?? 0;
}

/**
 * Baris "pelan aktif" di page pelan (ahli sahaja): lencana Aktif atau butang "Jadikan pelan aktif".
 * Dilukis semula bila kotak awan berubah (event "cloud-change" dari mountCloudBox). `kemas` = lukis semula tanda siap.
 */
export async function mountActivePlanBox(slot: HTMLElement, kunci: string, adaMula: boolean, siap: Set<string>, kemas: () => void) {
  if (!isMember(await currentUser())) return;
  const lukis = async (pesan = "") => {
    let [k, a] = await Promise.all([activePlanKey(), listCloud()]);
    if (!a) return;
    // Pelan pertama/tunggal: jadikan aktif tanpa perlu tekan butang.
    if (a.items.length === 1 && k !== a.items[0].key && (await setActivePlan(a.items[0].key)) !== null)
      k = a.items[0].key;
    const diAwan = a.items.some((i) => i.key === kunci);
    // Pelan aktif yang tak boleh dipadankan: terangkan kenapa, bukan "Tak dapat sync sekarang".
    const st = k === kunci ? await activePlanState() : null;
    const halangan =
      st && !st.ok
        ? st.sebab === "enjin"
          ? "Pelan ini dibuat dengan versi lama. Tekan \"Kemas kini pelan\" sekali supaya aktiviti Strava boleh dipadankan."
          : st.sebab === "mula"
            ? "Isi \"Tarikh mula\" dan tekan \"Kemas kini pelan\" - padanan perlukan tarikh sebenar."
            : ""
        : "";
    slot.innerHTML =
      k === kunci && halangan
        ? `<span class="lencana lencana-awan">${icon("aktiviti")}Aktif</span> <span class="muted">${halangan}</span>`
        : k === kunci
          ? `<span class="lencana lencana-awan">${icon("aktiviti")}Aktif</span> <span class="muted">${pesan || "Aktiviti Strava yang dimuat naik akan tanda sesi siap sendiri."}</span>
           <button class="btn btn-outline btn-sm" type="button" data-sync>Sync aktiviti</button>`
          : !diAwan
            ? `<span class="muted">Simpan pelan ini ke awan untuk jadikan ia pelan aktif.</span>`
            : !adaMula
              ? `<span class="muted">Isi "Tarikh mula" di atas dan tekan "Buat pelan" untuk jadikan ia pelan aktif.</span>`
              : `<button class="btn btn-outline btn-sm" type="button" data-aktifkan>Jadikan pelan aktif</button>
               <span class="muted">Aktiviti Strava akan tanda sesi pelan ini siap.</span>`;
    slot.querySelector<HTMLButtonElement>("[data-sync]")?.addEventListener("click", async (e) => {
      const b = e.currentTarget as HTMLButtonElement;
      b.disabled = true;
      const n = await syncActivePlan();
      if (n === null) {
        await lukis("Tak dapat sync sekarang. Cuba lagi sekejap.");
        return;
      }
      siap.clear();
      readList(kunci).forEach((x) => siap.add(x));
      kemas();
      await lukis(n ? `${n} sesi ditanda siap dari aktiviti Strava.` : "Tiada sesi baharu untuk ditanda.");
    });
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

export interface ActivityRow extends MatchableActivity {
  id: number;
  avgHr: number | null;
  elapsedS: number;
}
/** Masa "m:ss" / "h:mm:ss" dari saat (borang hari ujian, lib/pace.ts parseTime). */
const masaTeks = (saat: number) => {
  const s = Math.round(saat);
  const j = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), d = s % 60;
  return j ? `${j}:${String(m).padStart(2, "0")}:${String(d).padStart(2, "0")}` : `${m}:${String(d).padStart(2, "0")}`;
};

/**
 * Page pelan, pelan aktif sahaja (ahli): data sebenar dari aktiviti Strava di kad sesi (padanan sama dengan
 * sessionFor - dikira semula, tiada storan), bar beban setiap minggu, dan masa hari ujian/lumba diisi ke borang
 * "Pelan seterusnya" (pace baru dari ujian itu). `loadBar` = lib/plan-render.ts loadBarHtml.
 */
export async function mountActuals(akar: HTMLElement, kunci: string, loadBar: (w: { no: number; rancang: number; sebenar: number }) => string) {
  if (!isMember(await currentUser())) return;
  const p = await activePlan();
  if (!p || p.kunci !== kunci) return;
  const akt = await activitiesBetween<ActivityRow>(p.sesi[0].tarikh);
  if (!akt) return;
  const hariIni = todayMY();
  for (const w of weeklyLoad(p.sesi, akt)) {
    const el = akar.querySelector<HTMLElement>(`[data-beban="${w.no}"]`);
    // Minggu akan datang tiada apa untuk dibanding.
    if (el && p.sesi.find((s) => s.minggu === w.no)!.tarikh <= hariIni) (el.innerHTML = loadBar(w)), (el.hidden = false);
  }
  const { padan } = matchActivities(p.sesi, akt, [], p.umur);
  for (const [a, s] of padan) {
    const el = akar.querySelector<HTMLElement>(`[data-sebenar="${s.id}"]`);
    if (!el) continue;
    const bahagian = [
      formatKm(a.distanceM),
      formatDuration(a.movingS),
      paceFromDistance(a.distanceM, a.movingS),
      a.avgHr ? `${Math.round(a.avgHr)} bpm` : null,
      s.walk ? "sesi jalan" : a.runRatio != null ? `${Math.round(a.runRatio * 100)}% lari` : null,
    ].filter(Boolean);
    el.innerHTML = `${icon("aktiviti")}<span>Strava: ${bahagian.join(" · ")}</span> <a class="link" href="/account/activities/view?id=${Number(a.id)}">Lihat</a>`;
    el.hidden = false;
    // Hari ujian/lumba: masa untuk jarak penuh (skala dari jarak sebenar) -> borang pelan seterusnya.
    // Masa keseluruhan (elapsed), bukan masa bergerak: masa lumba termasuk berhenti di stesen air/lampu
    // - masa bergerak terlalu cepat dan pelan seterusnya jadi terlalu berat.
    const f = s.jenis === "ujian" ? akar.querySelector<HTMLFormElement>(`form[data-sesi-ujian="${s.id}"]`) : null;
    if (f && a.distanceM > 0 && !f.masa.value) {
      const saat = (Math.max(a.elapsedS, a.movingS) * s.jarakM) / a.distanceM;
      f.masa.value = masaTeks(saat);
      f.querySelector("[data-ujian-hasil]")!.innerHTML =
        `<p class="muted">Dari Strava: ~${masaTeks(saat)} (pace ${formatPace(saat / (s.jarakM / 1000))}/km). Tekan "Pelan seterusnya" untuk kemas kini pace dari ${s.jarakM === 5000 ? "ujian" : "lumba"} ini.</p>`;
    }
  }
}
