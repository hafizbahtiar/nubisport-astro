// Semak lib/mask.ts (fungsi tulen). bun scripts/check-mask.ts
// Notasi: "|" = kedudukan kursor.
import { applyMask, deleteAcrossSep, formatDigits, type MaskKind } from "../src/lib/mask";

let n = 0;
const sama = (a: unknown, b: unknown, msg: string) => {
  n++;
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
};
const pisah = (s: string) => [s.replace("|", ""), s.indexOf("|")] as const;
const lepas = (r: { value: string; caret: number }) => r.value.slice(0, r.caret) + "|" + r.value.slice(r.caret);
const taip = (k: MaskKind, s: string, o = {}) => lepas(applyMask(k, ...pisah(s), o));

// Bentuk
sama(formatDigits("date", "08022027"), "08/02/2027", "tarikh penuh");
sama(formatDigits("date", "0802"), "08/02", "tarikh separa - tiada pemisah tergantung");
sama(formatDigits("date", "080220271"), "08/02/2027", "had 8 digit");
sama(formatDigits("time", "0730"), "07:30", "masa");
sama(formatDigits("duration", "530"), "5:30", "tempoh 3 digit");
sama(formatDigits("duration", "2845"), "28:45", "tempoh 4 digit");
sama(formatDigits("duration", "13045"), "1:30:45", "tempoh jam");
sama(formatDigits("pace", "630"), "6:30", "pace");
sama(formatDigits("pace", "63012"), "63:01", "pace had 4 digit");

// Menaip dari hujung
sama(taip("date", "080|"), "08/0|", "taip digit ke-3 -> pemisah muncul");
sama(taip("time", "07:3a|"), "07:3|", "huruf ditolak");
sama(taip("pace", "63|"), "63|", "pace separa");
sama(taip("pace", "630|"), "6:30|", "pace dari kanan");

// Edit di tengah: kursor kekal selepas digit yang sama
sama(taip("date", "08/1|02/2027"), "08/1|2/2027", "penuh: taip di tengah = timpa");
sama(taip("date", "08/1|0", {}), "08/1|0", "belum penuh: sisip");
sama(taip("date", "1|08/02", {}), "1|0/80/2", "belum penuh: sisip di awal, digit beralih");
sama(taip("time", "0|:30"), "0|3:0", "padam digit jam (kursor kekal)");
sama(taip("duration", "1:3|:45"), "13|:45", "padam di tengah tempoh: kumpul semula dari kanan, kursor ikut digit");
sama(taip("date", "|08/02/2027"), "|08/02/2027", "kursor di awal");

// Pemisah ditaip: lengkapkan kumpulan dengan 0
sama(taip("date", "8/|", { typedSep: true }), "08|", "8/ -> 08");
sama(taip("date", "08/2/|", { typedSep: true }), "08/02|", "08/2/ -> 08/02");
sama(taip("time", "7:|", { typedSep: true }), "07|", "7: -> 07");
sama(taip("date", "08/|", { typedSep: true }), "08|", "kumpulan penuh: pemisah tak tambah 0");

// Tampal
sama(taip("date", "8/2/2027|", { pasted: true }), "08/02/2027|", "tampal 8/2/2027");
sama(taip("date", "08-02-2027|", { pasted: true }), "08/02/2027|", "tampal dengan -");
sama(taip("duration", "1:05:30|", { pasted: true }), "1:05:30|", "tampal tempoh");

// Padam tepat pada pemisah = buang digit sebelahnya
const padam = (k: MaskKind, s: string, key: "Backspace" | "Delete") => {
  const r = deleteAcrossSep(k, ...pisah(s), key);
  return r && lepas(r);
};
sama(padam("date", "08/|02/2027", "Backspace"), "0|0/22/027", "Backspace selepas / buang 8");
sama(padam("time", "07|:30", "Delete"), "07|:0", "Delete sebelum : buang 3, kursor tak bergerak");
sama(padam("time", "07:3|0", "Backspace"), null, "bukan pemisah: biar pelayar");
sama(padam("pace", "|6:30", "Backspace"), null, "awal medan");

console.log(`ok - mask (${n} semakan)`);
