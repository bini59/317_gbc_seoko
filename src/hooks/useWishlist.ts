import { useEffect, useRef, useState } from "react";
import { fetchCircleWishlist, fetchEventWishlist, saveCircleWishlist, saveEventWishlist } from "../api";
import type { CircleWishlistMap } from "../types";
import { compareTimestamps, loadCircleWishlistState, loadEventWishlistState, nextWishlistTimestamp, saveCircleWishlistState, saveEventWishlistState, clearAllWishlist } from "../lib/wishlist";

export function useEventWishlist(authenticated: boolean, userId: string | null, onSync?: () => void, onSyncError?: () => void, validEventSlugs: readonly string[] | null = null) {
  const [events, setEvents] = useState<string[]>([]);
  const valueRef = useRef(events);
  const clock = useRef<string | null>(null);
  const queue = useRef(Promise.resolve());
  const generation = useRef(0);
  const revision = useRef(0);
  const lastAuthenticatedUser = useRef<string | null>(null);
  const wasAuthenticated = useRef(authenticated);
  const activeIdentity = useRef<string | null>(userId);
  const activeAuthenticated = useRef(authenticated);
  const callbacks = useRef({ onSync, onSyncError });
  useEffect(() => { callbacks.current = { onSync, onSyncError }; });
  activeIdentity.current = userId;
  activeAuthenticated.current = authenticated;
  valueRef.current = events;

  useEffect(() => {
    const currentGeneration = ++generation.current;
    const currentUserId = userId;
    revision.current = 0;
    queue.current = Promise.resolve();

    const signedInAfterSignedOut = authenticated && currentUserId && !wasAuthenticated.current;
    if (signedInAfterSignedOut || (authenticated && currentUserId && lastAuthenticatedUser.current && lastAuthenticatedUser.current !== currentUserId)) {
      clearAllWishlist(localStorage);
    }
    wasAuthenticated.current = authenticated;
    if (authenticated && currentUserId) lastAuthenticatedUser.current = currentUserId;
    if (!authenticated) lastAuthenticatedUser.current = null;

    const local = loadEventWishlistState(localStorage);
    const value = validEventSlugs
      ? local.value.filter((slug) => validEventSlugs.includes(slug))
      : local.value;
    const localWasPruned = value.length !== local.value.length;
    valueRef.current = value;
    clock.current = local.updatedAt;
    setEvents(value);
    if (value.length !== local.value.length) saveEventWishlistState(localStorage, { value, updatedAt: local.updatedAt });
    if (!authenticated) return;

    const isCurrent = () => generation.current === currentGeneration && authenticated && activeAuthenticated.current && activeIdentity.current === currentUserId;
    const enqueue = (value: string[], requestedAt: string | null, capturedRevision: number) => {
      queue.current = queue.current.then(async () => {
        if (!isCurrent()) return;
        const response = await saveEventWishlist(value, requestedAt);
        if (!isCurrent()) return;
        clock.current = response.updatedAt;
        if (revision.current !== capturedRevision) return;
        const next = response.saved === false ? response.events : value;
        valueRef.current = next;
        saveEventWishlistState(localStorage, { value: next, updatedAt: response.updatedAt });
        setEvents(next);
        if (response.saved !== false) callbacks.current.onSync?.();
      }).catch(() => { if (isCurrent() && revision.current === capturedRevision) callbacks.current.onSyncError?.(); });
    };

    const sync = async () => {
      try {
        const remote = await fetchEventWishlist();
        if (!isCurrent()) return;
        const current = loadEventWishlistState(localStorage);
        const remoteEvents = validEventSlugs
          ? remote.events.filter((slug) => validEventSlugs.includes(slug))
          : remote.events;
        const remoteHadDeletedEvents = remoteEvents.length !== remote.events.length;
        const localNewer = compareTimestamps(current.updatedAt, remote.updatedAt) > 0;
        const value = localNewer ? current.value : remoteEvents;
        const updatedAt = localNewer ? current.updatedAt : remote.updatedAt;
        if (revision.current !== 0) return;
        valueRef.current = value;
        clock.current = updatedAt;
        saveEventWishlistState(localStorage, { value, updatedAt });
        setEvents(value);
        if (localNewer || remoteHadDeletedEvents || localWasPruned) enqueue(value, nextWishlistTimestamp(updatedAt, false), revision.current);
      } catch { if (isCurrent() && revision.current === 0) callbacks.current.onSyncError?.(); }
    };

    void sync();
    window.addEventListener("online", sync);
    return () => window.removeEventListener("online", sync);
  }, [authenticated, userId, validEventSlugs]);

  const toggle = (slug: string) => {
    const value = valueRef.current.includes(slug) ? valueRef.current.filter((item) => item !== slug) : [...valueRef.current, slug];
    const capturedRevision = ++revision.current;
    const currentGeneration = generation.current;
    const currentUserId = activeIdentity.current;
    valueRef.current = value;
    const updatedAt = nextWishlistTimestamp(clock.current);
    clock.current = updatedAt;
    setEvents(value);
    saveEventWishlistState(localStorage, { value, updatedAt });
    if (authenticated) {
      const isCurrent = () => generation.current === currentGeneration && authenticated && activeAuthenticated.current && activeIdentity.current === currentUserId;
      queue.current = queue.current.then(async () => {
        if (!isCurrent()) return;
        const response = await saveEventWishlist(value, updatedAt);
        if (!isCurrent()) return;
        clock.current = response.updatedAt;
        if (revision.current !== capturedRevision) return;
        const next = response.saved === false ? response.events : value;
        valueRef.current = next;
        saveEventWishlistState(localStorage, { value: next, updatedAt: response.updatedAt });
        setEvents(next);
        if (response.saved !== false) callbacks.current.onSync?.();
      }).catch(() => { if (isCurrent() && revision.current === capturedRevision) callbacks.current.onSyncError?.(); });
    }
  };
  return [events, toggle] as const;
}

