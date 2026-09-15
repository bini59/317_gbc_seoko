import { type Checks, checksKey, clearAllChecks, loadChecksState, saveChecksState } from "@/lib/checks";
import { fetchChecks, saveChecks as saveRemoteChecks, type ChecksResponse } from "@/api";
import { useSyncedState } from "@/hooks/useSyncedState";

const EMPTY: Checks = {};
const toSync = (r: ChecksResponse) => ({ value: r.checks, updatedAt: r.updatedAt ?? null, saved: r.saved });

/**
 * 행사별 방문 체크 상태. 로컬을 먼저 반영하고 로그인 상태면 서버와 동기화한다.
 * 첫 동기화에서 타임스탬프 없는 로컬 체크(구 포맷·비로그인 시절)는 서버와 병합해 올린다.
 */
export function useChecks(
  eventSlug: string | null,
  migrateLegacy = false,
  authenticated = false,
  authLoading = false,
  onSync?: (mergedCount: number) => void,
  onSyncError?: () => void,
  userId: string | null = null,
): [Checks, (id: string) => void] {
  const [checks, set] = useSyncedState<Checks>({
    scope: eventSlug,
    ready: !authLoading,
    authenticated,
    userId,
    empty: EMPTY,
    load: () => {
      if (!eventSlug) return null;
      const state = loadChecksState(localStorage, eventSlug, migrateLegacy);
      return localStorage.getItem(checksKey(eventSlug)) === null ? null : { value: state.checks, updatedAt: state.updatedAt };
    },
    save: (s) => { if (eventSlug) saveChecksState(localStorage, eventSlug, { checks: s.value, updatedAt: s.updatedAt }); },
    clearAll: () => clearAllChecks(localStorage),
    fetchRemote: () => fetchChecks(eventSlug!).then(toSync),
    saveRemote: (v, at) => saveRemoteChecks(eventSlug!, v, at).then(toSync),
    mergeUntimed: (local, remote) => ({
      value: { ...remote, ...local },
      merged: Object.keys(local).filter((id) => local[id] && !remote[id]).length, // 로컬에서 올라간 항목만 센다
    }),
    onSync,
    onSyncError,
  });
  return [checks, (id) => set((prev) => ({ ...prev, [id]: !prev[id] }))];
}
