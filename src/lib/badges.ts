// Lencana + misi Nubi. Katalog UI di sini; server (GET/POST /me/apps/nubi/badges) yang mengira
// aktiviti/kehadiran dan menyimpan lencana. Plan proof datang dari pelan awan yang lengkap.
import { api, json } from "./api";
import { savedPlans } from "./plan-list";
import type { IconName } from "./icon";

export type BadgeId =
  | "first_5k"
  | "first_10k"
  | "four_week_streak"
  | "ten_attended"
  | "monthly_50k"
  | "plan_finished";

export interface BadgeDef {
  id: BadgeId;
  label: string;
  description: string;
  icon: IconName;
  hint: string;
}

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

export const BADGES: BadgeDef[] = [
  {
    id: "first_5k",
    label: "5K pertama",
    description: "Lari atau jalan 5 km dalam satu aktiviti.",
    icon: "medal",
    hint: "Muat naik aktiviti 5 km pertama.",
  },
  {
    id: "first_10k",
    label: "10K pertama",
    description: "Lari 10 km dalam satu aktiviti.",
    icon: "trofi",
    hint: "Muat naik aktiviti larian 10 km.",
  },
  {
    id: "four_week_streak",
    label: "4 minggu konsisten",
    description: "Bergerak dalam 4 minggu berturut-turut.",
    icon: "api",
    hint: "Lari atau jalan sekurang-kurangnya sekali setiap minggu.",
  },
  {
    id: "ten_attended",
    label: "10 larian kumpulan",
    description: "Hadir 10 larian kumpulan Nubi.",
    icon: "pengguna",
    hint: "Kehadiran sebenar yang ditanda pentadbir.",
  },
  {
    id: "monthly_50k",
    label: "50 km sebulan",
    description: "Kumpul 50 km larian atau jalan dalam satu bulan.",
    icon: "sasaran",
    hint: "Kumpul 50 km dalam mana-mana bulan.",
  },
  {
    id: "plan_finished",
    label: "Pelan siap",
    description: "Habiskan semua sesi satu pelan awan.",
    icon: "selesai",
    hint: "Simpan pelan ke awan dan tanda semua sesi siap.",
  },
];

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
