// Semak lib/time-picker.ts (fungsi tulen sahaja). bun scripts/check-time-picker.ts
import { nowMalaysia, parseTime, timePickerHtml } from "../src/lib/time-picker";

const sama = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
};
sama(parseTime("06:30"), [6, 30], "sah");
sama(parseTime("23:59"), [23, 59], "had atas");
sama(parseTime("24:00"), null, "jam > 23");
sama(parseTime("07:60"), null, "minit > 59");
sama(parseTime("7:30"), null, "format");
sama(nowMalaysia(5, new Date("2026-10-22T22:58:00Z")), "06:55", "UTC+8, bundar ke bawah, lintas hari");
sama(nowMalaysia(15, new Date("2026-10-22T01:14:00Z")), "09:00", "langkah 15");

const h = timePickerHtml({ id: "masa-lari", value: "06:30" });
if (!h.includes('id="masa-lari" value="06:30"') || !h.includes('id="masa-lari-text"') || !h.includes('data-mask="time"'))
  throw new Error("html: hidden + teks bermask");
if (!timePickerHtml({ id: "x", value: "25:00" }).includes('id="x" value=""')) throw new Error("nilai tak sah = kosong");
const pilihan = (s: string) => s.split('role="option"').length - 1;
if (pilihan(timePickerHtml({ id: "x", step: 15 })) !== 24 + 4) throw new Error("bil. pilihan langkah 15");
if (!timePickerHtml({ id: 'a"b' }).includes('id="a&#34;b"')) throw new Error("escape");
console.log("ok - TimePicker");
