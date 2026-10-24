// Tool Nubi AI yang berjalan dalam pelayar. Backend hanya menghantar nama + skema; di sini
// setiap tool guna laluan /me sedia ada dengan sesi ahli. Baca terus; tulis = cadangan + kad
// Sahkan. Tiada tool padam.
import { api, json } from "./api";
import { pullCloud, saveToCloud, syncProgress } from "./cloud-sync";
import { describePlan, savedPlans } from "./plan-list";
import { previewPlan, savePlan, type PlanKind } from "./plan-save";
import {
  activePlanState,
  activitiesBetween,
  sessionFor,
  sessionLabel,
  setActivePlan,
  setWalkUntil,
} from "./plan-sync";
import { readProfile, saveProfile, type TrainingProfile } from "./profile";
import { DISTANCES } from "./distance-plan";
import { RACES } from "../data/races";
import { addDays, todayMY } from "./date";
import { readList, writeList } from "./saved-plans";
import {
  STATES,
  aqiLevel,
  fetchAqi,
  fetchForecast,
  fetchPrayerTimes,
  highestAqi,
  nowTimeMY,
  readLocation,
  runWindows,
  weatherAdvice,
} from "./run-check";
import { altitudeSeries, fitData, heartSeries, hrZones, routeOf } from "./activity-file";
import { checkSession } from "./activity-analysis";
import {
  EVENTS,
  closed,
  eventError,
  fetchEvent,
  fetchEvents,
  full,
  whenText,
  type Acara,
} from "./events";

export interface AiToolCall {
  id: string;
  name: string;
  arguments: string;
}
export interface AiChatMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: AiToolCall[];
  toolCallId?: string;
}
export type ToolResult = Record<string, unknown>;

export interface ToolProposal {
  title: string;
  detail: string;
  href?: string;
  label?: string;
  jalankan: () => Promise<ToolResult>;
}
export interface ActivityMapView {
  activityId: number;
  route: [number, number][];
  name: string | null;
  startedAt: string;
  distanceM: number;
  movingS: number;
}
export type ToolOutcome =
  | { result: ToolResult; view?: ActivityMapView }
  | { proposal: ToolProposal };

export const WRITE_TOOLS = new Set([
  "update_profile",
  "create_plan",
  "update_plan",
  "set_active_plan",
  "rsvp_event",
  "cancel_rsvp",
  "mark_session_done",
  "set_walk_mode",
]);

/** Argumen tool mesti JSON objek; nilai lain = ralat kepada model, bukan throw. */
export function parseToolArgs(raw: string): Record<string, unknown> {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? v : { ralat: "Argumen tool mesti objek JSON." };
  } catch {
    return { ralat: "Argumen tool bukan JSON yang sah." };
  }
}

const textValue = (v: unknown, max = 500) => (typeof v === "string" ? v.slice(0, max) : "");
const errorOutcome = (message: string): ToolOutcome => ({ result: { ralat: message } });

/** Ringkasan aktiviti - tiada koordinat, fail, atau id pengguna. */
export function activitySummary(a: Record<string, unknown>) {
  const m = Number(a.distanceM) || 0;
  const s = Number(a.movingS) || 0;
  return {
    id: a.id,
    startedAt: a.startedAt,
    sport: a.sport,
    name: textValue(a.name, 120),
    distanceKm: +((m / 1000).toFixed(2)),
    movingMin: Math.round(s / 60),
    paceSPerKm: m > 0 ? Math.round(s / (m / 1000)) : null,
    avgHr: a.avgHr ?? null,
    maxHr: a.maxHr ?? null,
    runRatio: a.runRatio ?? null,
  };
}

const eventSummary = (a: Acara) => ({
  id: a.id,
  title: a.title,
  startsAt: a.startsAt,
  location: a.location,
  distanceKm: a.distanceKm,
  pace: a.pace,
  mine: a.mine,
});

async function listActivities(args: Record<string, unknown>): Promise<ToolResult> {
  const days = Math.min(365, Math.max(1, Number(args.days) || 30));
  const from = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const res = await api(`/me/apps/nubi/activities?from=${from}`).catch(() => null);
  if (!res?.ok) return { ralat: "Tak dapat baca aktiviti sekarang." };
  const data = (await json(res)).data;
  const rows = Array.isArray(data?.activities) ? data.activities : [];
  return { hari: days, activities: rows.slice(0, 30).map(activitySummary), dipotong: rows.length > 30 };
}

