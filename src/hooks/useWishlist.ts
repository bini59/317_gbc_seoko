import { fetchCircleWishlist, fetchEventWishlist, saveCircleWishlist, saveEventWishlist } from "@/api";
import type { CircleWishlistEntry, CircleWishlistMap, CircleWishlistResponse, EventWishlistResponse } from "@/types";
import { circleWishlistKey, clearAllWishlist, eventWishlistKey, loadCircleWishlistState, loadEventWishlistState, saveCircleWishlistState, saveEventWishlistState } from "@/lib/wishlist";
import { useSyncedState } from "@/hooks/useSyncedState";

const EMPTY_EVENTS: string[] = [];
const EMPTY_CIRCLES: CircleWishlistMap = {};
const eventsToSync = (r: EventWishlistResponse) => ({ value: r.events, updatedAt: r.updatedAt, saved: r.saved });
const circlesToSync = (r: CircleWishlistResponse) => ({ value: r.circles, updatedAt: r.updatedAt, saved: r.saved });

/** 행사 찜. 계정 단위 전역이라 scope는 고정이고, 로그인하면 비로그인 찜은 버리고 서버를 따른다. */
export function useEventWishlist(authenticated: boolean, userId: string | null, onSync?: () => void, onSyncError?: () => void, validEventSlugs: readonly string[] | null = null) {
  const [events, set] = useSyncedState<string[]>({
    scope: "all",
    authenticated,
    userId,
    empty: EMPTY_EVENTS,
    load: () => localStorage.getItem(eventWishlistKey) === null ? null : loadEventWishlistState(localStorage),
    save: (s) => saveEventWishlistState(localStorage, s),
    clearAll: () => clearAllWishlist(localStorage),
    clearOnSignIn: true,
    fetchRemote: () => fetchEventWishlist().then(eventsToSync),
    saveRemote: (v, at) => saveEventWishlist(v, at).then(eventsToSync),
    normalize: validEventSlugs ? (v) => v.filter((slug) => validEventSlugs.includes(slug)) : undefined,
    resyncKey: validEventSlugs,
    onSync,
    onSyncError,
  });
  const toggle = (slug: string) => set((prev) => prev.includes(slug) ? prev.filter((item) => item !== slug) : [...prev, slug]);
  return [events, toggle] as const;
}

const entry = (star: boolean | undefined, memo: string | undefined): CircleWishlistEntry | undefined =>
  star || memo ? { ...(star ? { star: true } : {}), ...(memo ? { memo } : {}) } : undefined;

/** 행사별 서클 찜(별 + 메모). 메모는 타이핑 중 저장을 500ms 미루고, 별 토글이나 언마운트 때 먼저 내보낸다. */
export function useCircleWishlist(eventSlug: string | null, authenticated: boolean, userId: string | null, onSync?: () => void, onSyncError?: () => void, validCircleIds: readonly string[] | null = null) {
  const [circles, set] = useSyncedState<CircleWishlistMap>({
    scope: eventSlug,
    authenticated,
    userId,
    empty: EMPTY_CIRCLES,
    load: () => eventSlug && localStorage.getItem(circleWishlistKey(eventSlug)) !== null ? loadCircleWishlistState(localStorage, eventSlug) : null,
    save: (s) => { if (eventSlug) saveCircleWishlistState(localStorage, eventSlug, s); },
    clearAll: () => clearAllWishlist(localStorage),
    clearOnSignIn: true,
    fetchRemote: () => fetchCircleWishlist(eventSlug!).then(circlesToSync),
    saveRemote: (v, at) => saveCircleWishlist(eventSlug!, v, at).then(circlesToSync),
    normalize: validCircleIds ? (m) => Object.fromEntries(Object.entries(m).filter(([id]) => validCircleIds.includes(id))) : undefined,
    resyncKey: validCircleIds,
    onSync,
    onSyncError,
  });
  const update = (id: string, patch: (prev: CircleWishlistEntry | undefined) => CircleWishlistEntry | undefined, debounceMs?: number) =>
    set((prev) => {
      const next = { ...prev };
      const e = patch(prev[id]);
      if (e) next[id] = e;
      else delete next[id];
      return next;
    }, { debounceMs });
  const toggleStar = (id: string) => update(id, (prev) => entry(!prev?.star, prev?.memo));
  const updateMemo = (id: string, memo: string) => update(id, (prev) => entry(prev?.star, memo.trim() ? memo.slice(0, 500) : undefined), 500);
  return { circles, toggleStar, updateMemo };
}
