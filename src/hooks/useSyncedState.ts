import { useEffect, useRef, useState } from "react";
import { compareTimestamps, nextTimestamp, type SyncState } from "@/lib/sync";

export type SyncResponse<T> = { value: T; updatedAt: string | null; saved?: boolean };

export type SyncedStateOptions<T> = {
  /** 동기화 단위(행사 slug 등). null이면 비활성. 바뀌면 큐·시계를 리셋하고 다시 동기화한다. */
  scope: string | null;
  /** false면 아직 아무것도 하지 않는다(auth 판별 대기). */
  ready?: boolean;
  authenticated: boolean;
  userId: string | null;
  empty: T;
  /** 저장된 스냅샷이 없으면 null. 첫 동기화 전 편집(타임스탬프 없음)을 구분하는 데 쓴다. */
  load: () => SyncState<T> | null;
  save: (state: SyncState<T>) => void;
  /** 계정이 바뀌면 로컬을 전부 비운다. */
  clearAll: () => void;
  /** 로그아웃 → 로그인 시에도 로컬을 버릴지. 찜목록은 버리고, 방문 체크는 서버와 병합한다. */
  clearOnSignIn?: boolean;
  fetchRemote: () => Promise<SyncResponse<T>>;
  saveRemote: (value: T, updatedAt: string | null) => Promise<SyncResponse<T>>;
  /** 서버에서 삭제된 항목 제거 등. 로컬·원격 양쪽에 적용되고, 원격이 달라지면 정리본을 올린다. */
  normalize?: (value: T) => T;
  /** normalize 재료가 바뀌면 다시 동기화한다. */
  resyncKey?: unknown;
  /** 타임스탬프 없는 로컬 편집(첫 동기화 전, 구 포맷)을 원격과 합친다. 기본은 로컬 우선. */
  mergeUntimed?: (local: T, remote: T) => { value: T; merged: number };
  onSync?: (merged: number) => void;
  onSyncError?: () => void;
};

type Setter<T> = (next: T | ((prev: T) => T), opts?: { debounceMs?: number }) => void;

/** 키 순서에 무관한 구조 비교. */
const stable = (v: unknown): string =>
  JSON.stringify(v, (_, x) => x && typeof x === "object" && !Array.isArray(x)
    ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, (x as Record<string, unknown>)[k]]))
    : x);
const equal = (a: unknown, b: unknown) => stable(a) === stable(b);

/**
 * 로컬 우선 + 서버 동기화 상태.
 *
 * 편집은 즉시 로컬(상태·localStorage)에 반영하고, 로그인 상태면 서버 저장을 한 줄로 세워
 * 순서대로 보낸다. 응답이 도착했을 때 그 사이 더 새 편집이 있었으면(revision) 화면을 덮어쓰지
 * 않고, scope·계정이 바뀌었으면(generation) 버린다. 시계(clock)는 버려지는 응답에서도 전진해
 * 다음 요청이 서버에서 stale로 거절되지 않게 한다.
 */
