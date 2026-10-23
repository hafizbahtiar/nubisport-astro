// Tool Nubi AI yang berjalan dalam pelayar. Backend hanya menghantar nama + skema; di sini
// setiap tool guna laluan /me sedia ada dengan sesi ahli. Fasa 1b = baca sahaja. Tool tulis
// (update_profile, create_plan, ...) belum dibuka; pulang ralat supaya model tak mereka cerita.
import { api, json } from "./api";
import { pullCloud } from "./cloud-sync";
import { describePlan, savedPlans } from "./plan-list";
import { readProfile } from "./profile";
import { fetchEvents, type Acara } from "./events";

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

/** Jalankan satu tool baca. Tool tulis / nama asing pulang { ralat }; tiada tulisan berlaku. */
export async function runTool(name: string, rawArgs: string): Promise<ToolResult> {
  if (WRITE_TOOLS.has(name))
    return { ralat: "Perubahan data belum dibuka dalam pembantu AI. Guna borang biasa dulu." };
  const args = parseToolArgs(rawArgs);
  if (args.ralat) return args;

  try {
    switch (name) {
      case "get_profile":
        return { profile: await readProfile() };
      case "list_plans":
        return await listPlans();
      case "get_plan": {
        await pullCloud();
        const key = teks(args.key, 100);
        const plan = key ? describePlan(key) : null;
        return plan
          ? { key: plan.key, name: plan.name, detail: plan.detail, done: plan.done, total: plan.total, params: plan.params }
          : { ralat: "Pelan itu tiada dalam akaun ini." };
      }
      case "list_activities":
        return await listActivities(args);
      case "list_events": {
        const events = await fetchEvents(false);
        return events ? { events: events.slice(0, 20).map(ringkasAcara) } : { ralat: "Tak dapat baca larian kumpulan sekarang." };
      }
      default:
        return { ralat: "Tool tak dikenali." };
    }
  } catch {
    return { ralat: "Tool gagal dijalankan." };
  }
}

/** Hasil tool untuk model: JSON, dipotong pada 8,000 aksara seperti kontrak backend. */
export function toolContent(result: ToolResult): string {
  const text = JSON.stringify(result);
  return text.length <= 8000 ? text : `${text.slice(0, 7950)}…(dipotong)`;
}
