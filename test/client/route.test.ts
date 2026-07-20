import { describe, expect, it } from "vitest";
import { circleHash, eventHash, eventsHash, parseRoute } from "../../src/lib/route";

describe("parseRoute", () => {
  it("represents the root hash as the 행사 목록", () => {
    expect(parseRoute("")).toEqual({ kind: "events" });
    expect(parseRoute("#/ ".trim())).toEqual({ kind: "events" });
    expect(eventsHash()).toBe("#/");
  });

  it("parses and creates an 행사 checklist hash", () => {
    expect(parseRoute("#/events/illustar-fes-9")).toEqual({
      kind: "event",
      eventSlug: "illustar-fes-9",
    });
    expect(eventHash("illustar-fes-9")).toBe("#/events/illustar-fes-9");
  });

  it("keeps 행사 context in a 서클 detail hash", () => {
    const hash = circleHash("일러스타-9", "circle/name");
    expect(hash).toBe("#/events/%EC%9D%BC%EB%9F%AC%EC%8A%A4%ED%83%80-9/c/circle%2Fname");
    expect(parseRoute(hash)).toEqual({
      kind: "circle",
      eventSlug: "일러스타-9",
      circleSlug: "circle/name",
    });
  });

  it("represents a legacy 서클 hash for active-행사 compatibility", () => {
    expect(parseRoute("#/c/old-circle")).toEqual({
      kind: "legacy-circle",
      circleSlug: "old-circle",
    });
  });

  it("falls back to the 행사 목록 for unsupported or malformed hashes", () => {
    expect(parseRoute("#/unknown/path")).toEqual({ kind: "events" });
    expect(parseRoute("#/events/%E0%A4%A")).toEqual({ kind: "events" });
  });
});
