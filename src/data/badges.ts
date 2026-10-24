// Katalog lencana (data sahaja) - selamat diimport oleh halaman awam tanpa menarik
// plan engine/cloud-sync melalui lib/badges.ts. Logik server/klien kekal di lib/badges.ts.
import type { IconName } from "../lib/icon";

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
