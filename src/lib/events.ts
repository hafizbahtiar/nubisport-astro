// Larian kumpulan (hono-workers /me/apps/nubi/events, migration 036): jenis, peranan, format dan
// tindakan yang dikongsi oleh /account/events (senarai admin + ahli), /account/events/new dan /account/events/view.
// Masa disimpan UTC; paparan dan borang ikut waktu Malaysia (UTC+8).
import { api, commonError, json, type CurrentUser } from "./api";
import { buildIcs } from "./ics";

export interface Acara {
  id: number;
  title: string;
  startsAt: string;
  location: string;
  distanceKm: number | null;
  pace: string | null;
  notes: string | null;
  capacity: number | null;
  going: number;
  attended: number;
  mine: boolean;
  mineAttended: boolean;
}

export const EVENTS = "/me/apps/nubi/events";

export const isEventAdmin = (s: CurrentUser | null) => s?.role === "owner" || s?.apps?.nubi === "admin";
export const isEventMember = (s: CurrentUser | null) => isEventAdmin(s) || s?.apps?.nubi === "ahli";

/** Senarai: ahli = akan datang; admin (`recent`) = termasuk 7 hari lepas, untuk tanda hadir. null = gagal. */
export async function fetchEvents(recent: boolean): Promise<Acara[] | null> {
  const res = await api(recent ? `${EVENTS}/recent` : EVENTS).catch(() => null);
  return res?.ok ? ((await json(res)).data?.items ?? []) : null;
}

/** Satu larian (lepas atau akan datang). null = tiada / gagal. */
export async function fetchEvent(id: number): Promise<Acara | null> {
  if (!id) return null;
  const res = await api(`${EVENTS}/${id}`).catch(() => null);
  return res?.ok ? ((await json(res)).data ?? null) : null;
}

export const started = (a: Acara, now = Date.now()) => now >= Date.parse(a.startsAt);
/** Tutup = 3 jam selepas mula (backend sama): tiada RSVP, hilang dari senarai ahli. */
export const closed = (a: Acara, now = Date.now()) => now > Date.parse(a.startsAt) + 3 * 3600e3;
/** Penuh sebelum mula sahaja (backend sama); yang dah RSVP masih boleh batal. */
export const full = (a: Acara, now = Date.now()) =>
  !!a.capacity && a.going >= a.capacity && !a.mine && !started(a, now);

const MY = { timeZone: "Asia/Kuala_Lumpur" } as const;
export const whenText = (iso: string) =>
  new Date(iso).toLocaleString("ms-MY", { ...MY, weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" });
export const shortWhen = (iso: string) =>
  new Date(iso).toLocaleString("ms-MY", { ...MY, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
export const mapsUrl = (lokasi: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lokasi)}`;
export const rsvpText = (a: Acara) => `${a.going}${a.capacity ? `/${a.capacity}` : ""}`;

/** "YYYY-MM-DD" + "HH:MM" waktu Malaysia untuk borang (dari UTC). */
export const toMalaysiaParts = (iso: string): [string, string] => {
  const t = new Date(Date.parse(iso) + 8 * 3600e3).toISOString();
  return [t.slice(0, 10), t.slice(11, 16)];
};
/** Sebaliknya: tarikh + masa Malaysia -> UTC "YYYY-MM-DDTHH:MM:SSZ" (kontrak backend). */
export const fromMalaysiaParts = (tarikh: string, jam: string) =>
  new Date(`${tarikh}T${jam}:00+08:00`).toISOString().replace(/\.\d{3}Z$/, "Z");

export async function eventError(res: Response): Promise<string> {
  const body = await json(res);
  return (
    commonError(res.status, body) ??
    (body.code === "event_full"
      ? "Larian ini sudah penuh."
      : body.code === "attendance_closed"
        ? "Kehadiran dikunci 7 hari selepas larian."
        : res.status === 404
          ? "Larian ini sudah tamat atau dipadam."
          : "Tak dapat simpan sekarang. Cuba lagi sekejap.")
  );
}

export function downloadEventIcs(a: Acara) {
  const ics = buildIcs(
    [
      {
        uid: `acara-${a.id}`,
        mula: new Date(a.startsAt),
        minit: 90, // anggaran: larian + kumpul + regangan
        tajuk: `Nubi Sport: ${a.title}`,
        keterangan: [a.location, a.pace && `Pace ${a.pace}`, a.notes].filter(Boolean).join("\n"),
      },
    ],
    { nama: "Nubi Sport · Larian kumpulan" },
  );
  const l = document.createElement("a");
  l.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  l.download = `nubi-larian-${a.id}.ics`;
  l.click();
  setTimeout(() => URL.revokeObjectURL(l.href), 60e3);
}
