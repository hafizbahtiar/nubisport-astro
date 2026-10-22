// bun scripts/check-ics.ts - semak src/lib/ics.ts (RFC 5545) dengan pelan 5K sebenar.
import { buildIcs, malaysiaTime, type CalendarEvent } from "../src/lib/ics";
import { buildPlan, startMonday, sessionDate } from "../src/lib/plan-5k";

let gagal = 0;
const ok = (c: unknown, msg: string) => {
  if (!c) {
    gagal++;
    console.error("GAGAL:", msg);
  }
};

// 06:30 Malaysia = 22:30Z hari sebelumnya, walau apa pun TZ proses.
ok(malaysiaTime(new Date(2026, 9, 19), "06:30").toISOString() === "2026-10-18T22:30:00.000Z", "06:30 MYT -> 22:30Z");

const h = buildPlan({ bulan: 3, tahap: "jalan", hari: 3 });
if (!h.ok) throw new Error("pelan contoh ditolak");
const isnin = startMonday(new Date(2026, 9, 18));
const panjang = "Lari santai 🏃‍♀️ di Taman Tasik Titiwangsa; bawa air, topi\\ubat\nJangan lupa regangan - ".repeat(4);
const acara: CalendarEvent[] = h.minggu.flatMap((w) =>
  w.sesi.map((s, i) => ({
    uid: `pelan-5k-3-jalan--3-m${w.no}s${i}`,
    mula: malaysiaTime(sessionDate(isnin, w.no, 3, i), "06:30"),
    minit: s.minit,
    tajuk: `Nubi 5K · Minggu ${w.no}: ${s.tajuk} (${s.minit} min)`,
    keterangan: w.no === 1 && i === 0 ? panjang : `${s.arahan}\n${s.usaha}`,
  })),
);
const ics = buildIcs(acara, { nama: "Nubi 5K, pelan; 3 bulan" });

ok(ics.endsWith("\r\n") && !/[^\r]\n/.test(ics) && !/\r[^\n]/.test(ics), "CRLF di setiap baris");
const enc = new TextEncoder();
const fizikal = ics.slice(0, -2).split("\r\n");
ok(fizikal.every((l) => enc.encode(l).length <= 75), "baris fizikal <= 75 oktet");
ok(!ics.includes("�") && new TextDecoder("utf-8", { fatal: true }).decode(enc.encode(ics)) === ics, "UTF-8 sah");

// Buka lipatan (RFC 5545 3.1) dan nyah-escape.
const logik = ics.replace(/\r\n /g, "").split("\r\n").slice(0, -1);
const nyah = (s: string) => s.replace(/\\(n|N|\\|;|,)/g, (_, c) => (c === "n" || c === "N" ? "\n" : c));
const nilai = (k: string) => logik.filter((l) => l.startsWith(k + ":")).map((l) => l.slice(k.length + 1));

for (const k of ["VERSION:2.0", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"]) ok(logik.includes(k), k);
ok(nilai("PRODID").length === 1, "PRODID");
ok(nilai("X-WR-CALNAME")[0] === String.raw`Nubi 5K\, pelan\; 3 bulan`, "X-WR-CALNAME di-escape");
ok(nilai("DESCRIPTION").map(nyah).includes(panjang), "keterangan panjang (emoji, ; , \\ \\n) pulang sama");
ok(nilai("DESCRIPTION").every((v) => !/(^|[^\\])(\\\\)*[;,\n]/.test(v)), "TEXT di-escape");

const bil = h.minggu.reduce((a, w) => a + w.sesi.length, 0);
ok(nilai("BEGIN").filter((v) => v === "VEVENT").length === bil, `acara = ${bil} sesi`);
ok(nilai("BEGIN").filter((v) => v === "VALARM").length === bil && logik.filter((l) => l === "TRIGGER:-PT30M").length === bil && logik.includes("ACTION:DISPLAY"), "VALARM 30 min sebelum");
const uid = nilai("UID");
ok(new Set(uid).size === bil && uid.every((u) => u.endsWith("@nubisport.hafizbahtiar.com")), "UID unik");
ok(nilai("DTSTAMP").every((v) => /^\d{8}T\d{6}Z$/.test(v)), "DTSTAMP UTC");

const masa = (v: string) => Date.parse(v.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, "$1-$2-$3T$4:$5:$6Z"));
const mula = nilai("DTSTART");
const tamat = nilai("DTEND");
ok(mula.every((v) => /^\d{8}T\d{6}Z$/.test(v)) && tamat.every((v) => /^\d{8}T\d{6}Z$/.test(v)), "DTSTART/DTEND UTC");
ok(mula[0] === "20261018T223000Z", `sesi pertama = Isnin 19 Okt 06:30 MYT (${mula[0]})`);
ok(acara.every((a, i) => masa(tamat[i]) - masa(mula[i]) === a.minit * 60e3), "DTEND = DTSTART + minit");

if (gagal) throw new Error(`${gagal} semakan gagal`);
console.log(`ok - ${bil} acara, ${fizikal.length} baris`);
