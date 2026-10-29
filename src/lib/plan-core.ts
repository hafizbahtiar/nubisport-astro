// Teras pelan tulen (tiada DOM/rangkaian/storan): kunci, parameter, penjanaan sesi bertarikh.
// Disalin ke API Workers, jadi hanya boleh import ./plan-5k, ./distance-plan, ./date, ./maf.
// Semak: bun scripts/check-plan-core.ts
// Disalin ke hono-workers - ubah = `bun scripts/sync-plan-engine.ts` + deploy API
import { todayMY } from "./date";
import { DISTANCES, buildDistancePlan, type Distance } from "./distance-plan";
import { buildPlan, startMonday, isoDate, isWalkDate, sessionDate, type SessionType, type Segment, type Week, type Level } from "./plan-5k";

/** Naikkan bila enjin pelan berubah sehingga sesi lama mungkin tidak sama (lib/plan-5k.ts, lib/distance-plan.ts). */
export const ENGINE_VERSION = 2;

export interface PlanSession {
  id: string; // token tanda siap "<minggu>.<sesi>"
  minggu: number;
  tarikh: string; // yyyy-mm-dd
  jenis: SessionType;
  minit: number;
  tajuk: string;
  jarakM: number; // jarak lumba/ujian pelan ini (dipakai bila jenis "ujian")
  segmen?: Segment[]; // langkah pemasa - untuk semakan interval/tempo dari fail FIT
  usaha: string; // teks usaha; pace sasaran interval/tempo ada di sini
  walk?: boolean; // mod jalan sementara: aktiviti jalan diterima, tiada semakan nisbah lari
}

export type PlanKind = "5k" | Distance;

export const ISO = /^\d{4}-\d{2}-\d{2}$/;
const num = (v: string | undefined) => (v ? Number(v) : undefined);

export const planKey = (bulan: number | string, tahap: string, masa: number | string | undefined, hari: number | string, pace?: number | string) =>
  `pelan-5k:${bulan}-${tahap}-${masa ?? ""}-${hari}${pace ? `-p${pace}` : ""}`;

export const distancePlanKey = (jarak: string, minggu: number, masa: number, sasaran: number | string | undefined, hari: number) =>
  `pelan-${jarak}:${minggu}-${masa}-${sasaran ?? ""}-${hari}`;

/** Parameter dari kunci bila rekod `#p` tiada (pelan lama). null = kunci tak dikenali. */
export function paramsFromKey(key: string): Record<string, string> | null {
  const [kind, body] = key.split(":");
  if (!kind?.startsWith("pelan-") || !body) return null;
  const [a, b, c, d, ...rest] = body.split("-");
  if (!a || !b || !d) return null;
  if (kind === "pelan-5k") {
    const pace = rest.find((x) => /^p\d+$/.test(x))?.slice(1);
    return { bulan: a, tahap: b, ...(c ? { masa: c } : {}), hari: d, ...(pace ? { pace } : {}) };
  }
  const distance = kind.slice("pelan-".length);
  if (distance === "10k" || distance === "21k" || distance === "42k")
    return { jarak: distance, minggu: a, masa: b, ...(c ? { sasaran: c } : {}), hari: d };
  return null;
}

/**
 * "Kemas kini pelan": tanda "<minggu>.<sesi>" ikut indeks, jadi bila struktur minggu berubah (contoh 3 -> 4
 * hari) indeks beralih dan tanda jatuh pada sesi lain. Petakan setiap tanda ke (minggu, jenis, kali ke-n jenis
 * itu dalam minggu) dan cari sesi yang sama dalam pelan baharu. Tiada padanan = tanda dibuang.
 */
export function remapProgress(siap: string[], lama: Week[], baru: Week[]): string[] {
  const peta = (minggu: Week[]) => {
    const m = new Map<string, string>(); // id -> "minggu:jenis:n"
    for (const w of minggu) {
      const kali: Record<string, number> = {};
      w.sesi.forEach((s, i) => m.set(`${w.no}.${i}`, `${w.no}:${s.jenis}:${(kali[s.jenis] = (kali[s.jenis] ?? 0) + 1)}`));
    }
    return m;
  };
  const dari = peta(lama);
  const ke = new Map([...peta(baru)].map(([id, k]) => [k, id]));
  return [...new Set(siap.map((id) => ke.get(dari.get(id) ?? "")).filter((id): id is string => !!id))];
}

// Parameter URL pelan (tarikh mula, MAF...) disimpan di "<kunci>#p" supaya dashboard dan awan
// buka semula pelan yang sama, bukan hanya input dalam kunci.
const PARAM = /^(bulan|tahap|hari|masa|mula|maf|umur|keadaan|jarak|minggu|sasaran|lumba|pace)$/;
export const planParams = (q: URLSearchParams): Record<string, string> =>
  Object.fromEntries([...q].filter(([k, v]) => PARAM.test(k) && v && v.length <= 100));

