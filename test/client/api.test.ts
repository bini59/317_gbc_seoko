import { afterEach, describe, it, expect, vi } from "vitest";
import { fetchEvents, pickActiveEvent, type ApiEvent } from "../../src/api";

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
  afterEach(() => vi.unstubAllGlobals());

  it("returns every registered 행사 so callers can choose one", async () => {
    const events = [ev("illustar-fes-9", "upcoming"), ev("comic-world-2026-07", "past")];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ events }) }));

    await expect(fetchEvents()).resolves.toEqual(events);
    expect(fetch).toHaveBeenCalledWith("/api/events");
  });
});
