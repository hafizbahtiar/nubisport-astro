// Satu laluan simpan pelan untuk borang dan tool AI. LocalStorage sahaja - cloud sync kekal
// di lib/cloud-sync.ts supaya UI borang tidak berubah. Semak: bun scripts/check-plan-save.ts
import { CREATED_KEY, readList, readParams, writeList, writeParams } from "./saved-plans";
import { buildFromParams, normalizePlanParams, paramsFromKey, planFromParams, planKeyFor, remapProgress, type PlanKind } from "./plan-core";

export { normalizePlanParams, buildFromParams, planKeyFor, type PlanKind } from "./plan-core";
export type PreviewPlanResult =
  | { ok: true; key: string; params: Record<string, string>; plan: { minggu: import("./plan-5k").Week[] } }
  | { ok: false; error: string };
export type SavePlanResult =
  | { ok: true; key: string; params: Record<string, string>; href: string }
  | { ok: false; error: string };

/** Sahkan dan kira kunci tanpa menulis apa-apa (untuk kad Sahkan AI). */
export function previewPlan(
  kind: PlanKind,
  raw: Record<string, unknown>,
  requestedKey?: string,
): PreviewPlanResult {
  let params: Record<string, string>;
  try {
    params = normalizePlanParams(kind, raw);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }

  const plan = buildFromParams(kind, params);
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
