// Saved plans for the plans index (Table) and view links.
// Plan keys/params stay Malay (stored data); code identifiers are English.
import { CREATED_KEY, readList, readParams, paramsFromKey } from "./saved-plans";
import { planFromParams } from "./plan-sync";
import { LEVELS, formatPace, type Level, type Week } from "./plan-5k";
import { DISTANCES, formatTime, type Distance } from "./distance-plan";

export interface SavedPlan {
  key: string;
  kind: "5k" | Distance;
  name: string;
  detail: string;
  href: string;
  params: Record<string, string>;
  weeks: Week[];
  done: number;
  total: number;
}

const dateLabel = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("ms-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/** One saved plan (index, Dashboard). Without a `#p` record the params come from the key (old plans). null = not a valid plan. */
export function describePlan(key: string): SavedPlan | null {
  const params = readParams(key) ?? paramsFromKey(key);
  const plan = params && planFromParams(key, params);
  if (!params || !plan) return null;
  const base = {
    key,
    kind: plan.jenis,
    href: `/account/plans/${plan.jenis}/view?kunci=${encodeURIComponent(key)}`,
    params,
    weeks: plan.minggu,
    done: new Set(readList(key)).size,
    total: plan.minggu.reduce((n, w) => n + w.sesi.length, 0),
  };
  const race = params.lumba ? `Lumba ${dateLabel(params.lumba)} · ${params.minggu} minggu` : null;

  if (plan.jenis === "5k")
    return {
      ...base,
      name: `5K · ${race ?? `${params.bulan} bulan`} · ${params.hari} hari seminggu`,
      detail: `${LEVELS[params.tahap as Level]}${params.masa ? ` (${params.masa} min)` : ""}${params.pace ? ` · pace ${formatPace(+params.pace)}/km` : ""}`,
    };

  const distance = DISTANCES[plan.jenis];
  const target = params.pace ? (+params.pace * distance.km) / 60 : params.sasaran ? +params.sasaran : null;
  return {
    ...base,
    name: `${distance.nama} · ${race ?? `${params.minggu} minggu`} · ${params.hari} hari seminggu`,
    detail: `${distance.prasyarat.nama} ${params.masa} min → ${target ? `bawah ${formatTime(target)}` : "habis"}`,
  };
}

/** All plans in CREATED_KEY that still build. */
export const savedPlans = (): SavedPlan[] =>
  readList(CREATED_KEY)
    .map(describePlan)
    .filter((plan): plan is SavedPlan => !!plan);
