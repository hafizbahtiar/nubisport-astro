// Data IPU (JAS) + ramalan cuaca (MET Malaysia) + waktu lari terbaik (JAKIM) untuk tool AI.
// Kad "Sesuai lari hari ini?" pada halaman pelan dibuang 2026-10-24.
// Data mentah datang dari backend kongsi hono-workers: /api/v1/public/air-quality?state=,
// /api/v1/public/weather/:id dan /api/v1/public/prayer-times/:zone (kod di sana dalam Inggeris; teks nasihat di sini).
// Sumber rasmi sahaja (eqms.doe.gov.my, api.data.gov.my, e-solat.gov.my; KKM untuk 11 pagi - 4 petang) - panduan umum, bukan nasihat perubatan.
import { api, json } from "./api";

export interface State {
  nama: string;
  /** Id lokasi MET untuk negeri itu (St = negeri). */
  met: string;
  /** Zon JAKIM ibu negeri (waktu solat untuk "waktu lari terbaik"). */
  zon: string;
}

/** 16 negeri/ Wilayah Persekutuan. Nama mesti sama dengan nama negeri dalam data JAS. */
export const STATES: State[] = [
  { nama: "Perlis", met: "St001", zon: "PLS01" },
  { nama: "Kedah", met: "St002", zon: "KDH01" },
  { nama: "Pulau Pinang", met: "St003", zon: "PNG01" },
  { nama: "Perak", met: "St004", zon: "PRK02" },
  { nama: "Kelantan", met: "St005", zon: "KTN01" },
  { nama: "Terengganu", met: "St006", zon: "TRG01" },
  { nama: "Pahang", met: "St007", zon: "PHG02" },
  { nama: "Selangor", met: "St008", zon: "SGR01" },
  { nama: "WP Kuala Lumpur", met: "St009", zon: "WLY01" },
  { nama: "WP Putrajaya", met: "St010", zon: "WLY01" },
  { nama: "Negeri Sembilan", met: "St011", zon: "NGS03" },
  { nama: "Melaka", met: "St012", zon: "MLK01" },
  { nama: "Johor", met: "St013", zon: "JHR02" },
  { nama: "Sarawak", met: "St501", zon: "SWK08" },
  { nama: "Sabah", met: "St502", zon: "SBH07" },
  { nama: "WP Labuan", met: "St503", zon: "WLY02" },
];

export interface AqiStation {
  id: string;
  /** "Kangar, PERLIS" */
  station: string;
  state: string;
  /** null = tiada bacaan sah pada jam ini. */
  api: number | null;
  /** Bahan pencemar utama, contoh "PM2.5". */
  pollutant: string | null;
  /** Masa bacaan (ms). APIMS menyimpan waktu Malaysia seolah-olah UTC. */
  time: number;
}

export interface ForecastDay {
  /** "YYYY-MM-DD" */
  date: string;
  summary: string;
  when: string | null;
  morning: string | null;
  afternoon: string | null;
  night: string | null;
  min: number;
  max: number;
}

const LOKASI = "nubi:lokasi";
const IPU_MINIT = 15;
const CUACA_MINIT = 60;
/** Suhu maksimum yang dianggap panas untuk sesi tengah hari - mudah dilaraskan. */
const PANAS_C = 33;

/** Negeri pilihan (localStorage `nubi:lokasi`), null jika belum dipilih. */
export function readLocation(): string | null {
  try {
    return localStorage.getItem(LOKASI);
  } catch {
    return null;
  }
}

export function saveLocation(nama: string) {
  try {
    localStorage.setItem(LOKASI, nama);
  } catch {
    /* storan disekat */
  }
}

/** Cache sessionStorage `{t, v}` dengan TTL minit - gagal senyap dalam mod peribadi. */
function simpanan<T>(kunci: string, minit: number): T | null {
  try {
    const mentah = sessionStorage.getItem(kunci);
    if (!mentah) return null;
    const { t, v } = JSON.parse(mentah) as { t: number; v: T };
    return Date.now() - t < minit * 60_000 ? v : null;
  } catch {
    return null;
  }
}

function simpanCache<T>(kunci: string, v: T) {
  try {
    sessionStorage.setItem(kunci, JSON.stringify({ t: Date.now(), v }));
  } catch {
    /* storan penuh/disekat */
  }
}

/** Stesen dalam satu negeri (cache 15 minit); null = tiada sambungan. */
export async function fetchAqi(nama: string): Promise<AqiStation[] | null> {
  const kunci = `nubi:ipu:${nama}`;
  const ada = simpanan<AqiStation[]>(kunci, IPU_MINIT);
  if (ada) return ada;
  try {
    const r = await api(`/public/air-quality?state=${encodeURIComponent(nama)}`);
    if (!r.ok) return null;
    const senarai = ((await json(r)).data ?? []) as AqiStation[];
    simpanCache(kunci, senarai);
    return senarai;
  } catch {
    return null;
  }
}

/** Ramalan MET untuk satu id lokasi (cache 60 minit); null = tiada sambungan. */
export async function fetchForecast(met: string): Promise<ForecastDay[] | null> {
  const kunci = `nubi:cuaca:${met}`;
  const ada = simpanan<ForecastDay[]>(kunci, CUACA_MINIT);
  if (ada) return ada;
  try {
    const r = await api(`/public/weather/${encodeURIComponent(met)}`);
    if (!r.ok) return null;
    const senarai = ((await json(r)).data ?? []) as ForecastDay[];
    simpanCache(kunci, senarai);
    return senarai;
  } catch {
    return null;
  }
}

