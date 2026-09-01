import type { Circle, TweetInfo } from "./types";
import type { Checks } from "./lib/checks";

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
  const res = signal ? await fetch("/api/events", { signal }) : await fetch("/api/events");
  if (!res.ok) throw new Error("이벤트 정보를 불러오지 못했어요");
  const data = await res.json();
  return data.events || [];
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

export function login(): void {
  const returnTo = `${window.location.origin}${window.location.pathname}${window.location.hash}`;
  window.location.href = `https://auth.bini59.dev/login?client_id=seoko-maps&return_to=${encodeURIComponent(returnTo)}`;
}

export function logout(): void {
  const returnTo = `${window.location.origin}${window.location.pathname}${window.location.hash}`;
  window.location.href = `https://auth.bini59.dev/logout?client_id=seoko-maps&return_to=${encodeURIComponent(returnTo)}`;
}

export async function fetchChecks(eventSlug: string): Promise<ChecksResponse> {
  const res = await fetch(`/api/checks?event=${encodeURIComponent(eventSlug)}`, { credentials: "include" });
  if (!res.ok) throw new Error("방문 체크를 불러오지 못했어요");
  return await res.json();
}

export async function saveChecks(eventSlug: string, checks: Record<string, boolean>): Promise<void> {
  const res = await fetch(`/api/checks?event=${encodeURIComponent(eventSlug)}`, {
    method: "PUT",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ checks }),
  });
  if (!res.ok) throw new Error("방문 체크를 저장하지 못했어요");
}

type ChecksResponse = { checks: Record<string, boolean> };

export async function fetchCircles(
  eventSlug: string,
  signal?: AbortSignal,
): Promise<{ circles: Circle[]; witchformExtra: Circle[] }> {
  const res = await fetch(
    `/api/circles?event=${encodeURIComponent(eventSlug)}&status=all`,
    { signal },
  );
  if (!res.ok) throw new Error("서클 목록을 불러오지 못했어요");
  const data = await res.json();
  const all: ApiCircle[] = data.circles || [];
  return {
    circles: all.filter((c) => c.status === "confirmed").map(toCircle),
    witchformExtra: all.filter((c) => c.status === "unlisted").map(toCircle),
  };
}