export function useCircleWishlist(eventSlug: string | null, authenticated: boolean, userId: string | null, onSync?: () => void, onSyncError?: () => void, validCircleIds: readonly string[] | null = null) {
  const [circles, setCircles] = useState<CircleWishlistMap>({});
  const valueRef = useRef(circles);
  const clock = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const pendingSave = useRef<{ value: CircleWishlistMap; updatedAt: string; revision: number; generation: number; slug: string; userId: string; authenticated: boolean } | null>(null);
  const queue = useRef(Promise.resolve());
  const generation = useRef(0);
  const revision = useRef(0);
  const lastAuthenticatedUser = useRef<string | null>(null);
  const wasAuthenticated = useRef(authenticated);
  const activeIdentity = useRef<string | null>(userId);
  const activeAuthenticated = useRef(authenticated);
  const activeEventSlug = useRef(eventSlug);
  const callbacks = useRef({ onSync, onSyncError });
  useEffect(() => { callbacks.current = { onSync, onSyncError }; });
  activeIdentity.current = userId;
  activeAuthenticated.current = authenticated;
  activeEventSlug.current = eventSlug;
  valueRef.current = circles;

  const flushPending = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = undefined;
    }
    const pending = pendingSave.current;
    if (!pending) return;
    pendingSave.current = null;
    const { value, updatedAt, revision: capturedRevision, generation: capturedGen, slug, userId: capturedUserId, authenticated: capturedAuthenticated } = pending;
    queue.current = queue.current.then(async () => {
      if (generation.current !== capturedGen || !capturedAuthenticated || !capturedUserId || !activeAuthenticated.current || activeIdentity.current !== capturedUserId || activeEventSlug.current !== slug) return;
      const response = await saveCircleWishlist(slug, value, updatedAt);
      if (generation.current !== capturedGen || !capturedAuthenticated || !capturedUserId || !activeAuthenticated.current || activeIdentity.current !== capturedUserId || activeEventSlug.current !== slug) return;
      clock.current = response.updatedAt;
      if (revision.current !== capturedRevision) return;
      const next = response.saved === false ? response.circles : value;
      valueRef.current = next;
      saveCircleWishlistState(localStorage, slug, { value: next, updatedAt: response.updatedAt });
      setCircles(next);
      if (response.saved !== false) callbacks.current.onSync?.();
    }).catch(() => {
      if (generation.current === capturedGen && capturedAuthenticated && activeAuthenticated.current && activeIdentity.current === capturedUserId && activeEventSlug.current === slug && revision.current === capturedRevision) callbacks.current.onSyncError?.();
    });
  };

  useEffect(() => {
    const currentGeneration = ++generation.current;
    const currentUserId = userId;
    revision.current = 0;
    queue.current = Promise.resolve();

    const signedInAfterSignedOut = authenticated && currentUserId && !wasAuthenticated.current;
    if (signedInAfterSignedOut || (authenticated && currentUserId && lastAuthenticatedUser.current && lastAuthenticatedUser.current !== currentUserId)) {
      clearAllWishlist(localStorage);
    }
    wasAuthenticated.current = authenticated;
    if (authenticated && currentUserId) lastAuthenticatedUser.current = currentUserId;
    if (!authenticated) lastAuthenticatedUser.current = null;

    if (!eventSlug) {
      valueRef.current = {};
      clock.current = null;
      setCircles({});
      return;
    }

    const local = loadCircleWishlistState(localStorage, eventSlug);
    const value = validCircleIds ? Object.fromEntries(Object.entries(local.value).filter(([id]) => validCircleIds.includes(id))) : local.value;
    valueRef.current = value;
    clock.current = local.updatedAt;
    setCircles(value);
    if (Object.keys(value).length !== Object.keys(local.value).length) saveCircleWishlistState(localStorage, eventSlug, { value, updatedAt: local.updatedAt });
    if (!authenticated) return;

    const isCurrent = () => generation.current === currentGeneration && eventSlug !== null && authenticated && activeIdentity.current === currentUserId;
    const enqueue = (value: CircleWishlistMap, requestedAt: string | null, capturedRevision: number) => {
      queue.current = queue.current.then(async () => {
        if (!isCurrent()) return;
        const response = await saveCircleWishlist(eventSlug, value, requestedAt);
        if (!isCurrent()) return;
        clock.current = response.updatedAt;
        if (revision.current !== capturedRevision) return;
        const next = response.saved === false ? response.circles : value;
        valueRef.current = next;
        saveCircleWishlistState(localStorage, eventSlug, { value: next, updatedAt: response.updatedAt });
        setCircles(next);
        if (response.saved !== false) callbacks.current.onSync?.();
      }).catch(() => { if (isCurrent() && revision.current === capturedRevision) callbacks.current.onSyncError?.(); });
    };

    const sync = async () => {
      try {
        const remote = await fetchCircleWishlist(eventSlug);
        if (!isCurrent()) return;
        const current = loadCircleWishlistState(localStorage, eventSlug);
        const currentValue = validCircleIds ? Object.fromEntries(Object.entries(current.value).filter(([id]) => validCircleIds.includes(id))) : current.value;
        const remoteValue = validCircleIds ? Object.fromEntries(Object.entries(remote.circles).filter(([id]) => validCircleIds.includes(id))) : remote.circles;
        const localNewer = compareTimestamps(current.updatedAt, remote.updatedAt) > 0;
        const value = localNewer ? currentValue : remoteValue;
        const updatedAt = localNewer ? current.updatedAt : remote.updatedAt;
        if (revision.current !== 0) return;
        valueRef.current = value;
        clock.current = updatedAt;
        saveCircleWishlistState(localStorage, eventSlug, { value, updatedAt });
        setCircles(value);
        if (localNewer) enqueue(value, nextWishlistTimestamp(updatedAt, false), revision.current);
      } catch { if (isCurrent() && revision.current === 0) callbacks.current.onSyncError?.(); }
    };

    void sync();
    window.addEventListener("online", sync);
    return () => {
      window.removeEventListener("online", sync);
      flushPending();
    };
  }, [eventSlug, authenticated, userId, validCircleIds]);

  const toggleStar = (id: string) => {
    if (!eventSlug) return;
    flushPending();
    const prev = valueRef.current[id];
    const star = !prev?.star;
    const memo = prev?.memo;
    const nextEntry = star || memo ? { ...(star ? { star: true } : {}), ...(memo ? { memo } : {}) } : undefined;
    const nextCircles = { ...valueRef.current };
    if (nextEntry) nextCircles[id] = nextEntry;
    else delete nextCircles[id];

    valueRef.current = nextCircles;
    const updatedAt = nextWishlistTimestamp(clock.current);
    clock.current = updatedAt;
    setCircles(nextCircles);
    saveCircleWishlistState(localStorage, eventSlug, { value: nextCircles, updatedAt });

    if (authenticated) {
      const capturedRevision = ++revision.current;
      const currentGeneration = generation.current;
      const currentEventSlug = eventSlug;
      const currentUserId = activeIdentity.current;
      const currentAuthenticated = authenticated;
      const isCurrent = () => generation.current === currentGeneration
        && currentEventSlug !== null
        && currentAuthenticated
        && activeAuthenticated.current
        && activeEventSlug.current === currentEventSlug
        && currentUserId !== null
        && activeIdentity.current === currentUserId;
      queue.current = queue.current.then(async () => {
        if (!isCurrent() || !currentEventSlug) return;
        const response = await saveCircleWishlist(currentEventSlug, nextCircles, updatedAt);
        if (!isCurrent()) return;
        clock.current = response.updatedAt;
        if (revision.current !== capturedRevision) return;
        const next = response.saved === false ? response.circles : nextCircles;
        valueRef.current = next;
        saveCircleWishlistState(localStorage, currentEventSlug, { value: next, updatedAt: response.updatedAt });
        setCircles(next);
        if (response.saved !== false) callbacks.current.onSync?.();
      }).catch(() => { if (isCurrent() && revision.current === capturedRevision) callbacks.current.onSyncError?.(); });
    }
  };

  const updateMemo = (id: string, memo: string) => {
    if (!eventSlug) return;
    const trimmed = memo.trim();
    const prev = valueRef.current[id];
    const star = prev?.star;
    const nextEntry = star || trimmed ? { ...(star ? { star: true } : {}), ...(trimmed ? { memo: memo.slice(0, 500) } : {}) } : undefined;
    const nextCircles = { ...valueRef.current };
    if (nextEntry) nextCircles[id] = nextEntry;
    else delete nextCircles[id];

    valueRef.current = nextCircles;
    const updatedAt = nextWishlistTimestamp(clock.current);
    clock.current = updatedAt;
    setCircles(nextCircles);
    saveCircleWishlistState(localStorage, eventSlug, { value: nextCircles, updatedAt });

    if (authenticated) {
      if (timer.current) clearTimeout(timer.current);
      const capturedRevision = ++revision.current;
      const currentGeneration = generation.current;
      pendingSave.current = { value: nextCircles, updatedAt, revision: capturedRevision, generation: currentGeneration, slug: eventSlug, userId: activeIdentity.current ?? "", authenticated };
      timer.current = setTimeout(() => {
        flushPending();
      }, 500);
    }
  };

  return { circles, toggleStar, updateMemo };
}
