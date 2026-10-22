// Kalendar lumba Malaysia (/races) - SUSUN TANGAN. Tiada API terbuka (semakan 2026-10-18; Ahotu hanya
// perkongsian syarikat), dan scraping ditolak (IDEA.md).
// Setiap acara disalin dari laman rasmi penganjur atau page pendaftaran rasmi acara itu (RaceXAsia dsb.
// yang penganjur sendiri guna) - bukan blog, berita atau laman senarai/agregator. `disemak` = tarikh
// pautan dibuka dan dibaca; `bun scripts/check-races.ts` gagal bila > 3 bulan - semak semula atau buang.
// Yuran hanya jika laman itu menyatakannya (Malaysia, tanpa caj admin). Tiada maklumat = biar kosong.
// Ditinggalkan (2026-10-18): Borneo International Marathon 2027 (laman rasmi belum disahkan).

export interface Race {
  id: string; // slug stabil - URL fail .ics + UID kalendar
  nama: string;
  tarikh: string; // YYYY-MM-DD, waktu Malaysia
  mula: string; // HH:MM flag-off pertama / pintu buka
  tempat: string;
  negeri: string;
  jarak: string[];
  yuran?: string;
  tutup?: string; // YYYY-MM-DD pendaftaran ditutup
  pautan: string; // laman rasmi / pendaftaran
  disemak: string; // YYYY-MM-DD
}

export const RACES: Race[] = [
  {
    id: "polio-run-walk-2026",
    nama: "Polio Run/Walk 2026",
    tarikh: "2026-10-25",
    mula: "07:00",
    tempat: "Dataran DBKL",
    negeri: "Kuala Lumpur",
    jarak: ["5K", "3K"],
    pautan: "https://racexasia.com/event/polio-run-walk-2026-porw26",
    disemak: "2026-10-18",
  },
  {
    id: "sharp-hsnkl-2026",
    nama: "Sharp HSNKL Half Marathon 2026",
    tarikh: "2026-10-25",
    mula: "04:00",
    tempat: "Dataran Merdeka",
    negeri: "Kuala Lumpur",
    jarak: ["21K", "10K", "5K", "3K"],
    tutup: "2026-10-19",
    pautan: "https://racexasia.com/event/sharp-hsnkl-half-marathon-2026-hsnm26",
    disemak: "2026-10-18",
  },
  {
    id: "jambatan-sultan-nazrin-shah-2026",
    nama: "Larian Jambatan Sultan Nazrin Shah 2026",
    tarikh: "2026-10-25",
    mula: "03:00",
    tempat: "Tapak Pasar Malam Bagan Datuk",
    negeri: "Perak",
    jarak: ["21K", "10K", "5K"],
    tutup: "2026-09-15",
    pautan: "https://racexasia.com/event/larian-jambatan-sultan-nazrin-shah-2026-ljsn26",
    disemak: "2026-10-18",
  },
  {
    id: "mycity-run-2026",
    nama: "MyCity Run 2026",
    tarikh: "2026-10-31",
    mula: "07:00",
    tempat: "Laman MBPJ, Petaling Jaya",
    negeri: "Selangor",
    jarak: ["10K", "5K", "3K"],
    yuran: "10K RM50 · 5K RM40",
    tutup: "2026-10-25",
    pautan: "https://racexasia.com/event/mycity-run-2026-mycr26",
    disemak: "2026-10-18",
  },
  {
    id: "tm80-heritage-run-2026",
    nama: "TM80 Heritage Run, Taiping",
    tarikh: "2026-11-01",
    mula: "07:00",
    tempat: "Muzium Telegraf, Taiping",
    negeri: "Perak",
    jarak: ["10K", "5K"],
    yuran: "10K RM68",
    tutup: "2026-10-15",
    pautan: "https://racexasia.com/event/tm80-heritage-run-taiping-tmhr26",
    disemak: "2026-10-18",
  },
  {
    id: "wau-run-2026",
    nama: "Wau Run 2026",
    tarikh: "2026-11-01",
    mula: "07:00",
    tempat: "Dataran DBKL",
    negeri: "Kuala Lumpur",
    jarak: ["7K"],
    yuran: "RM55",
    tutup: "2026-10-27",
    pautan: "https://racexasia.com/event/wau-run-2026-waur26",
    disemak: "2026-10-18",
  },
  {
    id: "pos-malaysia-run-2026",
    nama: "Pos Malaysia Run 2026",
    tarikh: "2026-11-29",
    mula: "04:00",
    tempat: "Dataran Merdeka",
    negeri: "Kuala Lumpur",
    jarak: ["21K", "10K", "5.5K"],
    yuran: "21K RM138 · 10K RM108 · 5.5K RM88 (harga biasa)",
    tutup: "2026-09-30",
    pautan: "https://racexasia.com/event/pos-malaysia-run-2026-posm26",
    disemak: "2026-10-18",
  },
  {
    id: "lihm-2026",
    nama: "Langkawi International Half Marathon 2026",
    tarikh: "2026-12-12",
    mula: "05:00",
    tempat: "Mahsuri International Exhibition Centre (MIEC)",
    negeri: "Kedah",
    jarak: ["21K"],
    tutup: "2026-10-18",
    pautan: "https://register.langkawirunners.com/event/langkawi-international-half-marathon-2026",
    disemak: "2026-10-18",
  },
  {
    id: "pbim-2026",
    nama: "Penang Bridge International Marathon 2026",
    tarikh: "2026-12-13",
    mula: "01:00",
    tempat: "Jambatan Pulau Pinang",
    negeri: "Pulau Pinang",
    jarak: ["42K", "21K", "10K"],
    yuran: "42K RM150 · 21K RM140 · 10K RM120 (harga biasa, Malaysia)",
    pautan: "https://penangmarathon.gov.my",
    disemak: "2026-10-18",
  },
];