async function listPlans(): Promise<ToolResult> {
  await pullCloud();
  const plans = savedPlans().map((p) => ({
    key: p.key,
    name: p.name,
    detail: p.detail,
    done: p.done,
    total: p.total,
    href: p.href,
  }));
  const active = await api("/me/apps/nubi/active").then(async (r) => (r.ok ? (await json(r)).data?.items?.[0]?.data?.plan ?? null : null)).catch(() => null);
  return { plans, active };
}

const PROFILE: Record<string, { label: string; min?: number; max?: number; values?: string[] }> = {
  lahir: { label: "Tarikh lahir" },
  keadaan: { label: "Keadaan MAF", values: ["sakit", "terganggu", "konsisten", "maju"] },
  hari: { label: "Hari seminggu", values: ["3", "4"] },
  masa5k: { label: "Masa 5K", min: 15, max: 60 },
  masa10k: { label: "Masa 10K", min: 35, max: 110 },
  masa21k: { label: "Masa 21K", min: 80, max: 210 },
  jantina: { label: "Jantina", values: ["lelaki", "perempuan"] },
  tinggi: { label: "Tinggi", min: 130, max: 220 },
  berat: { label: "Berat", min: 35, max: 250 },
};

function profileChanges(args: Record<string, unknown>): { ok: true; changes: TrainingProfile } | { ok: false; error: string } {
  const changes: TrainingProfile = {};
  for (const [key, raw] of Object.entries(args)) {
    const spec = PROFILE[key];
    if (!spec) return { ok: false, error: `Medan profil tak dikenali: ${key}.` };
    if (raw === undefined || raw === null || raw === "") return { ok: false, error: `Nilai ${key} tiada.` };
    if (key === "lahir") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(raw))) return { ok: false, error: "Tarikh lahir mesti YYYY-MM-DD." };
      changes.lahir = String(raw);
    } else if (spec.values) {
      const value = String(raw);
      if (!spec.values.includes(value)) return { ok: false, error: `Nilai ${key} tak sah.` };
      changes[key as keyof TrainingProfile] = value;
    } else {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < spec.min! || n > spec.max!) return { ok: false, error: `Nilai ${key} di luar julat.` };
      changes[key as keyof TrainingProfile] = String(n);
    }
  }
  return { ok: true, changes };
}

function planKind(value: unknown): PlanKind | null {
  const v = String(value ?? "").toLowerCase();
  return v === "5k" || v === "10k" || v === "21k" || v === "42k" ? v : null;
}

function planDetail(kind: PlanKind, p: Record<string, string>) {
  const name = kind === "5k" ? "5K" : DISTANCES[kind].nama;
  const length =
    kind === "5k"
      ? p.bulan?.endsWith("w")
        ? `${p.bulan.slice(0, -1)} minggu`
        : `${p.bulan ?? p.minggu} bulan`
      : `${p.minggu} minggu`;
  return `${name} · ${length} · ${p.hari} hari${p.mula ? ` · mula ${p.mula}` : ""}`;
}

async function preparePlan(name: "create_plan" | "update_plan", args: Record<string, unknown>): Promise<ToolOutcome> {
  const kind = planKind(args.distance);
  if (!kind) return errorOutcome("Pilih jarak 5K, 10K, 21K atau 42K.");
  const key = name === "update_plan" ? textValue(args.key, 100) : "";
  if (name === "update_plan" && !key) return errorOutcome("Pelan yang nak diubah tiada.");
  if (key) await pullCloud();
  const raw = { ...args };
  delete raw.key;
  delete raw.distance;
  delete raw.jarak;
  const preview = previewPlan(kind, raw, key || undefined);
  if (!preview.ok) return errorOutcome(preview.error);
  const existing = key ? describePlan(key) : null;
  return {
    proposal: {
      title: `${name === "create_plan" ? "Cipta pelan" : "Ubah pelan"}: ${planDetail(kind, preview.params)}`,
      detail: name === "update_plan" && existing ? existing.name : "Pelan ini akan disimpan dalam akaun awak.",
      ...(existing ? { href: existing.href, label: "Lihat pelan" } : {}),
      jalankan: async () => {
        const saved = savePlan(kind, raw, key || undefined);
        if (!saved.ok) return { ralat: saved.error };
        const awan = await saveToCloud(saved.key);
        return {
          disimpan: true,
          message: name === "create_plan" ? "Pelan disimpan." : "Pelan dikemas kini.",
          key: saved.key,
          href: saved.href,
          label: "Lihat pelan",
          awan,
        };
      },
    },
  };
}

