import type { Circle, TweetInfo } from "./types";
import type { Checks } from "./lib/checks";
import { cacheKeys, loadCache, saveCache, type CacheStorage } from "./lib/cache";

export type ApiMeta = { schemaVersion: number; hash: string };

export type ApiCircle = {
  id: number;
  participationId: number;
  slug: string;
  name: string;
  ips: string[];
  booth: string | null;
  day: string | null;
  boothUrl: string | null;
  highlight: boolean;
  badge: string | null;
  note: string | null;
  status: string;
  links: { kind: string; label: string; url: string }[];
  tweetInfo?: TweetInfo;
};

export type ApiEvent = {
  id: number;
  slug: string;
  title: string;
  alias: string | null;
  fare_id: number | null;
  date_label: string | null;
  start_date: string | null;
  end_date: string | null;
  venue: string | null;
  map_url: string | null;
  status: string;
};

type DatasetLoader<T> = {
  cacheKey: string;
  metadataUrl: string;
  dataUrl: string;
  errorMessage: string;
  isData: (value: unknown) => value is T;
  parseData: (body: unknown) => T | null;
};

function browserStorage(): CacheStorage | null {
  return typeof localStorage === "undefined" ? null : localStorage;
}

function parseMeta(body: unknown): ApiMeta | null {
  if (!body || typeof body !== "object") return null;
  const meta = (body as Record<string, unknown>).meta;
  if (!meta || typeof meta !== "object") return null;
  const value = meta as Record<string, unknown>;
  if (value.schemaVersion !== 1 || typeof value.hash !== "string" || !/^[a-f0-9]{32}$/i.test(value.hash)) return null;
  return { schemaVersion: value.schemaVersion, hash: value.hash.toLowerCase() };
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

async function requestJson(url: string, signal?: AbortSignal): Promise<{ response: Response; body: unknown }> {
  const response = signal ? await fetch(url, { signal }) : await fetch(url);
  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    if (isAbort(error)) throw error;
    body = null;
  }
  return { response, body };
}

async function loadDataset<T>({ cacheKey, metadataUrl, dataUrl, errorMessage, isData, parseData }: DatasetLoader<T>, signal?: AbortSignal): Promise<T> {
  const storage = browserStorage();
  const cached = storage ? loadCache(storage, cacheKey, isData) : null;
  let remoteMeta: ApiMeta | null = null;

  try {
    const metadata = await requestJson(metadataUrl, signal);
    if (metadata.response.ok) remoteMeta = parseMeta(metadata.body);
    if (remoteMeta && cached && cached.hash === remoteMeta.hash) return cached.data;
    if (!remoteMeta && cached) return cached.data;
  } catch (error) {
    if (isAbort(error)) throw error;
    if (cached) return cached.data;
  }

  try {
    const full = await requestJson(dataUrl, signal);
    if (!full.response.ok) throw new Error(errorMessage);
    const data = parseData(full.body);
    if (data === null) throw new Error("API response was invalid");
    const meta = parseMeta(full.body) ?? remoteMeta;
    if (storage && meta) saveCache(storage, cacheKey, meta.hash, data);
    return data;
  } catch (error) {
    if (isAbort(error)) throw error;
    if (cached) return cached.data;
    throw error;
  }
}

function toCircle(c: ApiCircle): Circle {
  return {
    id: c.slug,
    name: c.name,
    links: c.links.map((l) => ({ label: l.label, url: l.url })),
    booth: c.booth ?? undefined,
    day: c.day ?? undefined,
    highlight: c.highlight,
    note: c.note ?? undefined,
    boothUrl: c.boothUrl ?? undefined,
    ips: c.ips,
    badge: c.badge ?? undefined,
    tweetInfo: c.tweetInfo,
    unlisted: c.status === "unlisted",
  };
}

/** Pick the active event, falling back to the first (most recent) or null. */
export function pickActiveEvent(events: ApiEvent[]): ApiEvent | null {
  return events.find((e) => e.status === "active") ?? events[0] ?? null;
}

