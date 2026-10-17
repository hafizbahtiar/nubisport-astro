// MAF (Maximum Aerobic Function) - formula "180" Dr. Phil Maffetone, dikira dalam browser.
// Sumber: philmaffetone.com/180-formula. Semak: bun scripts/check-maf.ts

export type Kategori = "sakit" | "terganggu" | "konsisten" | "maju";

/** Pelarasan (denyut/min) ikut keadaan sekarang - pilih SATU yang paling tepat. */
export const KATEGORI: Record<Kategori, { label: string; ubah: number }> = {
  sakit: {
    label:
      "Sedang/baru pulih dari sakit besar (jantung, pembedahan, masuk wad), dalam rehabilitasi, makan ubat secara tetap, atau burnout akibat latihan berlebihan",
    ubah: -10,
  },
  terganggu: {
    label:
      "Baru mula / kembali berlatih, tak konsisten, cedera, prestasi merosot, lebih 2 kali selesema/jangkitan setahun, alahan, asma atau berat badan berlebihan",
    ubah: -5,
  },
  konsisten: {
    label: "Berlatih konsisten (sekurang-kurangnya 4 kali seminggu) sehingga 2 tahun tanpa masalah di atas",
    ubah: 0,
  },
  maju: {
    label: "Berlatih lebih 2 tahun tanpa masalah di atas, dan prestasi lumba terus meningkat",
    ubah: 5,
  },
};

export const UMUR_MIN = 10;
export const UMUR_MAX = 90;
/** 16 tahun ke bawah: formula 180 tidak digunakan; Maffetone guna 165 tetap. */
export const UMUR_REMAJA = 16;
export const MAF_REMAJA = 165;
/** MAF = had atas (sumber). Julat MAF-10 hingga MAF = amalan biasa, dilabel begitu di page. */
export const LEBAR_ZON = 10;

export type HasilMaf =
  | { ok: false; sebab: string }
  | { ok: true; maf: number; bawah: number; nota: string[] };

export function kiraMaf(umur: number, kategori: Kategori): HasilMaf {
  if (!Number.isInteger(umur) || umur < UMUR_MIN || umur > UMUR_MAX)
    return { ok: false, sebab: `Masukkan umur dalam tahun (${UMUR_MIN}-${UMUR_MAX}).` };
  if (!(kategori in KATEGORI)) return { ok: false, sebab: "Pilih keadaan anda sekarang." };

  const nota: string[] = [];
  let maf: number;
  if (umur <= UMUR_REMAJA) {
    maf = MAF_REMAJA;
    nota.push(`${UMUR_REMAJA} tahun ke bawah: formula 180 tidak digunakan - ${MAF_REMAJA} sebagai had atas.`);
  } else {
    maf = 180 - umur + KATEGORI[kategori].ubah;
    if (umur > 65 && kategori === "maju")
      nota.push("Lebih 65 tahun dalam kategori ini: had boleh dinaikkan sehingga 10 - bukan automatik, nilai diri dengan jujur (atau tanya jurulatih).");
  }
  if (kategori === "sakit")
    nota.push("Ada ubat (contoh beta-blocker) yang mengubah kadar nadi - tanya doktor sama ada latihan ikut nadi sesuai untuk anda.");
  return { ok: true, maf, bawah: maf - LEBAR_ZON, nota };
}
