import { describe, it, expect } from "vitest";
import { loadChecks, saveChecks, checksKey, type KV } from "../../src/lib/checks";

function fakeKV(seed: Record<string, string> = {}): KV & { store: Map<string, string> } {
  const store = new Map(Object.entries(seed));
  return {
    store,
    getItem: (k) => (store.has(k) ? store.get(k)! : null),
    setItem: (k, v) => void store.set(k, v),
  };
}

describe("per-event checks", () => {
  it("keys visits by event slug so events don't mix", () => {
    const kv = fakeKV();
    saveChecks(kv, "ev-a", { x: true });
    saveChecks(kv, "ev-b", { y: true });
    expect(loadChecks(kv, "ev-a")).toEqual({ x: true });
    expect(loadChecks(kv, "ev-b")).toEqual({ y: true });
    expect(kv.store.has(checksKey("ev-a"))).toBe(true);
  });

  it("migrates the legacy single key into the first loaded event once", () => {
    const kv = fakeKV({ "gbc-seoko-2026-07-checks": JSON.stringify({ cf62: true }) });
    expect(loadChecks(kv, "cw-2026-07", true)).toEqual({ cf62: true });
    // second, different event starts empty (legacy already consumed)
    expect(loadChecks(kv, "other-event")).toEqual({});
  });

  it("does not consume legacy checks when a non-active 행사 is deep-linked first", () => {
    const kv = fakeKV({ "gbc-seoko-2026-07-checks": JSON.stringify({ cf62: true }) });
    expect(loadChecks(kv, "past-event", false)).toEqual({});
    expect(loadChecks(kv, "active-event", true)).toEqual({ cf62: true });
    expect(loadChecks(kv, "future-event", false)).toEqual({});
  });

  it("returns empty when no data and no legacy", () => {
    expect(loadChecks(fakeKV(), "ev")).toEqual({});
  });

  it("survives corrupted stored JSON", () => {
    const kv = fakeKV({ [checksKey("ev")]: "{broken" });
    expect(loadChecks(kv, "ev")).toEqual({});
  });
});
