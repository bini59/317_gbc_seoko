import { useEffect, useRef, useState } from "react";
import { type Checks, loadChecks, saveChecks } from "../lib/checks";
import { fetchChecks, saveChecks as saveRemoteChecks } from "../api";

/**
 * 행사별 방문 체크 상태. 비로그인은 localStorage를 사용하고, 로그인 사용자는
 * 321_auth 세션으로 확인한 계정별 원격 저장소를 사용한다.
 * `onSync(mergedCount)`는 원격 저장이 성공할 때마다 불린다 — 첫 병합은 로컬에서 올라간 체크 개수, 이후 저장은 0.
 * 저장 실패는 `onSyncError`로 알린다(상태는 되돌리지 않는다).
 */
export function useChecks(
  eventSlug: string | null,
  migrateLegacy = false,
  authenticated = false,
  authLoading = false,
  onSync?: (mergedCount: number) => void,
  onSyncError?: () => void,
): [Checks, (id: string) => void, () => void] {
  const [checks, setChecks] = useState<Checks>({});
  const cb = useRef({ onSync, onSyncError });
  useEffect(() => { cb.current = { onSync, onSyncError }; });

  useEffect(() => {
    if (authLoading || !eventSlug) {
      if (!eventSlug) setChecks({});
      return;
    }
    if (!authenticated) {
      setChecks(loadChecks(localStorage, eventSlug, migrateLegacy));
      return;
    }
    const local = loadChecks(localStorage, eventSlug, migrateLegacy);
    void fetchChecks(eventSlug).then(({ checks: remote }) => {
      const merged = { ...local, ...remote };
      setChecks(merged);
      // 원격과 다른 항목이 있을 때만 올린다 — 단순 로드는 저장도 안내도 없다
      if (!Object.keys(merged).some((id) => merged[id] !== remote[id])) return;
      const fromLocal = Object.keys(local).filter((id) => local[id] && !remote[id]).length;
      void saveRemoteChecks(eventSlug, merged).then(() => cb.current.onSync?.(fromLocal), () => cb.current.onSyncError?.());
    }).catch(() => setChecks(local));
  }, [eventSlug, migrateLegacy, authenticated, authLoading]);

  const persist = (next: Checks) => {
    if (!eventSlug) return;
    if (authenticated) void saveRemoteChecks(eventSlug, next).then(() => cb.current.onSync?.(0), () => cb.current.onSyncError?.());
    else saveChecks(localStorage, eventSlug, next);
  };

  const toggle = (id: string) =>
    setChecks((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      persist(next);
      return next;
    });

  const reset = () => {
    persist({});
    setChecks({});
  };

  return [checks, toggle, reset];
}
