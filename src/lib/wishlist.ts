import type { CircleWishlistMap } from "@/types";
import type { KV } from "@/lib/checks";
import { nextTimestamp } from "@/lib/sync";
export { compareTimestamps } from "@/lib/sync";

export type WishlistState<T> = { value: T; updatedAt: string | null };
export const eventWishlistKey = "gbc-seoko-event-wishlist";
export const circleWishlistKey = (eventSlug: string) => `gbc-seoko-wishlist:${eventSlug}`;

function timestamp(value: unknown): string | null {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return null;
  return new Date(Date.parse(value)).toISOString();
}

export const nextWishlistTimestamp = nextTimestamp;

function parse<T>(raw: string | null, fallback: T): WishlistState<T> {
  if (!raw) return { value: fallback, updatedAt: null };
  try {
    const data = JSON.parse(raw) as { value?: T; updatedAt?: unknown };
    return { value: data.value ?? fallback, updatedAt: timestamp(data.updatedAt) };
  } catch {
    return { value: fallback, updatedAt: null };
  }
}

export function loadEventWishlistState(kv: KV): WishlistState<string[]> {
  const state = parse<string[]>(kv.getItem(eventWishlistKey), []);
  return { value: Array.isArray(state.value) ? state.value.filter((item) => typeof item === "string") : [], updatedAt: state.updatedAt };
}

export function saveEventWishlistState(kv: KV, state: WishlistState<string[]>): void {
  try { kv.setItem(eventWishlistKey, JSON.stringify(state)); } catch {}
}

export function pruneCircleWishlist(circles: CircleWishlistMap): CircleWishlistMap {
  return Object.fromEntries(Object.entries(circles).flatMap(([id, entry]) => {
    if (!entry || typeof entry !== "object") return [];
    const memo = typeof entry.memo === "string" ? entry.memo.trim().slice(0, 500) : "";
    return entry.star === true || memo ? [[id, { ...(entry.star === true ? { star: true } : {}), ...(memo ? { memo } : {}) }]] : [];
  }));
}

export function loadCircleWishlistState(kv: KV, eventSlug: string): WishlistState<CircleWishlistMap> {
  const state = parse<CircleWishlistMap>(kv.getItem(circleWishlistKey(eventSlug)), {});
  return { value: pruneCircleWishlist(state.value && typeof state.value === "object" ? state.value : {}), updatedAt: state.updatedAt };
}

export function saveCircleWishlistState(kv: KV, eventSlug: string, state: WishlistState<CircleWishlistMap>): void {
  try { kv.setItem(circleWishlistKey(eventSlug), JSON.stringify({ value: pruneCircleWishlist(state.value), updatedAt: state.updatedAt })); } catch {}
}

export function clearAllWishlist(kv: KV): void {
  const storage = kv as KV & { length?: number; key?: (index: number) => string | null; removeItem?: (key: string) => void };
  if (typeof storage.length !== "number" || !storage.key) return;
  const keys = Array.from({ length: storage.length }, (_, i) => storage.key!(i)).filter((key): key is string => Boolean(key));
  for (const key of keys) if (key === eventWishlistKey || key.startsWith("gbc-seoko-wishlist:")) storage.removeItem?.(key);
}
