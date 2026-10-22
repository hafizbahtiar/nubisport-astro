// Semakan sesi interval/tempo dari fail FIT: banding blok laju sebenar dengan sasaran pace
// dalam teks sesi pelan. Anggaran sahaja - segmen ikut masa pelan, bukan penilaian jurulatih.
// Semak: bun scripts/check-session-analysis.ts
import type { Segment } from "./plan-5k";

export interface BlockCheck {
  no: number;
  saat: number; // panjang segmen pelan
  pace: number | null; // s/km
  lulus: boolean | null; // pace <= sasaran + 15 s/km
}

export interface SessionCheck {
  target: number | null;
  targetFinal: boolean; // teks "sasaran akhir" (pelan tanpa masa 5K)
  blok: BlockCheck[];
  lulus: number;
  jumlah: number;
  purata: number | null;
}

const paceOf = (usaha: string): { pace: number; final: boolean } | null => {
  const m = usaha.match(/~(\d+):(\d{2})\/km/);
  if (!m) return null;
  return { pace: Number(m[1]) * 60 + Number(m[2]), final: /sasaran akhir/i.test(usaha) };
};

/**
 * `rekod` = record FIT mentah. Setiap blok `laju` dalam `segmen` dipetakan ke tetingkap masa
 * dari record pertama; pace = masa bergerak / jarak. Blok tanpa jarak cukup = null (bukan gagal).
 */
export function checkSession(
  rekod: Array<{
    timestamp?: Date | string | number;
    distance?: number;
    enhancedSpeed?: number;
    speed?: number;
  }>,
  segmen: Segment[] | undefined,
  usaha: string,
): SessionCheck | null {
  const steps = segmen ?? [];
  const quality = steps.filter((s) => s.buat === "laju");
  if (quality.length === 0 || rekod.length < 2) return null;

  const t0 = Number(new Date(rekod[0].timestamp ?? 0));
  if (!Number.isFinite(t0)) return null;

  const windows: { no: number; saat: number; from: number; to: number }[] = [];
  let masa = 0;
  let no = 0;
  for (const s of steps) {
    if (s.buat === "laju") {
      no++;
      windows.push({ no, saat: s.saat, from: masa, to: masa + s.saat });
    }
    masa += s.saat;
  }

  const target = paceOf(usaha);
  const blok = windows.map((w): BlockCheck => {
    let jarak = 0;
    let time = 0;
    for (let i = 0; i + 1 < rekod.length; i++) {
      const a = rekod[i];
      const b = rekod[i + 1];
      const ta = (Number(new Date(a.timestamp ?? 0)) - t0) / 1000;
      const tb = (Number(new Date(b.timestamp ?? 0)) - t0) / 1000;
      const tengah = (ta + tb) / 2;
      if (tengah < w.from || tengah >= w.to) continue;
      const dt = Math.min(10, tb - ta);
      if (!(dt > 0)) continue;
      const laju = a.enhancedSpeed ?? a.speed;
      const dd =
        typeof a.distance === "number" && typeof b.distance === "number"
          ? b.distance - a.distance
          : 0;
      if ((typeof laju === "number" && laju <= 0.5) || !(dd > 0)) continue;
      jarak += dd;
      time += dt;
    }
    const pace = jarak > 30 && time > 0 ? (time / jarak) * 1000 : null;
    return {
      no: w.no,
      saat: w.saat,
      pace,
      lulus: target && pace !== null ? pace <= target.pace + 15 : null,
    };
  });

  const diukur = blok.filter((b) => b.pace !== null);
  return {
    target: target?.pace ?? null,
    targetFinal: target?.final ?? false,
    blok,
    lulus: blok.filter((b) => b.lulus === true).length,
    jumlah: blok.length,
    purata: diukur.length
      ? diukur.reduce((n, b) => n + (b.pace ?? 0), 0) / diukur.length
      : null,
  };
}