export function useSyncedState<T>(o: SyncedStateOptions<T>): [T, Setter<T>] {
  const { scope, ready = true, authenticated, userId, resyncKey } = o;
  const [value, setValue] = useState<T>(o.empty);
  const valueRef = useRef(value);
  const opts = useRef(o);
  opts.current = o;
  const active = useRef({ scope, authenticated, userId });
  active.current = { scope, authenticated, userId };
  const generation = useRef(0);
  const revision = useRef(0);
  const clock = useRef<string | null>(null);
  const remoteReady = useRef(false);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const lastUser = useRef<string | null>(null);
  const wasAuthenticated = useRef(authenticated);
  const pending = useRef<{ value: T; revision: number; generation: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const apply = (next: T) => { valueRef.current = next; setValue(next); };
  const normalize = (v: T) => opts.current.normalize?.(v) ?? v;

  const enqueue = (val: T, capturedRevision: number, merged: number) => {
    const g = generation.current;
    const user = active.current.userId;
    const isCurrent = () => generation.current === g && active.current.authenticated && active.current.userId === user;
    queue.current = queue.current.then(async () => {
      if (!isCurrent()) return;
      // 편집 시각은 큐가 보낼 때 서버 시계 기준으로 예약한다 — 연타해도 버전이 겹치지 않는다.
      const requestAt = clock.current ? nextTimestamp(clock.current, false) : null;
      const res = await opts.current.saveRemote(val, requestAt);
      if (!isCurrent()) return;
      clock.current = res.updatedAt; // 밀려난 요청도 시계는 전진시킨다
      if (revision.current !== capturedRevision) return;
      const state = { value: normalize(res.value), updatedAt: res.updatedAt };
      opts.current.save(state);
      apply(state.value);
      if (res.saved !== false) opts.current.onSync?.(merged);
    }).catch(() => {
      if (isCurrent() && revision.current === capturedRevision) opts.current.onSyncError?.();
    });
  };

  const flush = () => {
    clearTimeout(timer.current);
    timer.current = undefined;
    const p = pending.current;
    pending.current = null;
    if (p && p.generation === generation.current) enqueue(p.value, p.revision, 0);
  };

  const set: Setter<T> = (next, { debounceMs } = {}) => {
    const { scope, authenticated } = active.current;
    if (scope === null) return;
    if (!debounceMs) flush(); // 미뤄둔 저장이 있으면 순서 유지를 위해 먼저 보낸다
    const val = typeof next === "function" ? (next as (prev: T) => T)(valueRef.current) : next;
    apply(val);
    const rev = ++revision.current;
    // 로그인 상태의 편집은 아직 확정 시각이 없다(null). 비로그인은 로컬 시계로 찍는다.
    const updatedAt = authenticated ? null : nextTimestamp(clock.current);
    if (updatedAt) clock.current = updatedAt;
    opts.current.save({ value: val, updatedAt });
    if (!authenticated || !remoteReady.current) return; // 첫 동기화가 끝나면 sync가 로컬 편집을 올린다
    if (debounceMs) {
      clearTimeout(timer.current);
      pending.current = { value: val, revision: rev, generation: generation.current };
      timer.current = setTimeout(flush, debounceMs);
    } else {
      enqueue(val, rev, 0);
    }
  };

  useEffect(() => {
    const g = ++generation.current;
    revision.current = 0;
    clock.current = null;
    remoteReady.current = false;
    queue.current = Promise.resolve();
    pending.current = null;
    clearTimeout(timer.current);
    const o = opts.current;

    if (scope === null) { apply(o.empty); return; }
    if (!ready) return;

    const signedIn = authenticated && userId && !wasAuthenticated.current;
    const switched = authenticated && userId && lastUser.current && lastUser.current !== userId;
    if (switched || (signedIn && o.clearOnSignIn)) o.clearAll();
    wasAuthenticated.current = authenticated;
    if (authenticated && userId) lastUser.current = userId;

    const snapshot = o.load();
    if (snapshot) {
      const v = normalize(snapshot.value);
      if (!equal(v, snapshot.value)) o.save({ value: v, updatedAt: snapshot.updatedAt });
      clock.current = snapshot.updatedAt;
      apply(v);
    } else {
      apply(o.empty);
    }
    if (!authenticated) return;

    const isCurrent = () => generation.current === g && active.current.authenticated && active.current.userId === userId;
    const sync = async () => {
      if (!isCurrent()) return;
      remoteReady.current = false;
      try {
        const remote = await opts.current.fetchRemote();
        if (!isCurrent()) return;
        const o = opts.current;
        const local = o.load(); // GET 중 편집이 있었을 수 있어 다시 읽는다
        const remoteValue = normalize(remote.value);
        let desired: SyncState<T> = { value: remoteValue, updatedAt: remote.updatedAt };
        let upload = !equal(remoteValue, remote.value); // 서버에 삭제된 항목이 섞여 있으면 정리본을 올린다
        let merged = 0;
        if (local) {
          const localValue = normalize(local.value);
          if (local.updatedAt === null && !equal(localValue, remoteValue)) {
            const m = o.mergeUntimed ? o.mergeUntimed(localValue, remoteValue) : { value: localValue, merged: 0 };
            desired = { value: m.value, updatedAt: null };
            upload = true;
            merged = m.merged;
          } else if (compareTimestamps(local.updatedAt, remote.updatedAt) > 0) {
            desired = { value: localValue, updatedAt: local.updatedAt };
            upload = true;
          }
        }
        clock.current = desired.updatedAt ?? remote.updatedAt;
        o.save(desired);
        apply(desired.value);
        remoteReady.current = true;
        if (upload) enqueue(desired.value, revision.current, merged);
      } catch {
        if (!isCurrent()) return;
        // 오프라인: 로컬을 유지하고 online 이벤트에서 재시도한다.
        const fallback = opts.current.load();
        apply(fallback ? normalize(fallback.value) : opts.current.empty);
        opts.current.onSyncError?.();
      }
    };

    void sync();
    window.addEventListener("online", sync);
    return () => {
      window.removeEventListener("online", sync);
      flush();
    };
  }, [scope, ready, authenticated, userId, resyncKey]);

  return [value, set];
}
