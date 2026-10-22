// Mask medan berformat: `<input data-mask="date|time|duration|pace">`. Hanya digit diterima; pemisah
// diletak sendiri. Edit dari mana-mana kedudukan: kursor kekal selepas digit yang sama (dikira ikut
// bilangan digit sebelum kursor), jadi taip/padam/tampal di tengah tidak melompat ke hujung.
//   date     dd/mm/yyyy  kiri ke kanan; taip "/" selepas satu digit = 0 di depan (8/ -> 08/)
//   time     hh:mm       kiri ke kanan; taip ":" selepas satu digit = 0 di depan (7: -> 07:)
//   duration h:mm:ss     dari kanan (530 -> 5:30, 13045 -> 1:30:45) - seperti jam randik
//   pace     m:ss        dari kanan (630 -> 6:30)
// Mask hanya bentuk; julat (jam <= 23, tarikh wujud) disemak oleh medan itu sendiri.
// installMasks() sekali setiap page: pendengar global, jadi HTML dari skrip pun ikut.
// Semak: bun scripts/check-mask.ts

export type MaskKind = "date" | "time" | "duration" | "pace";

interface Spec {
  groups: number[]; // saiz kumpulan digit, kiri ke kanan
  sep: string[]; // pemisah selepas kumpulan i
  fromRight?: true;
}

const SPECS: Record<MaskKind, Spec> = {
  date: { groups: [2, 2, 4], sep: ["/", "/"] },
  time: { groups: [2, 2], sep: [":"] },
  duration: { groups: [2, 2, 2], sep: [":", ":"], fromRight: true },
  pace: { groups: [2, 2], sep: [":"], fromRight: true },
};
const SEP = /[/:.\-\s]/;

const maxDigits = (s: Spec) => s.groups.reduce((a, b) => a + b, 0);

/** Digit -> teks berformat. Pemisah hanya muncul bila kumpulan selepasnya ada digit. */
export function formatDigits(kind: MaskKind, d: string): string {
  const s = SPECS[kind];
  d = d.slice(0, maxDigits(s));
  if (s.fromRight) {
    // Dari kanan: kumpulan 2 digit; kumpulan paling kiri (jam / minit pace) boleh 1 digit.
    const out: string[] = [];
    for (let i = d.length; i > 0; i -= 2) out.unshift(d.slice(Math.max(0, i - 2), i));
    return out.join(":");
  }
  let out = "";
  let i = 0;
  s.groups.forEach((n, g) => {
    if (i >= d.length) return;
    if (g > 0) out += s.sep[g - 1];
    out += d.slice(i, i + n);
    i += n;
  });
  return out;
}

/** Kedudukan dalam `v` selepas digit ke-n (0 = awal). */
function caretAfterDigits(v: string, n: number): number {
  if (n <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < v.length; i++) if (/\d/.test(v[i]) && ++seen === n) return i + 1;
  return v.length;
}

const countDigits = (s: string) => s.replace(/\D/g, "").length;

/**
 * Nilai mentah (selepas pengguna menaip) + kursor -> nilai berformat + kursor baharu.
 * `typedSep` = pengguna baru menaip pemisah pada kursor-1 (kiri ke kanan: lengkapkan kumpulan dengan 0).
 * `pasted` = tampal/drop: "8/2/2027" difahami ikut pemisahnya, bukan digit sahaja.
 */
export function applyMask(
  kind: MaskKind,
  raw: string,
  caret: number,
  o: { typedSep?: boolean; pasted?: boolean } = {},
): { value: string; caret: number } {
  const s = SPECS[kind];
  let before = countDigits(raw.slice(0, caret));
  let digits = raw.replace(/\D/g, "");

  if (!s.fromRight && (o.typedSep || (o.pasted && SEP.test(raw)))) {
    if (o.pasted) {
      // Setiap token sebelum pemisah = satu kumpulan; pad dengan 0 di depan.
      const tok = raw.split(SEP).filter((t, i, a) => t !== "" || i === a.length - 1);
      digits = tok
        .map((t, g) => {
          const d = t.replace(/\D/g, "");
          const n = s.groups[g] ?? 0;
          return g < tok.length - 1 && d.length < n ? d.padStart(n, "0") : d.slice(0, n || undefined);
        })
        .join("");
      before = digits.length;
    } else {
      // Kumpulan semasa (digit sebelum kursor) separuh diisi -> 0 di depan.
      let start = 0;
      for (const n of s.groups) {
        const inGroup = before - start;
        if (inGroup < n) {
          if (inGroup > 0) {
            const pad = "0".repeat(n - inGroup);
            digits = digits.slice(0, start) + pad + digits.slice(start);
            before += pad.length;
          }
          break;
        }
        start += n;
      }
    }
  }

  // Penuh + taip di tengah = timpa digit selepas kursor (bukan tolak digit hujung keluar).
  if (digits.length > maxDigits(s) && before < digits.length) digits = digits.slice(0, before) + digits.slice(before + 1);
  digits = digits.slice(0, maxDigits(s));
  const value = formatDigits(kind, digits);
  return { value, caret: caretAfterDigits(value, Math.min(before, digits.length)) };
}

/**
 * Padam (Backspace/Delete) tepat pada pemisah: buang digit di sebelahnya, bukan pemisah (yang akan
 * diletak semula). null = biar pelayar uruskan.
 */
export function deleteAcrossSep(
  kind: MaskKind,
  value: string,
  caret: number,
  key: "Backspace" | "Delete",
): { value: string; caret: number } | null {
  const i = key === "Backspace" ? caret - 1 : caret;
  if (i < 0 || i >= value.length || /\d/.test(value[i])) return null;
  // Digit terdekat di arah padam (melangkau pemisah).
  let j = i;
  while (j >= 0 && j < value.length && !/\d/.test(value[j])) j += key === "Backspace" ? -1 : 1;
  if (j < 0 || j >= value.length) return null;
  const raw = value.slice(0, j) + value.slice(j + 1);
  return applyMask(kind, raw, key === "Backspace" ? j : j);
}

const isMasked = (t: EventTarget | null): t is HTMLInputElement =>
  t instanceof HTMLInputElement && !!t.dataset.mask && t.dataset.mask in SPECS;

let installed = false;
export function installMasks() {
  if (installed || typeof document === "undefined") return;
  installed = true;
  document.addEventListener("input", (e) => {
    const t = e.target;
    const ev = e as InputEvent;
    if (!isMasked(t) || ev.isComposing) return;
    const kind = t.dataset.mask as MaskKind;
    const caret = t.selectionStart ?? t.value.length;
    const r = applyMask(kind, t.value, caret, {
      typedSep: ev.inputType === "insertText" && !!ev.data && SEP.test(ev.data),
      pasted: ev.inputType === "insertFromPaste" || ev.inputType === "insertFromDrop",
    });
    if (r.value !== t.value) t.value = r.value;
    if (document.activeElement === t) t.setSelectionRange(r.caret, r.caret);
  });
  document.addEventListener("keydown", (e) => {
    const t = e.target;
    if (!isMasked(t) || (e.key !== "Backspace" && e.key !== "Delete")) return;
    if (t.selectionStart !== t.selectionEnd || e.ctrlKey || e.metaKey || e.altKey) return;
    const r = deleteAcrossSep(t.dataset.mask as MaskKind, t.value, t.selectionStart ?? 0, e.key);
    if (!r) return;
    e.preventDefault();
    t.value = r.value;
    t.setSelectionRange(r.caret, r.caret);
    t.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
