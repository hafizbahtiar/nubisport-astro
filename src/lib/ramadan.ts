// Bulan Hijri untuk tarikh Masihi - penanda "Berpuasa" pada sesi dalam bulan Ramadan.
// Sumber: kalendar Umm al-Qura dalam Intl (anggaran ±1 hari berbanding takwim JAKIM;
// JAKIM mengisytiharkan 1 Ramadan melalui rukyah). Guna tengah hari UTC supaya
// zon masa peranti tidak menggeser tarikh.
const HIJRI = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
  month: "numeric",
  timeZone: "UTC",
});

/** Bulan Hijri (1-12) bagi tarikh "YYYY-MM-DD". */
export function bulanHijri(iso: string): number {
  const p = Object.fromEntries(
    HIJRI.formatToParts(new Date(`${iso}T12:00:00Z`)).map((x) => [
      x.type,
      x.value,
    ]),
  );
  return Number(p.month);
}

/** Ramadan = Hijri bulan 9. */
export const dalamRamadan = (iso: string) => bulanHijri(iso) === 9;
