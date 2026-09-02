import type { ApiEvent } from "../api";

/** 행사 부제: 별칭·장소·기간 중 존재하는 것만 · 로 잇는다. */
export function eventSubtitle(event: ApiEvent | null): string {
  if (!event) return "행사 정보를 불러오는 중…";
  const parts = [event.alias || event.title, event.venue, event.date_label].filter(Boolean);
  return parts.length ? parts.join(" · ") : event.title;
}
