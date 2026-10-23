// Tool Nubi AI yang berjalan dalam pelayar. Backend hanya menghantar nama + skema; di sini
// setiap tool guna laluan /me sedia ada dengan sesi ahli. Baca terus; tulis = cadangan + kad
// Sahkan. Tiada tool padam.
import { api, json } from "./api";
import { pullCloud, saveToCloud } from "./cloud-sync";
import { describePlan, savedPlans } from "./plan-list";
import { previewPlan, savePlan, type PlanKind } from "./plan-save";
import { setActivePlan } from "./plan-sync";
import { readProfile, saveProfile, type TrainingProfile } from "./profile";
import { DISTANCES } from "./distance-plan";
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
  jalankan: () => Promise<ToolResult>;
}
export type ToolOutcome =
  | { result: ToolResult }
  | { proposal: ToolProposal };

export const WRITE_TOOLS = new Set([
  "update_profile",
  "create_plan",
  "update_plan",
  "set_active_plan",
  "rsvp_event",
  "cancel_rsvp",
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

const teks = (v: unknown, max = 500) => (typeof v === "string" ? v.slice(0, max) : "");
const ralat = (message: string): ToolOutcome => ({ result: { ralat: message } });

/** Ringkasan aktiviti - tiada koordinat, fail, atau id pengguna. */
export function activitySummary(a: Record<string, unknown>) {
  const m = Number(a.distanceM) || 0;
  const s = Number(a.movingS) || 0;
  return {
    id: a.id,
    startedAt: a.startedAt,
    sport: a.sport,
    name: teks(a.name, 120),
    distanceKm: +((m / 1000).toFixed(2)),
    movingMin: Math.round(s / 60),
    paceSPerKm: m > 0 ? Math.round(s / (m / 1000)) : null,
    avgHr: a.avgHr ?? null,
    maxHr: a.maxHr ?? null,
    runRatio: a.runRatio ?? null,
  };
}

const ringkasAcara = (a: Acara) => ({
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
  if (!kind) return ralat("Pilih jarak 5K, 10K, 21K atau 42K.");
  const key = name === "update_plan" ? teks(args.key, 100) : "";
  if (name === "update_plan" && !key) return ralat("Pelan yang nak diubah tiada.");
  if (key) await pullCloud();
  const raw = { ...args };
  delete raw.key;
  delete raw.distance;
  delete raw.jarak;
  const preview = previewPlan(kind, raw, key || undefined);
  if (!preview.ok) return ralat(preview.error);
  const existing = key ? describePlan(key) : null;
  return {
    proposal: {
      title: `${name === "create_plan" ? "Cipta pelan" : "Ubah pelan"}: ${planDetail(kind, preview.params)}`,
      detail: name === "update_plan" && existing ? existing.name : "Pelan ini akan disimpan dalam akaun awak.",
      jalankan: async () => {
        const saved = savePlan(kind, raw, key || undefined);
        if (!saved.ok) return { ralat: saved.error };
        const awan = await saveToCloud(saved.key);
        return { disimpan: true, key: saved.key, href: saved.href, awan };
      },
    },
  };
}

async function prepareProfile(args: Record<string, unknown>): Promise<ToolOutcome> {
  const parsed = profileChanges(args);
  if (!parsed.ok) return ralat(parsed.error);
  const current = await readProfile();
  const changes = parsed.changes;
  const lines = Object.entries(changes)
    .filter(([key, value]) => String(current[key as keyof TrainingProfile] ?? "") !== String(value))
    .map(([key, value]) => `${PROFILE[key].label}: ${current[key as keyof TrainingProfile] || "kosong"} → ${value}`);
  if (!lines.length) return ralat("Tiada perubahan profil.");
  const merged = { ...current, ...changes };
  return {
    proposal: {
      title: "Kemas kini profil",
      detail: lines.join("\n"),
      jalankan: async () => {
        if (!(await saveProfile(merged))) return { ralat: "Tak dapat simpan profil sekarang." };
        return { disimpan: true, fields: Object.keys(changes) };
      },
    },
  };
}

async function prepareActive(args: Record<string, unknown>): Promise<ToolOutcome> {
  const key = teks(args.key, 100);
  if (key) await pullCloud();
  const plan = key ? describePlan(key) : null;
  if (!plan) return ralat("Pelan itu tiada dalam akaun ini.");
  return {
    proposal: {
      title: "Jadikan pelan aktif",
      detail: plan.name,
      jalankan: async () => {
        const baru = await setActivePlan(key);
        return baru === null ? { ralat: "Tak dapat jadikan pelan aktif sekarang." } : { aktif: true, sesiBaru: baru };
      },
    },
  };
}

async function prepareRsvp(name: "rsvp_event" | "cancel_rsvp", args: Record<string, unknown>): Promise<ToolOutcome> {
  const id = Number(args.eventId);
  if (!Number.isInteger(id) || id <= 0) return ralat("Pilih larian yang sah.");
  const event = await fetchEvent(id);
  if (!event) return ralat("Larian itu tiada atau sudah dipadam.");
  if (closed(event)) return ralat("Larian ini sudah tamat.");
  if (name === "rsvp_event" && event.mine) return ralat("Awak dah RSVP larian ini.");
  if (name === "rsvp_event" && full(event)) return ralat("Larian ini sudah penuh.");
  if (name === "cancel_rsvp" && !event.mine) return ralat("Awak belum RSVP larian ini.");
  return {
    proposal: {
      title: name === "rsvp_event" ? "Saya datang" : "Batal RSVP",
      detail: `${event.title}\n${whenText(event.startsAt)} · ${event.location}`,
      jalankan: async () => {
        const res = await api(`${EVENTS}/${event.id}/rsvp`, { method: name === "rsvp_event" ? "PUT" : "DELETE" }).catch(() => null);
        if (!res) return { ralat: "Tiada sambungan. Semak internet dan cuba lagi." };
        if (!res.ok) return { ralat: await eventError(res) };
        return { rsvp: name === "rsvp_event" };
      },
    },
  };
}

/** Jalankan tool. Baca pulang result; tulis pulang proposal yang hanya berjalan selepas Sahkan. */
export async function runTool(name: string, rawArgs: string): Promise<ToolOutcome> {
  const args = parseToolArgs(rawArgs);
  if (args.ralat) return { result: args };
  try {
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
        const key = teks(args.key, 100);
        const plan = key ? describePlan(key) : null;
        return {
          result: plan
            ? { key: plan.key, name: plan.name, detail: plan.detail, done: plan.done, total: plan.total, params: plan.params }
            : { ralat: "Pelan itu tiada dalam akaun ini." },
        };
      }
      case "list_activities":
        return { result: await listActivities(args) };
      case "list_events": {
        const events = await fetchEvents(false);
        return { result: events ? { events: events.slice(0, 20).map(ringkasAcara) } : { ralat: "Tak dapat baca larian kumpulan sekarang." } };
      }
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
