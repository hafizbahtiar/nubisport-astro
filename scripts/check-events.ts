// Semak lib/events.ts (fungsi tulen sahaja). bun scripts/check-events.ts
import { closed, fromMalaysiaParts, full, started, toMalaysiaParts, type Acara } from "../src/lib/events";

const sama = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
};
// Waktu Malaysia <-> UTC (UTC+8, tiada DST), termasuk lintas hari.
sama(fromMalaysiaParts("2026-11-07", "07:00"), "2026-11-06T23:00:00Z", "MYT -> UTC lintas hari");
sama(toMalaysiaParts("2026-11-06T23:00:00Z"), ["2026-11-07", "07:00"], "UTC -> MYT");
sama(toMalaysiaParts(fromMalaysiaParts("2026-12-31", "23:55")), ["2026-12-31", "23:55"], "pergi-balik");

const T = Date.parse("2026-11-07T00:00:00Z");
const a = (o: Partial<Acara>): Acara => ({
  id: 1, title: "x", startsAt: "2026-11-07T01:00:00Z", location: "x", distanceKm: null, pace: null, notes: null,
  capacity: 2, going: 2, attended: 0, mine: false, mineAttended: false, ...o,
});
sama(full(a({}), T), true, "penuh sebelum mula");
sama(full(a({ mine: true }), T), false, "yang dah RSVP boleh batal");
sama(full(a({ capacity: null }), T), false, "tiada had");
sama(full(a({}), T + 2 * 3600e3), false, "selepas mula: walk-in");
sama(started(a({}), T + 3600e3), true, "mula tepat pada masa");
sama(closed(a({}), T + 4 * 3600e3 + 1), true, "tutup 3 jam selepas mula");
sama(closed(a({}), T + 3 * 3600e3), false, "belum tutup");
console.log("ok - larian kumpulan");
