import { describe, expect, it } from "vitest";
import { cacheKeys, loadCache, saveCache, type CacheStorage } from "../../src/lib/cache";

function fakeStorage(seed: Record<string, string> = {}): CacheStorage & { store: Map<string, string> } {
  const store = new Map(Object.entries(seed));
  return {
    store,
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    setItem: (key, value) => void store.set(key, value),
  };
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

describe("versioned API cache", () => {
  it("stores a versioned envelope under the dataset key", () => {
    const storage = fakeStorage();
    saveCache(storage, cacheKeys.events, "a".repeat(32), ["event"]);

    expect(JSON.parse(storage.store.get(cacheKeys.events)!)).toMatchObject({
      schemaVersion: 1,
      hash: "a".repeat(32),
      data: ["event"],
    });
    expect(loadCache(storage, cacheKeys.events, isStringArray)?.data).toEqual(["event"]);
  });

  it("rejects corrupted, mismatched, or malformed cache envelopes", () => {
    const storage = fakeStorage({
      [cacheKeys.events]: JSON.stringify({ schemaVersion: 99, hash: "a".repeat(32), data: [] }),
    });
    expect(loadCache(storage, cacheKeys.events, isStringArray)).toBeNull();

    storage.store.set(cacheKeys.events, "{broken");
    expect(loadCache(storage, cacheKeys.events, isStringArray)).toBeNull();

    storage.store.set(cacheKeys.events, JSON.stringify({
      schemaVersion: 1,
      hash: "a".repeat(32),
      cachedAt: Date.now(),
      data: { not: "an array" },
    }));
    expect(loadCache(storage, cacheKeys.events, isStringArray)).toBeNull();
  });

  it("keeps event datasets in separate keys", () => {
    expect(cacheKeys.circles("event-a")).not.toBe(cacheKeys.circles("event-b"));
    expect(cacheKeys.circles("event-a")).toBe("gbc-seoko-cache:v1:circles:event-a");
  });
});
