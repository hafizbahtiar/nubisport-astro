// Tarikh format Malaysia (dd/mm/yyyy) untuk DatePicker.astro: medan papar dan terima
// dd/mm/yyyy, borang tetap hantar ISO yyyy-mm-dd. Asal: portfolio src/lib/date-my.ts.
// Semak: bun scripts/check-date.ts

export const MONTH_NAMES = ["Januari", "Februari", "Mac", "April", "Mei", "Jun", "Julai", "Ogos", "September", "Oktober", "November", "Disember"];
/** Isnin dahulu (Isnin … Ahad). */
export const SHORT_DAYS = ["Is", "Se", "Ra", "Kh", "Ju", "Sa", "Ah"];

const pad = (n: number) => String(n).padStart(2, "0");

const MY_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
/** Tarikh Malaysia bagi `now` sebagai "YYYY-MM-DD" (jam telefon mungkin zon lain). */
export const todayMY = (now = new Date()) => MY_DAY.format(now);

/** "2027-02-08" -> "08/02/2027"; selain itu -> "". */
export function isoToDmy(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/** Benar untuk tarikh kalendar sebenar (tiada 30/02, 31/04). */
export function isValidDate(y: number, m: number, d: number): boolean {
  if (y < 1 || m < 1 || m > 12 || d < 1) return false;
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/** "8/2/2027", "08-02-2027", "08.02.2027" atau "08022027" -> "2027-02-08"; tidak sah -> null. */
export function dmyToIso(text: string): string | null {
  const s = (text ?? "").trim();
  const m = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/.exec(s) ?? /^(\d{2})(\d{2})(\d{4})$/.exec(s);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return isValidDate(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
}

/** 42 petak (6 minggu, Isnin dahulu) meliputi `bulan` (1-12) bagi `tahun`. */
export function monthGrid(tahun: number, bulan: number): { iso: string; hari: number; dalamBulan: boolean }[] {
  const first = new Date(Date.UTC(tahun, bulan - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7; // Isnin = 0
  return Array.from({ length: 42 }, (_, i) => {
    const t = new Date(Date.UTC(tahun, bulan - 1, 1 + i - offset));
    return { iso: t.toISOString().slice(0, 10), hari: t.getUTCDate(), dalamBulan: t.getUTCMonth() === bulan - 1 };
  });
}

/** Anjak tarikh ISO beberapa hari (navigasi papan kekunci). */
export const addDays = (iso: string, n: number) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** Hari yang sama di bulan lain, dihadkan kepada panjang bulan itu (31 Jan + 1 -> 28/29 Feb). */
export function addMonths(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}