export async function fetchEvents(signal?: AbortSignal): Promise<ApiEvent[]> {
  return loadDataset({
    cacheKey: cacheKeys.events,
    metadataUrl: "/api/events?metadata=1",
    dataUrl: "/api/events",
    errorMessage: "이벤트 정보를 불러오지 못했어요",
    isData: (value): value is ApiEvent[] => Array.isArray(value) && value.every((event) => (
      event !== null && typeof event === "object"
      && typeof (event as { slug?: unknown }).slug === "string"
      && typeof (event as { title?: unknown }).title === "string"
    )),
    parseData: (body) => {
      if (!body || typeof body !== "object") return null;
      const events = (body as { events?: unknown }).events;
      if (!Array.isArray(events) || !events.every((event) => (
        event !== null && typeof event === "object"
        && typeof (event as { slug?: unknown }).slug === "string"
        && typeof (event as { title?: unknown }).title === "string"
      ))) return null;
      return events as ApiEvent[];
    },
  }, signal);
}

export type AuthUser = {
  userId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
};

export async function fetchAuth(): Promise<{ enabled: boolean; user: AuthUser | null }> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (!res.ok) return { enabled: false, user: null };
  return await res.json();
}

export const AUTH_ORIGIN = "https://auth.bini59.dev";

export function login(): void {
  const returnTo = `${window.location.origin}${window.location.pathname}${window.location.hash}`;
  window.location.href = `${AUTH_ORIGIN}/login?client_id=seoko-maps&return_to=${encodeURIComponent(returnTo)}`;
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
}

export async function fetchChecks(eventSlug: string): Promise<ChecksResponse> {
  const res = await fetch(`/api/checks?event=${encodeURIComponent(eventSlug)}`, { credentials: "include" });
  if (!res.ok) throw new Error("방문 체크를 불러오지 못했어요");
  return await res.json();
}

export async function saveChecks(eventSlug: string, checks: Record<string, boolean>, updatedAt?: string | null): Promise<ChecksResponse> {
  const res = await fetch(`/api/checks?event=${encodeURIComponent(eventSlug)}`, {
    method: "PUT",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ checks, ...(updatedAt ? { updatedAt } : {}) }),
  });
  if (!res.ok) throw new Error("방문 체크를 저장하지 못했어요");
  return await res.json();
}

export type ChecksResponse = {
  checks: Record<string, boolean>;
  updatedAt: string | null;
  saved?: boolean;
  conflict?: "stale" | "clock_skew";
};

export async function fetchCircles(
  eventSlug: string,
  signal?: AbortSignal,
): Promise<{ circles: Circle[]; witchformExtra: Circle[] }> {
  const query = `event=${encodeURIComponent(eventSlug)}&status=all`;
  return loadDataset({
    cacheKey: cacheKeys.circles(eventSlug),
    metadataUrl: `/api/circles?${query}&metadata=1`,
    dataUrl: `/api/circles?${query}`,
    errorMessage: "서클 목록을 불러오지 못했어요",
    isData: (value): value is { circles: Circle[]; witchformExtra: Circle[] } => {
      if (!value || typeof value !== "object") return false;
      const data = value as { circles?: unknown; witchformExtra?: unknown };
      return [data.circles, data.witchformExtra].every((list) => Array.isArray(list) && list.every((circle) => (
        circle !== null && typeof circle === "object"
        && typeof (circle as { id?: unknown }).id === "string"
        && typeof (circle as { name?: unknown }).name === "string"
        && Array.isArray((circle as { links?: unknown }).links)
      )));
    },
    parseData: (body) => {
      if (!body || typeof body !== "object") return null;
      const circles = (body as { circles?: unknown }).circles;
      if (!Array.isArray(circles)) return null;
      const all = circles as ApiCircle[];
      if (!all.every((circle) => (
        circle !== null && typeof circle === "object"
        && typeof circle.slug === "string"
        && typeof circle.name === "string"
        && Array.isArray(circle.links)
      ))) return null;
      return {
        circles: all.filter((circle) => circle.status === "confirmed").map(toCircle),
        witchformExtra: all.filter((circle) => circle.status === "unlisted").map(toCircle),
      };
    },
  }, signal);
}
