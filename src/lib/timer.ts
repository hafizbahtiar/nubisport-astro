// Pemasa jalan-lari: kedudukan dalam sesi dikira dari masa berlalu (jam dinding), bukan dari
// kiraan tik - tab di latar / skrin dikunci melambatkan setInterval tetapi masa tetap betul.
// Semak: bun scripts/check-timer.ts
import type { Segment } from "./plan-5k";

export const SEGMENT_LABELS: Record<Segment["buat"], string> = {
  jalan: "Jalan",
  lari: "Lari",
  laju: "Laju",
  rehat: "Rehat",
};

export interface TimerPosition {
  i: number; // segmen semasa (= segmen.length bila selesai)
  baki: number; // saat tinggal dalam segmen semasa
  bakiJumlah: number; // saat tinggal untuk seluruh sesi
  selesai: boolean;
}

export const totalSeconds = (s: Segment[]) => s.reduce((a, x) => a + x.saat, 0);

/** `saat` = masa berlalu (boleh pecahan). */
export function positionAt(segmen: Segment[], saat: number): TimerPosition {
  const jumlah = totalSeconds(segmen);
  let mula = 0;
  for (let i = 0; i < segmen.length; i++) {
    const akhir = mula + segmen[i].saat;
    if (saat < akhir) return { i, baki: akhir - saat, bakiJumlah: jumlah - saat, selesai: false };
    mula = akhir;
  }
  return { i: segmen.length, baki: 0, bakiJumlah: 0, selesai: true };
}

/** Saat berlalu pada permulaan segmen i (untuk "Langkau"). */
export const segmentStart = (segmen: Segment[], i: number) => totalSeconds(segmen.slice(0, i));

export function mmss(saat: number): string {
  const s = Math.max(0, Math.ceil(saat));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** "3 min" / "20 saat" / "1 min 30 saat". */
export function durationText(saat: number): string {
  const m = Math.floor(saat / 60);
  const s = saat % 60;
  return [m && `${m} min`, s && `${s} saat`].filter(Boolean).join(" ") || "0 saat";
}