async function prepareProfile(args: Record<string, unknown>): Promise<ToolOutcome> {
  const parsed = profileChanges(args);
  if (!parsed.ok) return errorOutcome(parsed.error);
  const current = await readProfile();
  const changes = parsed.changes;
  const lines = Object.entries(changes)
    .filter(([key, value]) => String(current[key as keyof TrainingProfile] ?? "") !== String(value))
    .map(([key, value]) => `${PROFILE[key].label}: ${current[key as keyof TrainingProfile] || "kosong"} → ${value}`);
  if (!lines.length) return errorOutcome("Tiada perubahan profil.");
  const merged = { ...current, ...changes };
  return {
    proposal: {
      title: "Kemas kini profil",
      detail: lines.join("\n"),
      href: "/account/profile/training",
      label: "Lihat profil",
      jalankan: async () => {
        if (!(await saveProfile(merged))) return { ralat: "Tak dapat simpan profil sekarang." };
        return {
          disimpan: true,
          message: "Profil disimpan.",
          fields: Object.keys(changes),
          href: "/account/profile/training",
          label: "Buka profil",
        };
      },
    },
  };
}

async function prepareActive(args: Record<string, unknown>): Promise<ToolOutcome> {
  const key = textValue(args.key, 100);
  if (key) await pullCloud();
  const plan = key ? describePlan(key) : null;
  if (!plan) return errorOutcome("Pelan itu tiada dalam akaun ini.");
  return {
    proposal: {
      title: "Jadikan pelan aktif",
      detail: plan.name,
      href: plan.href,
      label: "Lihat pelan",
      jalankan: async () => {
        const baru = await setActivePlan(key);
        return baru === null
          ? { ralat: "Tak dapat jadikan pelan aktif sekarang." }
          : {
            aktif: true,
            message: "Pelan aktif ditetapkan.",
            sesiBaru: baru,
            href: plan.href,
            label: "Lihat pelan",
          };
      },
    },
  };
}

async function prepareRsvp(name: "rsvp_event" | "cancel_rsvp", args: Record<string, unknown>): Promise<ToolOutcome> {
  const id = Number(args.eventId);
  if (!Number.isInteger(id) || id <= 0) return errorOutcome("Pilih larian yang sah.");
  const event = await fetchEvent(id);
  if (!event) return errorOutcome("Larian itu tiada atau sudah dipadam.");
  if (closed(event)) return errorOutcome("Larian ini sudah tamat.");
  if (name === "rsvp_event" && event.mine) return errorOutcome("Awak dah RSVP larian ini.");
  if (name === "rsvp_event" && full(event)) return errorOutcome("Larian ini sudah penuh.");
  if (name === "cancel_rsvp" && !event.mine) return errorOutcome("Awak belum RSVP larian ini.");
  return {
    proposal: {
      title: name === "rsvp_event" ? "Saya datang" : "Batal RSVP",
      detail: `${event.title}\n${whenText(event.startsAt)} · ${event.location}`,
      href: `/account/events/view?id=${event.id}`,
      label: "Lihat larian",
      jalankan: async () => {
        const res = await api(`${EVENTS}/${event.id}/rsvp`, { method: name === "rsvp_event" ? "PUT" : "DELETE" }).catch(() => null);
        if (!res) return { ralat: "Tiada sambungan. Semak internet dan cuba lagi." };
        if (!res.ok) return { ralat: await eventError(res) };
        return {
          rsvp: name === "rsvp_event",
          message: name === "rsvp_event" ? "RSVP disimpan." : "RSVP dibatalkan.",
          href: `/account/events/view?id=${event.id}`,
          label: "Lihat larian",
        };
      },
    },
  };
}

