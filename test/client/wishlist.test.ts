import { describe, expect, it } from "vitest";
import { filterCircles } from "../../src/lib/circle";
import {
  clearAllWishlist,
  compareTimestamps,
  loadCircleWishlistState,
  loadEventWishlistState,
  nextWishlistTimestamp,
  pruneCircleWishlist,
  saveCircleWishlistState,
  saveEventWishlistState,
} from "../../src/lib/wishlist";
import type { Circle } from "../../src/types";

const circle = (id: string): Circle => ({ id, name: id, links: [] });

describe("wishlist storage and filters", () => {
  it("normalizes timestamps and prunes invalid circle entries", () => {
    const storage = new Map<string, string>();
    const kv = { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) };
    saveCircleWishlistState(kv, "ev", { value: { a: { star: true, memo: "  note  " }, b: { star: false, memo: "   " }, c: null as never }, updatedAt: "2026-09-03T00:00:00Z" });
    expect(loadCircleWishlistState(kv, "ev")).toEqual({ value: { a: { star: true, memo: "note" } }, updatedAt: "2026-09-03T00:00:00.000Z" });
  });

  it("prunes empty memo to preserve star or completely remove entry", () => {
    expect(pruneCircleWishlist({ a: { star: true, memo: "" }, b: { memo: "   " } })).toEqual({
      a: { star: true },
    });
  });

  it("handles event wishlist state and cleanup", () => {
    const storage = new Map<string, string>();
    const kv = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      get length() { return storage.size; },
      key: (i: number) => Array.from(storage.keys())[i] ?? null,
    };
    saveEventWishlistState(kv, { value: ["ev1"], updatedAt: "2026-09-03T00:00:00.000Z" });
    expect(loadEventWishlistState(kv)).toEqual({ value: ["ev1"], updatedAt: "2026-09-03T00:00:00.000Z" });
    saveCircleWishlistState(kv, "ev1", { value: { c1: { star: true } }, updatedAt: null });
    expect(storage.size).toBe(2);

    clearAllWishlist(kv);
    expect(storage.size).toBe(0);
    expect(loadEventWishlistState(kv)).toEqual({ value: [], updatedAt: null });
  });

  it("creates independent logical timestamps and compares correctly", () => {
    const base = "2026-09-03T00:00:00.000Z";
    expect(nextWishlistTimestamp(base, false)).toBe("2026-09-03T00:00:00.001Z");
    expect(compareTimestamps("2026-09-03T00:00:00.000Z", "2026-09-03T00:00:00.001Z")).toBe(-1);
    expect(compareTimestamps("2026-09-03T00:00:00.001Z", "2026-09-03T00:00:00.000Z")).toBe(1);
    expect(compareTimestamps(null, "2026-09-03T00:00:00.000Z")).toBe(-1);
    expect(compareTimestamps("2026-09-03T00:00:00.000Z", null)).toBe(1);
    expect(compareTimestamps(null, null)).toBe(0);
  });

  it("filters starred circles and searches memos", () => {
    const wishlist = { a: { star: true, memo: "고래" } };
    expect(filterCircles([circle("a"), circle("b")], { checks: {}, status: "starred", ips: [], query: "", wishlist }).map((item) => item.id)).toEqual(["a"]);
    expect(filterCircles([circle("a"), circle("b")], { checks: {}, status: "all", ips: [], query: "고 래", wishlist }).map((item) => item.id)).toEqual(["a"]);
  });
});
