import { describe, it, expect } from "vitest";
import { pickActiveEvent, type ApiEvent } from "../../src/api";

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
