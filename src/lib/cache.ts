export const CACHE_SCHEMA_VERSION = 1;

export interface CacheStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type CacheEntry<T> = {
  schemaVersion: number;
  hash: string;
  data: T;
  cachedAt: number;
};

export const cacheKeys = {
  events: "gbc-seoko-cache:v1:events",
  circles: (eventSlug: string) => `gbc-seoko-cache:v1:circles:${eventSlug}`,
};

function isHash(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{32}$/i.test(value);
}

export function loadCache<T>(
  storage: CacheStorage,
  key: string,
  isData: (value: unknown) => value is T,
): CacheEntry<T> | null {
  try {
    const raw = storage.getItem(key);
    if (raw === null) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const entry = value as Record<string, unknown>;
    if (
      entry.schemaVersion !== CACHE_SCHEMA_VERSION
      || !isHash(entry.hash)
      || typeof entry.cachedAt !== "number"
      || !Number.isFinite(entry.cachedAt)
      || !isData(entry.data)
    ) return null;
    return entry as CacheEntry<T>;
  } catch {
    return null;
  }
}

export function saveCache<T>(storage: CacheStorage, key: string, hash: string, data: T): void {
  if (!isHash(hash)) return;
  try {
    storage.setItem(key, JSON.stringify({
      schemaVersion: CACHE_SCHEMA_VERSION,
      hash: hash.toLowerCase(),
      data,
      cachedAt: Date.now(),
    } satisfies CacheEntry<T>));
  } catch {
    // localStorage may be unavailable in private mode or over quota.
  }
}
