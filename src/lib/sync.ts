/** 로컬·서버가 공유하는 타임스탬프 기반 동기화 상태. */
export type SyncState<T> = { value: T; updatedAt: string | null };

export function compareTimestamps(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  return a < b ? -1 : 1;
}

/** base 다음 논리 시각. wallClock=false면 서버가 준 시각만 기준으로 삼아 클라이언트 시계에 의존하지 않는다. */
export function nextTimestamp(base: string | null, wallClock = true): string {
  const time = base ? Date.parse(base) : 0;
  return new Date(Math.max(wallClock ? Date.now() : 0, Number.isNaN(time) ? 0 : time + 1)).toISOString();
}
