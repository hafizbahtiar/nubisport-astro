// Kalendar lumba (/races, pilihan lumba dalam borang pelan, tool NUNI list_races). Data dari API:
// GET /api/v1/public/nubi/races - lumba dari hari ini (waktu Malaysia), diurus owner di portfolio /admin/nubi/races
// dari laman rasmi penganjur (AI + Clef semak duplikasi). Dulu susun tangan dalam src/data/races.ts.
import { buildIcs } from "./ics";

export interface Race {
  id: number;
  slug: string; // stabil - UID kalendar
  name: string;
  raceDate: string; // YYYY-MM-DD, waktu Malaysia
  startTime: string; // HH:MM flag-off pertama
  venue: string;
  state: string;
  distances: string[];
  fee: string | null;
  registrationCloses: string | null;
  url: string; // laman rasmi penganjur
  checkedOn: string; // YYYY-MM-DD
}

let cache: Promise<Race[] | null> | null = null;

/** Lumba akan datang, terdekat dulu. null = API gagal. Satu fetch setiap page (dikongsi). */
export const fetchRaces = (): Promise<Race[] | null> =>
(cache ??= fetch("/api/v1/public/nubi/races")
  .then(async (r) => (r.ok ? (((await r.json()) as { data?: Race[] }).data ?? []) : null))
  .catch(() => null)
  .then((list) => {
    if (list === null) cache = null; // gagal: cuba lagi pada panggilan seterusnya
    return list;
  }));

/** Muat turun satu lumba sebagai fail .ics (dibina dalam pelayar). */
export function downloadRaceIcs(r: Race) {
  const ics = buildIcs(
    [
      {
        uid: `lumba-${r.slug}`,
        mula: new Date(`${r.raceDate}T${r.startTime}:00+08:00`),
        minit: 240, // shortcut: tempoh tetap 4 jam - penganjur tidak beri masa tamat yang seragam
        tajuk: r.name,
        keterangan: `${r.distances.join(" / ")} · ${r.venue}, ${r.state}\n${r.url}`,
      },
    ],
    { nama: r.name },
  );
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  a.download = `${r.slug}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
