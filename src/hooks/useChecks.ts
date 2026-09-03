import { useEffect, useRef, useState } from "react";
import {
  type Checks,
  type ChecksState,
  compareChecksTimestamps,
  clearAllChecks,
  loadChecksState,
  nextChecksTimestamp,
  saveChecksState,
} from "../lib/checks";
import { fetchChecks, saveChecks as saveRemoteChecks, type ChecksResponse } from "../api";

function checksEqual(a: Checks, b: Checks): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((key) => a[key] === b[key]);
}

function responseState(response: ChecksResponse): ChecksState {
  return { checks: response.checks, updatedAt: response.updatedAt ?? null };
}

/**
 * 행사별 방문 체크 상태.
 *
 * localStorage의 체크는 항상 먼저 화면에 반영한다. 로그인 상태에서는 서버가
 * 발급한 UTC 밀리초 시각을 논리 시계로 사용해 원격과 충돌을 해결하고, 저장
 * 요청은 직렬화해 빠른 연속 토글도 순서대로 서버에 반영한다.
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
  const [checks, setChecks] = useState<Checks>({});
  const checksRef = useRef(checks);
  const callbacks = useRef({ onSync, onSyncError });
  const generation = useRef(0);
  const revision = useRef(0);
  const clock = useRef<string | null>(null);
  const remoteReady = useRef(false);
  const saveQueue = useRef(Promise.resolve());
  const activeIdentity = useRef<string | null>(userId);
  const lastAuthenticatedUser = useRef<string | null>(null);
  checksRef.current = checks;
  activeIdentity.current = userId;
  useEffect(() => { callbacks.current = { onSync, onSyncError }; });

  useEffect(() => {
    const currentGeneration = ++generation.current;
    const currentUserId = userId;
    revision.current = 0;
    clock.current = null;
    remoteReady.current = false;

    if (authLoading || !eventSlug) {
      if (!eventSlug) {
        checksRef.current = {};
        setChecks({});
      }
      return;
    }

    if (authenticated && currentUserId && lastAuthenticatedUser.current && lastAuthenticatedUser.current !== currentUserId) {
      clearAllChecks(localStorage);
    }
    if (authenticated && currentUserId) lastAuthenticatedUser.current = currentUserId;

    const localState = loadChecksState(localStorage, eventSlug, migrateLegacy);
    clock.current = localState.updatedAt;
    checksRef.current = localState.checks;
    setChecks(localState.checks);

    if (!authenticated) {
      remoteReady.current = true;
      return;
    }

    const isCurrent = () => generation.current === currentGeneration
      && authenticated
      && activeIdentity.current === currentUserId;
    const enqueueSave = (state: ChecksState, capturedRevision: number, mergedCount: number) => {
      const queued = saveQueue.current.then(async () => {
        if (!isCurrent()) return;
        const requestAt = clock.current ? nextChecksTimestamp(clock.current, false) : null;
        const response = await saveRemoteChecks(eventSlug, state.checks, requestAt);
        const saved = responseState(response);
        if (!isCurrent()) return;
        // Even a superseded request advances the logical clock. The next queued
        // edit must be newer than the server response it follows.
        clock.current = saved.updatedAt;
        if (revision.current !== capturedRevision) return;
        saveChecksState(localStorage, eventSlug, saved);
        checksRef.current = saved.checks;
        setChecks(saved.checks);
        if (response.saved !== false) callbacks.current.onSync?.(mergedCount);
      }).catch(() => {
        if (isCurrent() && revision.current === capturedRevision) callbacks.current.onSyncError?.();
      });
      saveQueue.current = queued.catch(() => undefined);
    };

    const sync = async () => {
      if (!isCurrent()) return;
      remoteReady.current = false;
      try {
        const remote = await fetchChecks(eventSlug);
        if (!isCurrent()) return;

        // Read again because the user may have toggled while the GET was pending.
        const latestLocal = loadChecksState(localStorage, eventSlug, migrateLegacy);
        const hasLocalSnapshot = localStorage.getItem(`gbc-seoko-checks:${eventSlug}`) !== null;
        const remoteState = responseState(remote);
        let desired = remoteState;
        let shouldUpload = false;
        let mergedCount = 0;

        if (hasLocalSnapshot && latestLocal.updatedAt === null && !checksEqual(latestLocal.checks, remoteState.checks)) {
          // Migrate the pre-timestamp format as a logical edit after the server snapshot.
          desired = { checks: { ...remoteState.checks, ...latestLocal.checks }, updatedAt: null };
          shouldUpload = true;
          mergedCount = Object.keys(latestLocal.checks).filter((id) => latestLocal.checks[id] && !remoteState.checks[id]).length;
        } else {
          const order = compareChecksTimestamps(latestLocal.updatedAt, remoteState.updatedAt);
          if (order > 0) {
            desired = latestLocal;
            shouldUpload = !checksEqual(latestLocal.checks, remoteState.checks) || latestLocal.updatedAt !== remoteState.updatedAt;
          } else if (order < 0 || (order === 0 && !checksEqual(latestLocal.checks, remoteState.checks))) {
            desired = remoteState;
          }
        }

        clock.current = desired.updatedAt ?? remoteState.updatedAt;
        saveChecksState(localStorage, eventSlug, desired);
        checksRef.current = desired.checks;
        setChecks(desired.checks);
        remoteReady.current = true;
        if (shouldUpload) enqueueSave(desired, revision.current, mergedCount);
      } catch {
        if (!isCurrent()) return;
        // Keep the local snapshot and retry when connectivity is restored.
        remoteReady.current = false;
        const fallback = loadChecksState(localStorage, eventSlug, migrateLegacy).checks;
        checksRef.current = fallback;
        setChecks(fallback);
        callbacks.current.onSyncError?.();
      }
    };

    void sync();
    window.addEventListener("online", sync);
    return () => {
      window.removeEventListener("online", sync);
    };
  }, [eventSlug, migrateLegacy, authenticated, authLoading, userId]);

  const toggle = (id: string) => {
    if (!eventSlug) return;
    const next = { ...checksRef.current, [id]: !checksRef.current[id] };
    checksRef.current = next;
    setChecks(next);

    revision.current += 1;
    const capturedRevision = revision.current;
    const capturedGeneration = generation.current;
    const capturedUserId = userId;
    // Pending authenticated edits have no committed timestamp yet; the queue
    // reserves one when it dispatches so rapid toggles cannot share a version.
    const updatedAt = authenticated ? null : nextChecksTimestamp(clock.current);
    const state = { checks: next, updatedAt };
    saveChecksState(localStorage, eventSlug, state);
    clock.current = updatedAt ?? clock.current;

    if (authenticated && remoteReady.current) {
      const queued = saveQueue.current.then(async () => {
        if (generation.current !== capturedGeneration || activeIdentity.current !== capturedUserId || !authenticated) return;
        const requestAt = clock.current ? nextChecksTimestamp(clock.current, false) : null;
        const response = await saveRemoteChecks(eventSlug, state.checks, requestAt);
        const saved = responseState(response);
        if (generation.current !== capturedGeneration || activeIdentity.current !== capturedUserId) return;
        clock.current = saved.updatedAt;
        if (revision.current !== capturedRevision) return;
        const returned = response.saved === false
          ? saved
          : { checks: { ...state.checks, ...saved.checks }, updatedAt: saved.updatedAt };
        saveChecksState(localStorage, eventSlug, returned);
        checksRef.current = returned.checks;
        setChecks(returned.checks);
        if (response.saved !== false) callbacks.current.onSync?.(0);
      }).catch(() => {
        if (generation.current === capturedGeneration && activeIdentity.current === capturedUserId && revision.current === capturedRevision) {
          callbacks.current.onSyncError?.();
        }
      });
      saveQueue.current = queued.catch(() => undefined);
    }
  };

  return [checks, toggle];
}