async function runConditions(args: Record<string, unknown>): Promise<ToolResult> {
  const wanted = textValue(args.negeri, 80) || readLocation() || "";
  const state = STATES.find(
    (s) => s.nama.toLowerCase() === wanted.toLowerCase() || s.nama.toLowerCase().replace(/^wp /, "") === wanted.toLowerCase(),
  );
  if (!state)
    return {
      ralat: "Negeri belum dipilih. Beritahu negeri atau pilih lokasi di Nubi.",
      negeri: STATES.map((s) => s.nama),
    };

  const today = todayMY();
  const [air, forecast, prayer] = await Promise.all([
    fetchAqi(state.nama),
    fetchForecast(state.met),
    fetchPrayerTimes(state.zon),
  ]);
  const station = air ? highestAqi(air) : null;
  const level = station?.api != null ? aqiLevel(station.api) : null;
  const day = forecast?.find((d) => d.date === today) ?? forecast?.[0] ?? null;
  const windows = prayer ? runWindows(prayer, nowTimeMY(), day) : [];
  return {
    negeri: state.nama,
    tarikh: today,
    aqi: station && level
      ? { nilai: station.api, label: level.label, nasihat: level.nasihat, stesen: station.station, bahan: station.pollutant }
      : null,
    cuaca: day
      ? { ringkasan: day.summary, min: day.min, max: day.max, nasihat: weatherAdvice(day) }
      : null,
    waktuLari: windows.map((w) => ({ nama: w.nama, dari: w.dari, hingga: w.hingga, nota: w.nota, ribut: w.ribut })),
    nota: !air || !forecast || !prayer ? "Sebahagian data cuaca/solat tak dapat dimuatkan." : null,
  };
}

