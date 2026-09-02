export type Checks = Record<string, boolean>;

export type ChecksState = {
  checks: Checks;
  updatedAt: string | null;
};

/** localStorage 최소 인터페이스 (테스트에서 가짜 객체 주입 가능). */
export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

// API 전환 이전의 단일 키. 최초 활성 행사로 1회 이관 후 이후 행사는 독립적으로 시작한다.
const LEGACY_KEY = "gbc-seoko-2026-07-checks";
const MIGRATED_FLAG = "gbc-seoko-checks-migrated";

export const checksKey = (eventSlug: string) => `gbc-seoko-checks:${eventSlug}`;
export const checksMetaKey = (eventSlug: string) => `gbc-seoko-checks-meta:${eventSlug}`;

export function clearAllChecks(kv: KV): void {
  const storage = kv as KV & { length?: number; key?: (index: number) => string | null; removeItem?: (key: string) => void };
  if (typeof storage.length !== "number" || !storage.key) return;
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key!(index)).filter((key): key is string => Boolean(key));
  for (const key of keys) {
    if (!key.startsWith("gbc-seoko-checks:") && !key.startsWith("gbc-seoko-checks-meta:")) continue;
    if (storage.removeItem) storage.removeItem(key);
    else storage.setItem(key, "{}");
  }
}

function parse(raw: string | null): Checks {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const entries = Object.entries(v);
    return entries.every(([key, value]) => key.length <= 200 && typeof value === "boolean")
      ? Object.fromEntries(entries) as Checks
      : {};
  } catch {
    return {};
  }
}

export function isChecksTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  return !Number.isNaN(Date.parse(value));
}

export function compareChecksTimestamps(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  return a < b ? -1 : 1;
}

/** 서버가 준 시각을 기준으로 다음 논리 시각을 만든다. 인증 상태에서는 이 값을 사용해 클라이언트 시계에 의존하지 않는다. */
export function nextChecksTimestamp(base: string | null, useWallClock = true): string {
  const baseTime = base && isChecksTimestamp(base) ? Date.parse(base) : 0;
  return new Date(Math.max(useWallClock ? Date.now() : 0, baseTime + 1)).toISOString();
}

function parseState(raw: string | null): ChecksState {
  if (!raw) return { checks: {}, updatedAt: null };
  try {
    const value = JSON.parse(raw) as unknown;
    if (value && typeof value === "object" && !Array.isArray(value) && "checks" in value) {
      const state = value as { checks?: unknown; updatedAt?: unknown };
      if (typeof state.checks === "object" && state.checks !== null && !Array.isArray(state.checks)) {
        const checks = parse(JSON.stringify(state.checks));
        return { checks, updatedAt: isChecksTimestamp(state.updatedAt) ? state.updatedAt : null };
      }
    }
  } catch {
    // Fall through to the pre-sync checks format.
  }
  return { checks: parse(raw), updatedAt: null };
}

export function saveChecksState(kv: KV, eventSlug: string, state: ChecksState): void {
  try {
    // Keep the original checks key backward-compatible. The metadata key is the
    // authoritative single write for the timestamped pair; the old key is a mirror
    // for older clients that still read only checksKey().
    kv.setItem(checksMetaKey(eventSlug), JSON.stringify({ checks: state.checks, updatedAt: state.updatedAt }));
    kv.setItem(checksKey(eventSlug), JSON.stringify(state.checks));
  } catch {
    /* private mode / quota */
  }
}

export function loadChecksState(kv: KV, eventSlug: string, migrateLegacy = false): ChecksState {
  const metadataRaw = kv.getItem(checksMetaKey(eventSlug));
  if (metadataRaw !== null) {
    try {
      const metadata = JSON.parse(metadataRaw) as { checks?: unknown };
      if (metadata && typeof metadata === "object" && typeof metadata.checks === "object" && metadata.checks !== null) {
        return parseState(metadataRaw);
      }
    } catch {
      // Fall through to the checks key for old or corrupt metadata.
    }
  }
  const existing = kv.getItem(checksKey(eventSlug));
  if (existing !== null) {
    try {
      const value = JSON.parse(existing) as { checks?: unknown };
      if (value && typeof value === "object" && !Array.isArray(value) && typeof value.checks === "object" && value.checks !== null) {
        return parseState(existing);
      }
    } catch {
      // Fall through to the old checks format.
    }
    let updatedAt: string | null = null;
    try {
      const metadata = JSON.parse(kv.getItem(checksMetaKey(eventSlug)) || "null") as { updatedAt?: unknown } | null;
      updatedAt = isChecksTimestamp(metadata?.updatedAt) ? metadata.updatedAt : null;
    } catch {
      // Treat malformed metadata as an old, untimestamped local snapshot.
    }
    return { checks: parse(existing), updatedAt };
  }

  if (migrateLegacy && kv.getItem(MIGRATED_FLAG) === null) {
    const legacy = kv.getItem(LEGACY_KEY);
    try {
      kv.setItem(MIGRATED_FLAG, "1");
    } catch {
      // private mode / quota; the legacy data can still be read for this load
    }
    if (legacy !== null) {
      const migrated = { checks: parse(legacy), updatedAt: null };
      saveChecksState(kv, eventSlug, migrated);
      return migrated;
    }
  }
  return { checks: {}, updatedAt: null };
}

export function saveChecks(kv: KV, eventSlug: string, checks: Checks): void {
  saveChecksState(kv, eventSlug, { checks, updatedAt: null });
}

/**
 * 행사별 방문 체크를 불러온다. 새 키가 없고 아직 이관 전이면 레거시 단일 키를
 * 이 행사로 1회 이관한다(호환 정책). 이후 행사는 빈 상태로 시작한다.
 */
export function loadChecks(kv: KV, eventSlug: string, migrateLegacy = false): Checks {
  return loadChecksState(kv, eventSlug, migrateLegacy).checks;
}
