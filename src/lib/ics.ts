// Fail kalendar iCalendar (RFC 5545), fungsi tulen. Semak: bun scripts/check-ics.ts

export interface CalendarEvent {
  uid: string; // stabil - import semula tidak menduakan acara
  mula: Date; // satu detik masa (instant)
  minit: number;
  tajuk: string;
  keterangan: string;
}

/** Tarikh kalendar `d` (medan tempatan, seperti dari startMonday/sessionDate) + "HH:MM" waktu Malaysia
 *  (UTC+8, tiada DST) -> detik UTC. Tidak bergantung pada zon waktu pelayar. */
export function malaysiaTime(d: Date, jam: string): Date {
  const [h, m] = jam.split(":").map(Number);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), h - 8, m));
}

const utc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const teks = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const bait = new TextEncoder();

// Lipat baris pada 75 oktet (UTF-8), tanpa memecah aksara berbilang bait.
function lipat(baris: string): string {
  let out = "";
  let n = 0;
  for (const c of baris) {
    const b = bait.encode(c).length;
    if (n + b > 75) {
      out += "\r\n ";
      n = 1;
    }
    out += c;
    n += b;
  }
  return out;
}

export function buildIcs(acara: CalendarEvent[], opts: { nama: string }): string {
  const stamp = utc(new Date());
  const baris = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nubi Sport//Pelan Latihan//MS",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${teks(opts.nama)}`,
    ...acara.flatMap((a) => [
      "BEGIN:VEVENT",
      `UID:${a.uid}@nubisport.hafizbahtiar.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${utc(a.mula)}`,
      `DTEND:${utc(new Date(a.mula.getTime() + a.minit * 60e3))}`,
      `SUMMARY:${teks(a.tajuk)}`,
      `DESCRIPTION:${teks(a.keterangan)}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${teks(a.tajuk)}`,
      "TRIGGER:-PT30M",
      "END:VALARM",
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  return baris.map(lipat).join("\r\n") + "\r\n";
}