async function trainingSummary(args: Record<string, unknown>): Promise<ToolResult> {
  const days = Math.min(365, Math.max(1, Number(args.days) || 28));
  const from = addDays(todayMY(), -days);
  const [activities, active] = await Promise.all([activitiesBetween(from), activePlanState()]);
  const rows = activities ?? [];
  const distanceM = rows.reduce((n, a) => n + (Number(a.distanceM) || 0), 0);
  const movingS = rows.reduce((n, a) => n + (Number(a.movingS) || 0), 0);
  let plan: ToolResult | null = null;
  if (active.ok) {
    const p = active.plan;
    const done = new Set(readList(p.kunci));
    const next = p.sesi.find((s) => !done.has(s.id));
    const info = describePlan(p.kunci);
    const today = todayMY();
    const monday = addDays(today, -((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7));
    const sunday = addDays(monday, 6);
    const mingguIni = p.sesi
      .filter((s) => s.tarikh >= monday && s.tarikh <= sunday)
      .map((s) => ({
        id: s.id,
        label: sessionLabel(s),
        tarikh: s.tarikh,
        jenis: s.jenis,
        minit: s.minit,
        jalan: !!s.walk,
        siap: done.has(s.id),
      }));
    plan = {
      nama: info?.name ?? p.kunci,
      href: info?.href ?? "/account/plans",
      jalan: p.walkUntil,
      siap: done.size,
      jumlah: p.sesi.length,
      sesiSeterusnya: next ? { id: next.id, label: sessionLabel(next), tarikh: next.tarikh } : null,
      mingguIni,
      mingguIniDari: monday,
      mingguIniHingga: sunday,
    };
  }
  return {
    hari: days,
    aktiviti: { bilangan: rows.length, jarakKm: +(distanceM / 1000).toFixed(2), masaMin: Math.round(movingS / 60) },
    pelanAktif: plan,
    nota: activities === null ? "Aktiviti tak dapat dimuatkan sekarang." : null,
  };
}

function listRaces(args: Record<string, unknown>): ToolResult {
  const negeri = textValue(args.negeri, 60).toLowerCase();
  const today = todayMY();
  const races = RACES
    .filter((r) => r.tarikh >= today && (!negeri || r.negeri.toLowerCase().includes(negeri)))
    .slice(0, 20)
    .map((r) => ({
      id: r.id,
      nama: r.nama,
      tarikh: r.tarikh,
      mula: r.mula,
      tempat: r.tempat,
      negeri: r.negeri,
      jarak: r.jarak,
      yuran: r.yuran ?? null,
      tutup: r.tutup ?? null,
      pautan: r.pautan,
    }));
  return { hariIni: today, races };
}

async function activityDetail(args: Record<string, unknown>): Promise<ToolOutcome> {
  const id = Number(args.id);
  if (!Number.isInteger(id) || id <= 0) return { result: { ralat: "Aktiviti tak sah." } };
  const res = await api(`/me/apps/nubi/activities/${id}`).catch(() => null);
  if (!res?.ok) return { result: { ralat: "Aktiviti itu tiada dalam akaun ini." } };
  const a = (await json(res)).data as Record<string, unknown>;
  const ringkasan = activitySummary(a);
  const out: ToolResult = { activity: ringkasan };
  const file = await api(`/me/apps/nubi/activities/${id}/file`).catch(() => null);
  if (!file?.ok) return { result: { ...out, nota: "Fail FIT tak dapat dimuatkan; ringkasan sahaja." } };
  try {
    const { records: rekod, weather } = await fitData(await file.arrayBuffer());
    if (weather) out.cuaca = weather;
    const hr = heartSeries(rekod);
    if (typeof a.maxHr === "number" && a.maxHr > 0 && hr.length) out.hrZones = hrZones(hr, a.maxHr);
    const alt = altitudeSeries(rekod);
    if (alt.length) {
      const heights = alt.map(([, m]) => m);
      out.ketinggian = { min: Math.round(Math.min(...heights)), max: Math.round(Math.max(...heights)) };
    }
    const matched = await sessionFor(a as never).catch(() => null);
    if (matched && (matched.sesi.jenis === "interval" || matched.sesi.jenis === "tempo")) {
      const c = checkSession(rekod, matched.sesi.segmen, matched.sesi.usaha);
      if (c)
        out.semakanSesi = {
          sesi: sessionLabel(matched.sesi),
          sasaranSPerKm: c.target,
          lulus: c.lulus,
          jumlah: c.jumlah,
          purataSPerKm: c.purata,
        };
    }
    const route = routeOf(rekod);
    return {
      result: out,
      ...(route.length >= 2
        ? {
          view: {
            activityId: id,
            route,
            name: ringkasan.name,
            startedAt:
              typeof ringkasan.startedAt === "string"
                ? ringkasan.startedAt
                : "",
            distanceM: Number(a.distanceM) || 0,
            movingS: Number(a.movingS) || 0,
          },
        }
        : {}),
    };
  } catch {
    out.nota = "Fail FIT tak dapat dibaca; ringkasan sahaja.";
    return { result: out };
  }
}

async function prepareWalk(args: Record<string, unknown>): Promise<ToolOutcome> {
  const days = Number(args.days);
  if (!Number.isInteger(days) || days < 0 || days > 28)
    return errorOutcome("Hari mod jalan mesti 0-28. 0 = tamatkan.");
  const st = await activePlanState();
  if (!st.ok)
    return errorOutcome(
      st.sebab === "tiada"
        ? "Tiada pelan aktif. Jadikan pelan aktif dulu."
        : st.sebab === "enjin"
          ? "Pelan aktif guna enjin lama. Kemas kini pelan itu dulu."
          : "Pelan aktif belum ada tarikh mula.",
    );
  const until = days ? addDays(todayMY(), days - 1) : null;
  const info = describePlan(st.plan.kunci);
  const dateText = until
    ? new Date(`${until}T00:00:00`).toLocaleDateString("ms-MY", { day: "numeric", month: "long" })
    : "";
  return {
    proposal: {
      title: days ? `Mod jalan ${days} hari` : "Tamatkan mod jalan",
      detail: days
        ? `Sesi lari pelan aktif jadi jalan santai sehingga ${dateText}. Tarikh pelan dan sesi ujian/lumba tak berubah.`
        : "Sesi lari pelan aktif kembali normal.",
      ...(info ? { href: info.href, label: "Lihat pelan" } : {}),
      jalankan: async () => {
        const ok = await setWalkUntil(until);
        return ok
          ? {
              disimpan: true,
              jalan: until,
              message: days ? `Mod jalan ${days} hari disimpan.` : "Mod jalan ditamatkan.",
              ...(info ? { href: info.href, label: "Lihat pelan" } : {}),
            }
          : { ralat: "Mod jalan tak dapat disimpan. Cuba lagi." };
      },
    },
  };
}

async function prepareMark(args: Record<string, unknown>): Promise<ToolOutcome> {
  const sessionId = textValue(args.sessionId, 20);
  if (!sessionId) return errorOutcome("Sesi yang nak ditanda tiada.");
  const st = await activePlanState();
  if (!st.ok)
    return errorOutcome(
      st.sebab === "mula"
        ? "Pelan aktif belum ada tarikh mula. Set tarikh mula dulu."
        : st.sebab === "enjin"
          ? "Pelan aktif guna enjin lama. Kemas kini pelan itu dulu."
          : "Tiada pelan aktif. Jadikan pelan aktif dulu.",
    );
  const sesi = st.plan.sesi.find((s) => s.id === sessionId);
  if (!sesi) return errorOutcome("Sesi itu tiada dalam pelan aktif.");
  if (readList(st.plan.kunci).includes(sessionId)) return errorOutcome("Sesi itu dah ditanda siap.");
  const info = describePlan(st.plan.kunci);
  return {
    proposal: {
      title: "Tanda sesi siap",
      detail: `${sessionLabel(sesi)}\n${sesi.tarikh}`,
      ...(info ? { href: info.href, label: "Lihat pelan" } : {}),
      jalankan: async () => {
        const siap = new Set(readList(st.plan.kunci));
        siap.add(sessionId);
        writeList(st.plan.kunci, [...siap]);
        const awan = await saveToCloud(st.plan.kunci);
        if (awan !== "ok") syncProgress(st.plan.kunci);
        return {
          disimpan: true,
          message: "Sesi ditanda siap.",
          href: info?.href ?? "/account/plans",
          label: "Lihat pelan",
          awan,
        };
      },
    },
  };
}

/** Jalankan tool. Baca pulang result; tulis pulang proposal yang hanya berjalan selepas Sahkan. */
export async function runTool(name: string, rawArgs: string): Promise<ToolOutcome> {
  const args = parseToolArgs(rawArgs);
  if (args.ralat) return { result: args };
  try {
    if (name === "mark_session_done") return await prepareMark(args);
    if (name === "set_walk_mode") return await prepareWalk(args);
    if (name === "update_profile") return await prepareProfile(args);
    if (name === "create_plan" || name === "update_plan") return await preparePlan(name, args);
    if (name === "set_active_plan") return await prepareActive(args);
    if (name === "rsvp_event" || name === "cancel_rsvp") return await prepareRsvp(name, args);

    switch (name) {
      case "get_profile":
        return { result: { profile: await readProfile() } };
      case "list_plans":
        return { result: await listPlans() };
      case "get_plan": {
        await pullCloud();
        const key = textValue(args.key, 100);
        const plan = key ? describePlan(key) : null;
        return {
          result: plan
            ? { key: plan.key, name: plan.name, detail: plan.detail, done: plan.done, total: plan.total, params: plan.params, href: plan.href }
            : { ralat: "Pelan itu tiada dalam akaun ini." },
        };
      }
      case "open_plan": {
        await pullCloud();
        const key = textValue(args.key, 100);
        const plan = key ? describePlan(key) : null;
        return {
          result: plan
            ? { title: "Pelan anda", message: plan.name, href: plan.href, label: "Buka pelan" }
            : { ralat: "Pelan itu tiada dalam akaun ini." },
        };
      }
      case "list_activities":
        return { result: await listActivities(args) };
      case "list_events": {
        const events = await fetchEvents(false);
        return { result: events ? { events: events.slice(0, 20).map(eventSummary) } : { ralat: "Tak dapat baca larian kumpulan sekarang." } };
      }
      case "get_run_conditions":
        return { result: await runConditions(args) };
      case "get_training_summary":
        return { result: await trainingSummary(args) };
      case "list_races":
        return { result: listRaces(args) };
      case "get_activity_detail":
        return activityDetail(args);
      default:
        return { result: { ralat: "Tool tak dikenali." } };
    }
  } catch {
    return { result: { ralat: "Tool gagal dijalankan." } };
  }
}

/** Hasil tool untuk model: JSON, dipotong pada 8,000 aksara seperti kontrak backend. */
export function toolContent(result: ToolResult): string {
  const text = JSON.stringify(result);
  return text.length <= 8000 ? text : `${text.slice(0, 7950)}…(dipotong)`;
}
