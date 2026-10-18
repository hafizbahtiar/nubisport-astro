// Kalkulator pace (/pace) + "pelan seterusnya" selepas hari ujian/lumba. Fungsi tulen, dalam pelayar.
// Semak: bun scripts/check-pace.ts
import { BULAN, MASA_MAX, MASA_MIN, mingguPerlu, pace, SASARAN_MINIT } from "./pelan-5k";
import { jam, JARAK, riegel } from "./pelan-jarak";

export const LUMBA = [
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

/** "1:05:30", "28:45", "28" (minit), "28.5" -> minit; null jika tak sah. */
export function bacaMasa(s: string): number | null {
  const t = s.trim();
  if (/^\d+([.,]\d+)?$/.test(t)) return Number(t.replace(",", ".")) || null;
  const m = t.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
  if (!m || Number(m[3]) > 59 || (m[1] && Number(m[2]) > 59)) return null;
  return Number(m[1] ?? 0) * 60 + Number(m[2]) + Number(m[3]) / 60 || null;
}

export type HasilPace =
  | { ok: false; sebab: string }
  | { ok: true; km: number; minit: number; paceSaat: number; kmj: number; ramalan: { nama: string; minit: number }[] };

/** Satu dari `masa` (minit) atau `paceSaat` (s/km) + jarak -> yang satu lagi, laju, dan ramalan Riegel. */
export function kiraPace(km: number, masa?: number, paceSaat?: number): HasilPace {
  if (!(km >= KM_MIN && km <= KM_MAX)) return { ok: false, sebab: `Jarak mesti ${KM_MIN}-${KM_MAX} km.` };
  if (masa === undefined && paceSaat === undefined) return { ok: false, sebab: "Masukkan masa atau pace." };
  const p = paceSaat ?? (masa! * 60) / km;
  if (!(p >= PACE_MIN && p <= PACE_MAX))
    return { ok: false, sebab: `Pace ${pace(p)}/km di luar julat ${pace(PACE_MIN)}-${pace(PACE_MAX)}/km - semak masa dan jarak.` };
  const minit = masa ?? (p * km) / 60;
  return {
    ok: true,
    km,
    minit,
    paceSaat: p,
    kmj: 3600 / p,
    // Riegel kurang tepat untuk jarak yang jauh beza (contoh 5K -> maraton) - page melabelnya.
    ramalan: LUMBA.filter((l) => Math.abs(l.km - km) > 0.05).map((l) => ({ nama: l.nama, minit: riegel(minit, km, l.km) })),
  };
}

export type Dari = "5k" | "10k" | "21k";
export interface Seterusnya {
  teks: string;
  pautan: { href: string; label: string }[];
}

/**
 * Selepas hari ujian 5K / lumba 10K / 21K: cadang pelan seterusnya dari masa sebenar.
 * `pelan5k` = laluan page 5K yang sedang dibuka (/pelan-5k atau /account/pelan-5k).
 */
export function pelanSeterusnya(dari: Dari, minitSebenar: number, hari: number, pelan5k = "/pelan-5k"): Seterusnya {
  const m = Math.ceil(minitSebenar - 1e-9); // bundar ke atas: lebih selamat untuk pelan
  const q = (o: Record<string, string | number>) =>
    new URLSearchParams(Object.entries(o).map(([k, v]) => [k, String(v)])).toString();
  const ke10k = (label: string) => ({ href: `/account/pelan-jarak?${q({ jarak: "10k", minggu: 10, hari, masa: m })}`, label });

  if (dari === "5k") {
    if (m < MASA_MIN || m > MASA_MAX) return { teks: `Masa 5K ${jam(minitSebenar)}? Semak semula - pelan perlukan ${MASA_MIN}-${MASA_MAX} minit.`, pautan: [] };
    if (m <= SASARAN_MINIT)
      return {
        teks: `5K dalam ${jam(minitSebenar)} - bawah 30 minit. Tahniah! Langkah seterusnya: 10K (anggaran sekarang ~${jam(riegel(minitSebenar, 5, 10))}).`,
        pautan: [ke10k("Buat pelan 10K")],
      };
    const perlu = mingguPerlu("5k", m);
    const bulan = BULAN.find((b) => b * 4 >= perlu) ?? BULAN[BULAN.length - 1];
    return {
      teks: `5K dalam ${jam(minitSebenar)}. Belum bawah 30 minit - tak apa, itu titik mula yang baru. Ulang pelan 5K dari masa ini (${bulan} bulan), atau terus ke 10K untuk habis dengan selamat.`,
      pautan: [
        { href: `${pelan5k}?${q({ bulan, tahap: "5k", masa: m, hari })}`, label: `Pelan 5K baru (${m} min)` },
        ke10k("Pelan 10K"),
      ],
    };
  }
  if (dari === "10k") {
    const p = JARAK["21k"].prasyarat;
    if (m < p.min || m > p.max) return { teks: `Masa 10K ${jam(minitSebenar)}? Pelan 21K perlukan ${p.min}-${p.max} minit.`, pautan: [] };
    return {
      teks: `10K dalam ${jam(minitSebenar)}. Tahniah! Langkah seterusnya: separuh maraton (anggaran sekarang ~${jam(riegel(minitSebenar, 10, 21.0975))}).`,
      pautan: [{ href: `/account/pelan-jarak?${q({ jarak: "21k", minggu: 16, hari, masa: m })}`, label: "Buat pelan 21K" }],
    };
  }
  return {
    teks: `Separuh maraton dalam ${jam(minitSebenar)}. Tahniah! Ramalan maraton ~${jam(riegel(minitSebenar, 21.0975, 42.195))} (anggaran kasar). Pelan maraton belum ada - rehat seminggu dua dulu.`,
    pautan: [],
  };
}
