import { queryOptions } from "@tanstack/react-query";
import { fetchAuth, fetchCircles, fetchEvents } from "../api";

/** 읽기 전용 데이터(events/circles) 캐시 신선도. */
const READ_STALE_TIME = 5 * 60 * 1000;

// 쿼리 키/옵션의 단일 정의. 화면이 늘어도 같은 데이터는 같은 키를 쓰게 해 캐시가 갈라지지 않도록 한다.

export const eventsQuery = () => queryOptions({
  queryKey: ["events"],
  queryFn: ({ signal }) => fetchEvents(signal),
  staleTime: READ_STALE_TIME,
  retry: false,
});

export const circlesQuery = (eventSlug: string | null) => queryOptions({
  queryKey: ["circles", eventSlug],
  queryFn: ({ signal }) => fetchCircles(eventSlug!, signal),
  staleTime: READ_STALE_TIME,
  retry: false,
  enabled: eventSlug !== null,
});

export type AuthState = Awaited<ReturnType<typeof fetchAuth>>;
export const SIGNED_OUT: AuthState = { enabled: false, user: null };

/** 세션은 로그인/로그아웃 시 setQueryData로 갱신하므로 자동 재조회하지 않는다. 네트워크 실패는 비로그인으로 취급. */
export const authQuery = () => queryOptions({
  queryKey: ["auth"],
  queryFn: () => fetchAuth().catch((): AuthState => SIGNED_OUT),
  staleTime: Infinity,
  retry: false,
});
