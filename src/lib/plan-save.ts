// Satu laluan simpan pelan untuk borang dan tool AI. LocalStorage sahaja - cloud sync kekal
// di lib/cloud-sync.ts supaya UI borang tidak berubah. Semak: bun scripts/check-plan-save.ts
import {
  CREATED_KEY,
  distancePlanKey,
  paramsFromKey,
  planKey,
  planParams,
  readList,
  readParams,
  remapProgress,
  writeList,
  writeParams,
} from "./saved-plans";
import { buildPlan, type Level } from "./plan-5k";
import { DISTANCES, buildDistancePlan, type Distance } from "./distance-plan";
import { planFromParams } from "./plan-sync";

export type PlanKind = "5k" | Distance;
export type PreviewPlanResult =
  | { ok: true; key: string; params: Record<string, string>; plan: { minggu: import("./plan-5k").Week[] } }
  | { ok: false; error: string };
export type SavePlanResult =
  | { ok: true; key: string; params: Record<string, string>; href: string }
  | { ok: false; error: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const num = (v: string | undefined) => (v ? Number(v) : undefined);

/** Buang kunci asing, samakan nama tool (`distance`) dengan params borang (`jarak`). */
function normalize(kind: PlanKind, raw: Record<string, unknown>): Record<string, string> {
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

function build(kind: PlanKind, p: Record<string, string>) {
  if (kind === "5k") {
    const race = /^(\d+)w$/.exec(p.bulan ?? "");
    return buildPlan({
      bulan: Number(p.bulan),
      minggu: p.minggu ? num(p.minggu) : race ? Number(race[1]) : undefined,
      pace: num(p.pace),
      tahap: p.tahap as Level,
      hari: Number(p.hari),
      masa5k: num(p.masa),
    });
  }
  return buildDistancePlan({
    jarak: kind,
    minggu: Number(p.minggu),
    hari: Number(p.hari),
    masa: Number(p.masa),
    sasaran: num(p.sasaran),
    pace: num(p.pace),
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

/** Sahkan dan kira kunci tanpa menulis apa-apa (untuk kad Sahkan AI). */
export function previewPlan(
  kind: PlanKind,
  raw: Record<string, unknown>,
  requestedKey?: string,
): PreviewPlanResult {
  let params: Record<string, string>;
  try {
    params = normalize(kind, raw);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }

  const plan = build(kind, params);
  if (!plan.ok) return { ok: false, error: plan.sebab };

  const dibuat = readList(CREATED_KEY);
  if (requestedKey && (!requestedKey.startsWith(`pelan-${kind}:`) || !dibuat.includes(requestedKey))) {
    return { ok: false, error: "Pelan itu tiada dalam akaun ini." };
  }
  return { ok: true, key: planKeyFor(kind, params, requestedKey), params, plan };
}

/**
 * Simpan pelan (baru atau kemas kini) dalam pelayar. Update kekal kunci yang sama dan
 * memetakan tanda siap ke sesi yang sama dalam struktur baru.
 */
export function savePlan(
  kind: PlanKind,
  raw: Record<string, unknown>,
  requestedKey?: string,
): SavePlanResult {
  const preview = previewPlan(kind, raw, requestedKey);
  if (!preview.ok) return preview;
  const { key, params, plan } = preview;
  const dibuat = readList(CREATED_KEY);
  const oldParams = readParams(key) ?? paramsFromKey(key);
  const old = oldParams ? planFromParams(key, oldParams) : null;
  const progress = old ? remapProgress(readList(key), old.minggu, plan.minggu) : readList(key);

  writeList(CREATED_KEY, dibuat.includes(key) ? dibuat : [...dibuat, key]);
  writeParams(key, params);
  writeList(key, progress);
  return { ok: true, key, params, href: `/account/plans/${kind}/view?kunci=${encodeURIComponent(key)}` };
}
