// Feed komuniti Nubi: DTO dari backend, tiada data lain ahli. API: lib/api.ts.
import { api, json } from "./api";
import type { ActivityWeather, SharedRecords } from "./activity-file";

export interface FeedItem {
  id: number;
  startedAt: string;
  sport: "run" | "walk" | "hike" | "ride" | "other";
  name: string | null;
  distanceM: number;
  movingS: number;
  elevationGainM: number | null;
  preview: [number, number][] | null;
  shareHr: boolean;
  avgHr: number | null;
  maxHr: number | null;
  author: { name: string; profileHref: string | null };
  kudos: { count: number; mine: boolean };
  own: boolean; // aktiviti sendiri - tiada butang kudos
}
export interface FeedPage {
  items: FeedItem[];
  next: string | null;
}

// Satu pembaca untuk semua panggilan feed: { success, data } -> data, selain itu null.
const dataOf = async <T>(path: string, init?: RequestInit): Promise<T | null> => {
  const r = await api(path, init).catch(() => null);
  if (!r?.ok) return null;
  const body = await json(r).catch(() => null);
  return body?.success && body.data ? (body.data as T) : null;
};

export function fetchFeed(cursor?: string | null): Promise<FeedPage | null> {
  const query = new URLSearchParams({ limit: "20" });
  if (cursor) query.set("cursor", cursor);
  return dataOf<FeedPage>(`/me/apps/nubi/feed?${query}`);
}

export const toggleKudos = (id: number, on: boolean) =>
  dataOf<{ count: number; mine: boolean }>(`/me/apps/nubi/feed/${id}/kudos`, {
    method: on ? "POST" : "DELETE",
  });

export interface FeedActivity extends FeedItem {
  elapsedS: number;
  runRatio: number | null;
  weather: ActivityWeather | null;
}

/** Satu aktiviti dalam feed (peraturan sama dengan feed). null = tiada / tak dikongsi. */
export const fetchFeedActivity = (id: number) => dataOf<FeedActivity>(`/me/apps/nubi/feed/${id}`);

/** Salinan rekod pemilik - JSON mentah (backend hantar terus dari storan). null = tiada salinan / tak dikongsi. */
export async function fetchFeedRecords(id: number): Promise<SharedRecords | null> {
  const r = await api(`/me/apps/nubi/feed/${id}/records`).catch(() => null);
  return r?.ok ? ((await r.json().catch(() => null)) as SharedRecords | null) : null;
}

/** Hantar salinan rekod aktiviti sendiri. false = gagal; aktiviti tetap dikongsi, cuma tanpa detail. */
export async function uploadSharedRecords(id: number, shared: SharedRecords | null): Promise<boolean> {
  if (!shared) return false;
  const r = await api(`/me/apps/nubi/activities/${id}/shared`, {
    method: "PUT",
    body: JSON.stringify(shared),
  }).catch(() => null);
  return !!r?.ok;
}
