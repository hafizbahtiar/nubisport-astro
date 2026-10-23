// Kalkulator pace (/pace) + "pelan seterusnya" selepas hari ujian/lumba. Fungsi tulen, dalam pelayar.
// Semak: bun scripts/check-pace.ts
import { PLAN_MONTHS, TIME_MAX, TIME_MIN, weeksNeeded, formatPace, TARGET_MINUTES } from "./plan-5k";
import { formatTime, DISTANCES, riegel } from "./distance-plan";

export const RACE_DISTANCES = [
  { id: "5k", nama: "5K", km: 5 },
  { id: "10k", nama: "10K", km: 10 },
  { id: "21k", nama: "21K (separuh maraton)", km: 21.0975 },
  { id: "42k", nama: "42K (maraton)", km: 42.195 },
] as const;
export const KM_MIN = 0.4;
export const KM_MAX = 100;
// Pace munasabah: 2:30/km (elit) hingga 15:00/km (jalan santai).
const PACE_MIN = 150;
const PACE_MAX = 900;

/** "1:05:30", "28:45", "28" (minit), "28.5" -> minit; null jika tidak sah. */
export function parseTime(s: string): number | null {
  const t = s.trim();
  if (/^\d+([.,]\d+)?$/.test(t)) return Number(t.replace(",", ".")) || null;
  const m = t.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
  if (!m || Number(m[3]) > 59 || (m[1] && Number(m[2]) > 59)) return null;
  return Number(m[1] ?? 0) * 60 + Number(m[2]) + Number(m[3]) / 60 || null;
}

export type PaceResult =
  | { ok: false; sebab: string }
  | { ok: true; km: number; minit: number; paceSaat: number; kmj: number; ramalan: { nama: string; minit: number }[] };

/** Satu dari `masa` (minit) atau `paceSaat` (s/km) + jarak -> yang satu lagi, laju, dan ramalan Riegel. */
export function calcPace(km: number, masa?: number, paceSaat?: number): PaceResult {
  if (!(km >= KM_MIN && km <= KM_MAX)) return { ok: false, sebab: `Jarak mesti ${KM_MIN}-${KM_MAX} km.` };
  if (masa === undefined && paceSaat === undefined) return { ok: false, sebab: "Masukkan masa atau pace." };
  const p = paceSaat ?? (masa! * 60) / km;
  if (!(p >= PACE_MIN && p <= PACE_MAX))
    return { ok: false, sebab: `Pace ${formatPace(p)}/km di luar julat ${formatPace(PACE_MIN)}-${formatPace(PACE_MAX)}/km - semak masa dan jarak.` };
  const minit = masa ?? (p * km) / 60;
  return {
    ok: true,
    km,
    minit,
    paceSaat: p,
    kmj: 3600 / p,
    // Riegel kurang tepat untuk jarak yang jauh beza (contoh 5K -> maraton) - page melabelnya.
    ramalan: RACE_DISTANCES.filter((l) => Math.abs(l.km - km) > 0.05).map((l) => ({ nama: l.nama, minit: riegel(minit, km, l.km) })),
  };
}

export type TestDistance = "5k" | "10k" | "21k" | "42k";
export interface NextStep {
  teks: string;
  pautan: { href: string; label: string }[];
}

/**
 * Selepas hari ujian 5K / lumba 10K / 21K / 42K: cadang pelan seterusnya dari masa sebenar.
 * `pelan5k` = laluan page 5K yang sedang dibuka (/plan-5k atau /account/plans/5k/new).
 */
export function nextPlan(dari: TestDistance, minitSebenar: number, hari: number, pelan5k = "/plan-5k"): NextStep {
  const m = Math.ceil(minitSebenar - 1e-9); // bundar ke atas: lebih selamat untuk pelan
  const q = (o: Record<string, string | number>) =>
    new URLSearchParams(Object.entries(o).map(([k, v]) => [k, String(v)])).toString();
  const ke10k = (label: string) => ({ href: `${DISTANCES["10k"].halaman}?${q({ jarak: "10k", minggu: 10, hari, masa: m })}`, label });

  if (dari === "5k") {
    if (m < TIME_MIN || m > TIME_MAX) return { teks: `Masa 5K ${formatTime(minitSebenar)}? Semak semula - pelan perlukan ${TIME_MIN}-${TIME_MAX} minit.`, pautan: [] };
    if (m <= TARGET_MINUTES)
      return {
        teks: `5K dalam ${formatTime(minitSebenar)} - bawah 30 minit. Tahniah! Langkah seterusnya: 10K (anggaran sekarang ~${formatTime(riegel(minitSebenar, 5, 10))}).`,
        pautan: [ke10k("Buat pelan 10K")],
      };
    const perlu = weeksNeeded("5k", m);
    const bulan = PLAN_MONTHS.find((b) => b * 4 >= perlu) ?? PLAN_MONTHS[PLAN_MONTHS.length - 1];
    return {
      teks: `5K dalam ${formatTime(minitSebenar)}. Belum bawah 30 minit - tak apa, itu titik mula yang baru. Ulang pelan 5K dari masa ini (${bulan} bulan), atau terus ke 10K untuk habis dengan selamat.`,
      pautan: [
        { href: `${pelan5k}?${q({ bulan, tahap: "5k", masa: m, hari })}`, label: `Pelan 5K baru (${m} min)` },
        ke10k("Pelan 10K"),
      ],
    };
  }
  if (dari === "10k") {
    const p = DISTANCES["21k"].prasyarat;
    if (m < p.min || m > p.max) return { teks: `Masa 10K ${formatTime(minitSebenar)}? Pelan 21K perlukan ${p.min}-${p.max} minit.`, pautan: [] };
    return {
      teks: `10K dalam ${formatTime(minitSebenar)}. Tahniah! Langkah seterusnya: separuh maraton (anggaran sekarang ~${formatTime(riegel(minitSebenar, 10, 21.0975))}).`,
      pautan: [{ href: `${DISTANCES["21k"].halaman}?${q({ jarak: "21k", minggu: 16, hari, masa: m })}`, label: "Buat pelan 21K" }],
    };
  }
  if (dari === "21k") {
    const p = DISTANCES["42k"].prasyarat;
    if (m < p.min || m > p.max) return { teks: `Masa 21K ${formatTime(minitSebenar)}? Pelan 42K perlukan ${p.min}-${p.max} minit.`, pautan: [] };
    return {
      teks: `Separuh maraton dalam ${formatTime(minitSebenar)}. Tahniah! Ramalan maraton ~${formatTime(riegel(minitSebenar, 21.0975, 42.195))} (anggaran kasar). Rehat seminggu dua dulu sebelum mula pelan maraton.`,
      pautan: [{ href: `${DISTANCES["42k"].halaman}?${q({ jarak: "42k", minggu: DISTANCES["42k"].mingguLalai, hari, masa: m })}`, label: "Buat pelan 42K" }],
    };
  }
  return {
    teks: `Maraton dalam ${formatTime(minitSebenar)}. Tahniah - anda pelari maraton! Rehat 2-3 minggu (lari mudah sahaja) sebelum pelan seterusnya.`,
    pautan: [],
  };
}
