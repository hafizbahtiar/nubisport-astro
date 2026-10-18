// Kalkulator peluh (/panduan#peluh): timbang sebelum + selepas lari -> kadar peluh sejam. Dalam pelayar.
// Kaedah dan had 2% dari ACSM, Exercise and Fluid Replacement (Sawka et al., 2007, PMID 17277604):
// "Individual sweat rates can be estimated by measuring body weight before and after exercise" dan
// matlamat minum = elak kekurangan air ">2% body weight loss". 1 kg berat hilang ≈ 1 L peluh.
// Semak: bun scripts/check-peluh.ts

export type HasilPeluh =
  | { ok: false; sebab: string }
  | { ok: true; peluhL: number; sejamL: number; peratus: number; naik: boolean };

/** Berat (kg), minum semasa lari (ml), tempoh (minit). */
export function kadarPeluh(sebelum: number, selepas: number, minumMl: number, minit: number): HasilPeluh {
  if (!(sebelum >= 30 && sebelum <= 200 && selepas >= 30 && selepas <= 200)) return { ok: false, sebab: "Berat mesti 30-200 kg." };
  if (Math.abs(sebelum - selepas) > 5) return { ok: false, sebab: "Beza berat lebih 5 kg - semak semula timbangan." };
  if (!(minumMl >= 0 && minumMl <= 5000)) return { ok: false, sebab: "Minum semasa lari mesti 0-5000 ml." };
  if (!(minit >= 15 && minit <= 300)) return { ok: false, sebab: "Tempoh lari mesti 15-300 minit." };
  const peluhL = sebelum - selepas + minumMl / 1000;
  return { ok: true, peluhL, sejamL: peluhL / (minit / 60), peratus: ((sebelum - selepas) / sebelum) * 100, naik: selepas > sebelum };
}