/** Buang kunci asing, samakan nama tool (`distance`) dengan params borang (`jarak`). */
export function normalizePlanParams(kind: PlanKind, raw: Record<string, unknown>): Record<string, string> {
  const input = Object.fromEntries(
    Object.entries(raw)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => [k, String(v)]),
  ) as Record<string, string>;
  if (input.mula && !ISO.test(input.mula)) throw new Error("Tarikh mula mesti YYYY-MM-DD.");
  if (input.lumba && !ISO.test(input.lumba)) throw new Error("Tarikh lumba mesti YYYY-MM-DD.");

  if (kind === "5k") {
    // Tool AI boleh hantar `minggu` untuk pelan lumba; key borang guna `bulan` ("12w").
    if (input.minggu && !input.bulan) input.bulan = `${input.minggu}w`;
    delete input.jarak;
    delete input.distance;
  } else {
    input.jarak = kind;
    delete input.distance;
  }
  return planParams(new URLSearchParams(input));
}

export function buildFromParams(kind: PlanKind, p: Record<string, string>, nadi?: { maf: number; bawah: number }) {
  if (kind === "5k") {
    const race = /^(\d+)w$/.exec(p.bulan ?? "");
    return buildPlan({
      bulan: Number(p.bulan),
      minggu: p.minggu ? num(p.minggu) : race ? Number(race[1]) : undefined,
      pace: num(p.pace),
      tahap: p.tahap as Level,
      hari: Number(p.hari),
      masa5k: num(p.masa),
      nadi,
    });
  }
  return buildDistancePlan({
    jarak: kind,
    minggu: Number(p.minggu),
    hari: Number(p.hari),
    masa: Number(p.masa),
    sasaran: num(p.sasaran),
    pace: num(p.pace),
    nadi,
  });
}

/** Kunci yang akan dipakai. `requestedKey` = kunci pelan sedia ada untuk kemas kini. */
export function planKeyFor(kind: PlanKind, p: Record<string, string>, requestedKey?: string): string {
  if (requestedKey) return requestedKey;
  if (kind === "5k") return planKey(p.bulan, p.tahap, p.masa, p.hari, p.pace);
  const c = DISTANCES[kind];
  if (!c) throw new Error("Jarak pelan tidak sah.");
  return distancePlanKey(kind, Number(p.minggu), Number(p.masa), p.pace ? `p${p.pace}` : p.sasaran, Number(p.hari));
}

/**
 * Bina pelan dari kunci + parameter tersimpan (pelan lama `bulan`/`minggu` dan v2 `minggu`+`lumba`, `pace`).
 * Nadi (MAF) tidak mengubah minit sesi, jadi tidak perlu di sini. null = tidak sah.
 */
export function planFromParams(kunci: string, p: Record<string, string>): { jenis: "5k" | Distance; minggu: Week[]; hari: number } | null {
  const jenis = /^pelan-(5k|10k|21k|42k):/.exec(kunci)?.[1] as "5k" | Distance | undefined;
  const hari = Number(p.hari);
  const n = (k: string) => (p[k] ? Number(p[k]) : undefined);
  const h =
    jenis === "5k"
      ? buildPlan({ bulan: Number(p.bulan), minggu: n("minggu"), pace: n("pace"), tahap: p.tahap as Level, hari, masa5k: n("masa") })
      : jenis
        ? buildDistancePlan({ jarak: jenis, minggu: Number(p.minggu), hari, masa: Number(p.masa), sasaran: n("sasaran"), pace: n("pace") })
        : null;
  return h?.ok && jenis ? { jenis, minggu: h.minggu, hari } : null;
}

/**
 * Tarikh sesi. Pelan lumba: hari lumba (`ujian`) = tarikh lumba sebenar (pelan 3 hari: sesi akhir Sabtu, lumba
 * Ahad), sesi lain dianjak ikut hari lumba (raceShift) - tiada sesi selepas lumba.
 */
export function planSessionDate(isnin: Date, w: number, hari: number, i: number, jenis: SessionType, lumba?: string | null) {
  const l = lumba && ISO.test(lumba) ? new Date(`${lumba}T00:00:00`) : null;
  return jenis === "ujian" && l ? l : sessionDate(isnin, w, hari, i, l);
}

/** Sesi bertarikh dari kunci + parameter pelan awan. null = tiada tarikh mula / pelan tidak sah. */
export function planSessions(kunci: string, p: Record<string, string>, walkUntil?: string | null, today = todayMY()): PlanSession[] | null {
  if (!ISO.test(p.mula ?? "")) return null;
  const h = planFromParams(kunci, p);
  if (!h) return null;
  const { jenis, hari } = h;
  const jarakM = jenis === "5k" ? 5000 : DISTANCES[jenis].km * 1000;
  const isnin = startMonday(new Date(`${p.mula}T00:00:00`));
  return h.minggu.flatMap((w) =>
    w.sesi.map((s, i) => {
      const tarikh = isoDate(planSessionDate(isnin, w.no, hari, i, s.jenis, p.lumba));
      const walk = s.jenis !== "ujian" && isWalkDate(tarikh, walkUntil, today);
      return {
        id: `${w.no}.${i}`,
        minggu: w.no,
        tarikh,
        jenis: s.jenis,
        minit: s.minit,
        tajuk: walk ? `Jalan ${s.minit} min` : s.tajuk,
        jarakM,
        segmen: walk ? undefined : s.segmen,
        usaha: walk ? "Jalan santai; berhenti kalau sakit bertambah." : s.usaha,
        ...(walk ? { walk: true } : {}),
      };
    }),
  );
}
