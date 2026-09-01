import { useEffect, useState } from "react";
import { type Checks, loadChecks, saveChecks } from "../lib/checks";
import { fetchChecks, saveChecks as saveRemoteChecks } from "../api";

/**
 * 행사별 방문 체크 상태. 비로그인은 localStorage를 사용하고, 로그인 사용자는
 * 321_auth 세션으로 확인한 계정별 원격 저장소를 사용한다.
 */
export function useChecks(
  eventSlug: string | null,
  migrateLegacy = false,
  authenticated = false,
  authLoading = false,
): [Checks, (id: string) => void, () => void] {
  const [checks, setChecks] = useState<Checks>({});

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
      if (Object.keys(merged).some((id) => merged[id] !== remote[id])) void saveRemoteChecks(eventSlug, merged);
    }).catch(() => setChecks(local));
  }, [eventSlug, migrateLegacy, authenticated, authLoading]);

  const toggle = (id: string) =>
    setChecks((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (eventSlug) {
        if (authenticated) void saveRemoteChecks(eventSlug, next);
        else saveChecks(localStorage, eventSlug, next);
      }
      return next;
    });

  const reset = () => {
    if (eventSlug) {
      if (authenticated) void saveRemoteChecks(eventSlug, {});
      else saveChecks(localStorage, eventSlug, {});
    }
    setChecks({});
  };

  return [checks, toggle, reset];
}
