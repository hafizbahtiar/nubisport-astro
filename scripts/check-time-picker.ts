// Semak lib/time-picker.ts (fungsi tulen sahaja). bun scripts/check-time-picker.ts
import { snapTime, timePickerHtml } from "../src/lib/time-picker";

const sama = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
};
sama(snapTime("06:30"), [6, 30], "tepat");
sama(snapTime("06:34"), [6, 30], "bundar ke bawah ikut langkah");
sama(snapTime("23:59", 15), [23, 45], "langkah 15");
sama(snapTime("24:00"), null, "jam > 23");
sama(snapTime("6:30"), null, "format");
const h = timePickerHtml({ id: "masa-lari", value: "06:30" });
if (!h.includes('id="masa-lari" value="06:30"') || !h.includes('<option value="30" selected>')) throw new Error("html");
if (timePickerHtml({ id: "x", step: 15 }).split("<option").length - 1 !== 24 + 4) throw new Error("bil. pilihan");
if (!timePickerHtml({ id: 'a"b' }).includes('id="a&#34;b"')) throw new Error("escape");
console.log("ok - TimePicker");
