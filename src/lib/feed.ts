// Feed komuniti Nubi: DTO dari backend, tiada data lain ahli. API: lib/api.ts.
import { api, json } from "./api";
import { sharedRecords, type SharedRecords } from "./activity-file";

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

export async function fetchFeed(cursor?: string | null): Promise<FeedPage | null> {
  const query = new URLSearchParams({ limit: "20" });
  if (cursor) query.set("cursor", cursor);
  const r = await api(`/me/apps/nubi/feed?${query}`).catch(() => null);
  if (!r?.ok) return null;
  const body = await json(r).catch(() => null);
  return body?.success && body.data ? (body.data as FeedPage) : null;
}

export async function toggleKudos(
  id: number,
  on: boolean,
): Promise<{ count: number; mine: boolean } | null> {
  const r = await api(`/me/apps/nubi/feed/${id}/kudos`, {
    method: on ? "POST" : "DELETE",
  }).catch(() => null);
  if (!r?.ok) return null;
  const body = await json(r).catch(() => null);
  return body?.success && body.data ? body.data : null;
}

export interface FeedActivity extends FeedItem {
  elapsedS: number;
}

const dataOf = async <T>(path: string): Promise<T | null> => {
  const r = await api(path).catch(() => null);
  if (!r?.ok) return null;
  const body = await json(r).catch(() => null);
  return body?.success && body.data ? (body.data as T) : null;
};

/** Satu aktiviti dalam feed (peraturan sama dengan feed). null = tiada / tak dikongsi. */
export const fetchFeedActivity = (id: number) => dataOf<FeedActivity>(`/me/apps/nubi/feed/${id}`);

/** Salinan rekod pemilik. null = dikongsi sebelum salinan wujud, atau tak dikongsi lagi. */
export const fetchFeedRecords = (id: number) => dataOf<SharedRecords>(`/me/apps/nubi/feed/${id}/records`);

/** Hantar salinan rekod aktiviti sendiri. false = gagal; aktiviti tetap dikongsi, cuma tanpa detail. */
export async function uploadSharedRecords(id: number, records: any[]): Promise<boolean> {
  const body = sharedRecords(records);
  if (!body) return false;
  const r = await api(`/me/apps/nubi/activities/${id}/shared`, {
    method: "PUT",
    body: JSON.stringify(body),
  }).catch(() => null);
  return !!r?.ok;
}
