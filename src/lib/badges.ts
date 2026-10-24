// Lencana + misi Nubi. Katalog data-only di ../data/badges.ts; server (GET/POST
// /me/apps/nubi/badges) yang mengira aktiviti/kehadiran dan menyimpan lencana.
// Plan proof datang dari pelan awan yang lengkap.
import { api, json } from "./api";
import { savedPlans } from "./plan-list";
import type { BadgeId } from "../data/badges";

export { BADGES } from "../data/badges";
export type { BadgeDef, BadgeId } from "../data/badges";

export interface Badge {
  id: BadgeId;
  earnedAt: string;
}

export interface Mission {
  id: "weekly_3_runs" | "monthly_50k";
  progress: number;
  target: number;
  unit: "sessions" | "km";
  periodStart: string;
  periodEnd: string;
}

export interface BadgeState {
  earned: Badge[];
  missions: Mission[];
  newlyEarned: BadgeId[];
}

export interface PlanProof {
  key: string;
  done: number;
  total: number;
}

const API = "/me/apps/nubi/badges";

export async function loadBadgeState(): Promise<BadgeState | null> {
  const res = await api(API, { cache: "no-store" }).catch(() => null);
  return res?.ok ? ((await json(res)).data as BadgeState) : null;
}

export async function evaluateBadges(plan?: PlanProof): Promise<BadgeState | null> {
  const res = await api(`${API}/evaluate`, {
    method: "POST",
    body: JSON.stringify(plan ? { plan } : {}),
  }).catch(() => null);
  return res?.ok ? ((await json(res)).data as BadgeState) : null;
}

/** Pelan yang lengkap dan sudah berada dalam senarai pelan (termasuk hasil pullCloud). */
export function planProofFromSavedPlans(): PlanProof | undefined {
  const plan = savedPlans().find((p) => p.total > 0 && p.done >= p.total);
  return plan ? { key: plan.key, done: plan.done, total: plan.total } : undefined;
}

export const MISSION_LABELS: Record<Mission["id"], string> = {
  weekly_3_runs: "3 larian minggu ini",
  monthly_50k: "50 km bulan ini",
};