/**
 * Stesen dengan bacaan IPU tertinggi dalam negeri itu (bacaan tanpa nilai diabaikan).
 * Tertinggi = konservatif: nasihat kesihatan tidak bergantung pada stesen yang dipilih.
 */
export function highestAqi(stesen: AqiStation[]): AqiStation | null {
  let tinggi: AqiStation | null = null;
  for (const s of stesen) {
    if (s.api == null) continue;
    if (!tinggi || s.api > tinggi.api!) tinggi = s;
  }
  return tinggi;
}

export interface AqiLevel {
  /** Label rasmi JAS. */
  label: string;
  nada: "baik" | "sederhana" | "tidak-sihat" | "sangat" | "bahaya";
  nasihat: string;
}

/** Band IPU rasmi JAS + nasihat larian. */
export function aqiLevel(api: number): AqiLevel {
  if (api <= 50)
    return { label: "Baik", nada: "baik", nasihat: "Sesuai untuk lari." };
  if (api <= 100)
    return {
      label: "Sederhana",
      nada: "sederhana",
      nasihat: "Boleh lari, tapi ringankan sesi laju dan sesi panjang.",
    };
  if (api <= 200)
    return {
      label: "Tidak sihat",
      nada: "tidak-sihat",
      nasihat: "Elak lari di luar - buat sesi dalam rumah atau tangguh dulu.",
    };
  if (api <= 300)
    return {
      label: "Sangat tidak sihat",
      nada: "sangat",
      nasihat: "Jangan lari di luar.",
    };
  return { label: "Berbahaya", nada: "bahaya", nasihat: "Jangan lari di luar." };
}

const RIBUT = /ribut petir/i;
const JEREBU = /jerebu/i;

/** Nasihat larian untuk satu hari ramalan; senarai kosong = tiada amaran. */
export function weatherAdvice(hari: ForecastDay): string[] {
  const nasihat: string[] = [];
  const petang = `${hari.afternoon ?? ""} ${hari.night ?? ""}`;
  if (RIBUT.test(petang) && !RIBUT.test(hari.morning ?? ""))
    nasihat.push("Ribut petir diramal petang atau malam - lari pagi.");
  else if (RIBUT.test(hari.summary))
    nasihat.push("Ribut petir diramal - elak waktu petang.");
  if (JEREBU.test(hari.summary) || JEREBU.test(petang))
    nasihat.push("Jerebu diramal - semak bacaan IPU negeri anda.");
  if (hari.max >= PANAS_C)
    nasihat.push(
      `Panas (maksimum ${hari.max} °C) - elak 11 pagi hingga 4 petang, bawa air.`,
    );
  return nasihat;
}

export interface PrayerTimes {
  date: string;
  /** "HH:MM" waktu Malaysia */
  fajr: string;
  syuruk: string;
  asr: string;
  maghrib: string;
}

/** Waktu solat hari ini untuk zon JAKIM (cache 60 minit); null = tiada sambungan. */
export async function fetchPrayerTimes(zon: string): Promise<PrayerTimes | null> {
  const kunci = `nubi:waktu:${zon}`;
  const ada = simpanan<PrayerTimes>(kunci, CUACA_MINIT);
  if (ada) return ada;
  try {
    const r = await api(`/public/prayer-times/${encodeURIComponent(zon)}`);
    if (!r.ok) return null;
    const w = (await json(r)).data as PrayerTimes;
    simpanCache(kunci, w);
    return w;
  } catch {
    return null;
  }
}

export interface RunWindow {
  nama: "Pagi" | "Petang";
  dari: string;
  hingga: string;
  nota: string;
  /** Ribut petir diramal MET pada bahagian hari itu. */
  ribut: boolean;
}

/** KKM: elak waktu puncak panas 11 pagi - 4 petang (Kenyataan Media Cuaca Panas, 25 Mac 2026). */
const PUNCAK = ["11:00", "16:00"] as const;

/**
 * Tetingkap lari hari ini: Subuh -> 11 pagi, dan 4 petang (atau Asar jika lewat) -> Maghrib.
 * Tetingkap yang sudah tamat (`kini` "HH:MM" waktu Malaysia) dibuang; yang ada ribut petir ditanda
 * dan disusun ke belakang. Senarai kosong = waktu terbaik hari ini sudah lepas.
 */
export function runWindows(w: PrayerTimes, kini: string, hari?: ForecastDay | null): RunWindow[] {
  const petang = w.asr > PUNCAK[1] ? w.asr : PUNCAK[1];
  const senarai: RunWindow[] = [
    {
      nama: "Pagi",
      dari: w.fajr,
      hingga: PUNCAK[0],
      nota: `Lepas Subuh - gelap hingga Syuruk ${w.syuruk}, pakai baju yang memantulkan cahaya.`,
      ribut: RIBUT.test(hari?.morning ?? ""),
    },
    {
      nama: "Petang",
      dari: petang,
      hingga: w.maghrib,
      nota: `Lepas waktu puncak panas, sebelum Maghrib ${w.maghrib}.`,
      ribut: RIBUT.test(hari?.afternoon ?? ""),
    },
  ];
  return senarai.filter((t) => t.hingga > kini).sort((a, b) => Number(a.ribut) - Number(b.ribut));
}

const JAM_MY = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kuala_Lumpur",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
/** Jam Malaysia sekarang, "HH:MM" (jam telefon mungkin zon lain). */
export const nowTimeMY = (now = new Date()) => JAM_MY.format(now);
