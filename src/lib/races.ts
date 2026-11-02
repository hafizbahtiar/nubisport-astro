// Kalendar lumba (/races, pilihan lumba dalam borang pelan, tool NUNI list_races). Data dari API:
// GET /api/v1/public/nubi/races - lumba dari hari ini (waktu Malaysia), diurus owner di portfolio /admin/nubi/races
// dari laman rasmi penganjur (AI + Clef semak duplikasi). Dulu susun tangan dalam src/data/races.ts.
import { buildIcs } from "./ics";

export interface RaceCategory {
  name: string; // "21KM", "Half Marathon", "Kids Dash"
  distanceKm: number | null;
  startTime: string | null;
  fees: { tier: string; amountRm: number }[]; // "Early Bird" RM120 ...
}

export interface Race {
  id: number;
  slug: string; // stabil - UID kalendar
  name: string;
  raceDate: string; // hari pertama, YYYY-MM-DD, waktu Malaysia
  endDate: string | null; // lumba beberapa hari
  startTime: string; // HH:MM flag-off pertama
  venue: string;
  state: string;
  categories: RaceCategory[];
  registrationOpens: string | null;
  registrationCloses: string | null;
  organiser: string | null;
  url: string; // laman lumba (penganjur / platform pendaftaran)
  checkedOn: string; // YYYY-MM-DD
}

/** Label jarak seperti borang pelan: 21.0975 -> "21K", 42.195 -> "42K", 5 -> "5K"; tiada jarak = null. */
export const distanceLabel = (km: number | null): string | null =>
  km == null ? null : `${km >= 42 && km < 43 ? 42 : km >= 21 && km < 22 ? 21 : Math.round(km * 10) / 10}K`;

/** Label jarak lumba, tanpa ulang ("21K", "10K"); kategori tanpa jarak guna namanya. */
export const raceDistances = (r: Race): string[] => [...new Set(r.categories.map((c) => distanceLabel(c.distanceKm) ?? c.name))];

/** Yuran terendah (semua kategori, semua peringkat), atau null. */
export const lowestFee = (r: Race): number | null => {
  const all = r.categories.flatMap((c) => c.fees.map((f) => f.amountRm));
  return all.length ? Math.min(...all) : null;
};

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
        keterangan: `${raceDistances(r).join(" / ")} · ${r.venue}, ${r.state}\n${r.url}`,
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
