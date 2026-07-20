// 상세 화면 라우팅 — 해시 기반. (vite base가 "./"라 deep-path 라우팅은 에셋 경로가
// 깨지므로 해시를 쓴다. 직접 진입/뒤로가기 모두 루트 경로에서 동작.)

export type AppRoute =
  | { kind: "events" }
  | { kind: "event"; eventSlug: string }
  | { kind: "circle"; eventSlug: string; circleSlug: string }
  | { kind: "legacy-circle"; circleSlug: string };

function decodeSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

/** location.hash → 현재 앱 화면. */
export function parseRoute(hash: string): AppRoute {
  const circle = /^#?\/events\/([^/]+)\/c\/([^/]+)$/.exec(hash);
  if (circle) {
    const eventSlug = decodeSegment(circle[1]);
    const circleSlug = decodeSegment(circle[2]);
    if (eventSlug !== null && circleSlug !== null) {
      return { kind: "circle", eventSlug, circleSlug };
    }
  }
  const event = /^#?\/events\/([^/]+)$/.exec(hash);
  if (event) {
    const eventSlug = decodeSegment(event[1]);
    if (eventSlug !== null) return { kind: "event", eventSlug };
  }
  const legacyCircle = /^#?\/c\/([^/]+)$/.exec(hash);
  if (legacyCircle) {
    const circleSlug = decodeSegment(legacyCircle[1]);
    if (circleSlug !== null) return { kind: "legacy-circle", circleSlug };
  }
  return { kind: "events" };
}

export const eventsHash = () => "#/";

export const eventHash = (eventSlug: string) =>
  `#/events/${encodeURIComponent(eventSlug)}`;

export const circleHash = (eventSlug: string, circleSlug: string) =>
  `${eventHash(eventSlug)}/c/${encodeURIComponent(circleSlug)}`;

/** location.hash → 상세 서클 id (없으면 null). */
export function parseDetailId(hash: string): string | null {
  const m = /^#?\/c\/(.+)$/.exec(hash);
  return m ? decodeURIComponent(m[1]) : null;
}

/** 상세 서클 id → location.hash 문자열. */
export const detailHash = (id: string) => `#/c/${encodeURIComponent(id)}`;
