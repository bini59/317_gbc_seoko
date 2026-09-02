import { useEffect, useRef, useState } from "react";
import { type Checks, loadChecks, saveChecks } from "../lib/checks";
import { fetchChecks, saveChecks as saveRemoteChecks } from "../api";

/**
 * 행사별 방문 체크 상태. 비로그인은 localStorage를 사용하고, 로그인 사용자는
 * 321_auth 세션으로 확인한 계정별 원격 저장소를 사용한다.
 * `onSync(mergedCount)`는 원격 저장이 끝날 때마다 불린다 — 첫 병합은 체크 개수, 이후 저장은 0.
 */
export function useChecks(
  eventSlug: string | null,
  migrateLegacy = false,
  authenticated = false,
  authLoading = false,
  onSync?: (mergedCount: number) => void,
): [Checks, (id: string) => void, () => void] {
  const [checks, setChecks] = useState<Checks>({});
  const onSyncRef = useRef(onSync);
  useEffect(() => { onSyncRef.current = onSync; });

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
    void fetchChecks(eventSlug).then(async ({ checks: remote }) => {
      const merged = { ...local, ...remote };
      setChecks(merged);
      if (Object.keys(merged).some((id) => merged[id] !== remote[id])) await saveRemoteChecks(eventSlug, merged);
      onSyncRef.current?.(Object.values(merged).filter(Boolean).length);
    }).catch(() => setChecks(local));
  }, [eventSlug, migrateLegacy, authenticated, authLoading]);

  const persist = (next: Checks) => {
    if (!eventSlug) return;
    if (authenticated) void saveRemoteChecks(eventSlug, next).then(() => onSyncRef.current?.(0)).catch(() => {});
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
