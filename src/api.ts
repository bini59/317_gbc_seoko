import type { Circle, TweetInfo } from "./types";

export type ApiCircle = {
  id: number;
  participationId: number;
  slug: string;
  name: string;
  genre: string | null;
  genres: string[];
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
    genre: c.genre ?? "",
    links: c.links.map((l) => ({ label: l.label, url: l.url })),
    booth: c.booth ?? undefined,
    day: c.day ?? undefined,
    highlight: c.highlight,
    note: c.note ?? undefined,
    boothUrl: c.boothUrl ?? undefined,
    genres: c.genres,
    badge: c.badge ?? undefined,
    tweetInfo: c.tweetInfo,
    unlisted: c.status === "unlisted",
  };
}

/** Pick the active event, falling back to the first (most recent) or null. */
export function pickActiveEvent(events: ApiEvent[]): ApiEvent | null {
  return events.find((e) => e.status === "active") ?? events[0] ?? null;
}

export async function fetchActiveEvent(): Promise<ApiEvent | null> {
  const res = await fetch("/api/events");
  if (!res.ok) throw new Error("이벤트 정보를 불러오지 못했어요");
  const data = await res.json();
  return pickActiveEvent(data.events || []);
}

export async function fetchCircles(
  eventSlug: string,
): Promise<{ circles: Circle[]; witchformExtra: Circle[] }> {
  const res = await fetch(
    `/api/circles?event=${encodeURIComponent(eventSlug)}&status=all`,
  );
  if (!res.ok) throw new Error("서클 목록을 불러오지 못했어요");
  const data = await res.json();
  const all: ApiCircle[] = data.circles || [];
  return {
    circles: all.filter((c) => c.status === "confirmed").map(toCircle),
    witchformExtra: all.filter((c) => c.status === "unlisted").map(toCircle),
  };
}
