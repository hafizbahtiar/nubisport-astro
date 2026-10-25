// Feed komuniti Nubi: DTO dari backend, tiada data lain ahli. API: lib/api.ts.
import { api, json } from "./api";

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
