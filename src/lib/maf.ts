// GENERATED from hono-workers src/services/nubi-plan/engine/maf.ts - do not edit. Run `bun scripts/sync-plan-engine.ts` there.
// MAF (Maximum Aerobic Function) - formula "180" Dr. Phil Maffetone, dikira dalam browser.
// Sumber: philmaffetone.com/180-formula. Semak: bun scripts/check-maf.ts

export type Condition = "sakit" | "terganggu" | "konsisten" | "maju";

/** Pelarasan (denyut/min) ikut keadaan sekarang - pilih SATU yang paling tepat. */
export const CONDITIONS: Record<Condition, { label: string; ubah: number }> = {
  sakit: {
    label:
      "Sedang/baru pulih daripada sakit teruk (jantung, pembedahan, masuk wad), dalam pemulihan, makan ubat secara tetap, atau letih melampau akibat latihan berlebihan",
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

export const AGE_MIN = 10;
export const AGE_MAX = 90;
/** 16 tahun ke bawah: formula 180 tidak digunakan; Maffetone guna 165 tetap. */
export const TEEN_AGE = 16;
export const TEEN_MAF = 165;
/** MAF = had atas (sumber). Julat MAF-10 hingga MAF = amalan biasa, dilabel begitu di page. */
export const ZONE_WIDTH = 10;

export type MafResult =
  | { ok: false; sebab: string }
  | { ok: true; maf: number; bawah: number; nota: string[] };

export function calcMaf(umur: number, kategori: Condition): MafResult {
  if (!Number.isInteger(umur) || umur < AGE_MIN || umur > AGE_MAX)
    return { ok: false, sebab: `Masukkan umur dalam tahun (${AGE_MIN}-${AGE_MAX}).` };
  if (!Object.hasOwn(CONDITIONS, kategori)) return { ok: false, sebab: "Pilih keadaan anda sekarang." };

  const nota: string[] = [];
  let maf: number;
  if (umur <= TEEN_AGE) {
    maf = TEEN_MAF;
    nota.push(`${TEEN_AGE} tahun ke bawah: formula 180 tak digunakan - ${TEEN_MAF} sebagai had atas.`);
  } else {
    maf = 180 - umur + CONDITIONS[kategori].ubah;
    if (umur > 65 && kategori === "maju")
      nota.push("Lebih 65 tahun dalam kategori ini: had boleh dinaikkan sehingga 10 - bukan automatik, nilai diri dengan jujur (atau tanya jurulatih).");
  }
  if (kategori === "sakit")
    nota.push("Ada ubat (contoh penyekat beta) yang mengubah kadar nadi - tanya doktor sama ada latihan ikut nadi sesuai untuk anda.");
  return { ok: true, maf, bawah: maf - ZONE_WIDTH, nota };
}
