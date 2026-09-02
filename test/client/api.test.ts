import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { fetchCircles, fetchEvents, pickActiveEvent, type ApiEvent } from "../../src/api";

const ev = (slug: string, status: string): ApiEvent =>
  ({ id: 1, slug, title: slug, alias: null, fare_id: null, date_label: null, start_date: null, end_date: null, venue: null, map_url: null, status }) as ApiEvent;

describe("pickActiveEvent", () => {
  it("returns null for an empty list", () => {
    expect(pickActiveEvent([])).toBeNull();
  });
  it("prefers the active event", () => {
    expect(pickActiveEvent([ev("a", "past"), ev("b", "active")])?.slug).toBe("b");
  });
  it("falls back to the first event when none are active", () => {
    expect(pickActiveEvent([ev("a", "past"), ev("b", "past")])?.slug).toBe("a");
  });
});

describe("fetchEvents", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      values: new Map<string, string>(),
      getItem(key: string) { return this.values.has(key) ? this.values.get(key) : null; },
      setItem(key: string, value: string) { this.values.set(key, value); },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("returns every registered 행사 so callers can choose one", async () => {
    const events = [ev("illustar-fes-9", "upcoming"), ev("comic-world-2026-07", "past")];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => ({
      ok: true,
      json: async () => url.includes("metadata")
        ? { meta: { schemaVersion: 1, hash: "a".repeat(32) } }
        : { events, meta: { schemaVersion: 1, hash: "a".repeat(32) } },
    })));

    await expect(fetchEvents()).resolves.toEqual(events);
    expect(fetch).toHaveBeenNthCalledWith(1, "/api/events?metadata=1");
    expect(fetch).toHaveBeenNthCalledWith(2, "/api/events");
  });

  it("uses a matching event cache without downloading the dataset", async () => {
    localStorage.setItem("gbc-seoko-cache:v1:events", JSON.stringify({
      schemaVersion: 1,
      hash: "b".repeat(32),
      cachedAt: Date.now(),
      data: [ev("cached", "active")],
    }));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ meta: { schemaVersion: 1, hash: "b".repeat(32) } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchEvents()).resolves.toEqual([ev("cached", "active")]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to a valid circle cache when metadata and data requests fail", async () => {
    localStorage.setItem("gbc-seoko-cache:v1:circles:ev", JSON.stringify({
      schemaVersion: 1,
      hash: "c".repeat(32),
      cachedAt: Date.now(),
      data: { circles: [{ id: "cached", name: "캐시", links: [] }], witchformExtra: [] },
    }));
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(fetchCircles("ev")).resolves.toEqual({
      circles: [{ id: "cached", name: "캐시", links: [] }],
      witchformExtra: [],
    });
  });
});
