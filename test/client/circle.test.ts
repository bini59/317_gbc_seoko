import { describe, it, expect } from "vitest";
import { filterCircles, chipLabel, boothShort, chipsFor } from "../../src/lib/circle";
import type { Circle } from "../../src/types";

const mk = (o: Partial<Circle> & { id: string }): Circle => ({
  name: o.id,
  genre: "",
  links: [],
  ...o,
});

describe("filterCircles", () => {
  const circles = [
    mk({ id: "a", name: "밴드부", booth: "A-02", genre: "뱅드림", genres: ["뱅드림"], ips: ["BanG Dream!"] }),
    mk({ id: "b", name: "걸밴크샵", booth: "A-01", genre: "걸밴크", genres: ["걸즈밴드크라이"], ips: ["걸즈 밴드 크라이"] }),
    mk({ id: "t", name: "통판서클", genre: "걸밴크" }), // no booth
  ];

  it("sorts by booth, pushing 통판(no booth) to the end", () => {
    const out = filterCircles(circles, { checks: {}, status: "all", ips: [], query: "" });
    expect(out.map((c) => c.id)).toEqual(["b", "a", "t"]);
  });

  it("filters by visit status", () => {
    const checks = { a: true };
    expect(
      filterCircles(circles, { checks, status: "done", ips: [], query: "" }).map((c) => c.id),
    ).toEqual(["a"]);
    expect(
      filterCircles(circles, { checks, status: "undone", ips: [], query: "" }).map((c) => c.id).sort(),
    ).toEqual(["b", "t"]);
  });

  it("matches a selected filter only against an exact normalized IP value", () => {
    const out = filterCircles(circles, {
      checks: {},
      status: "all",
      ips: ["걸즈밴드크라이"],
      query: "",
    });
    expect(out.map((c) => c.id)).toEqual(["b"]);

    const partial = filterCircles([
      ...circles,
      mk({ id: "long", ips: ["걸즈밴드크라이 온리전"] }),
      mk({ id: "legacy", genre: "걸즈밴드크라이", genres: ["걸즈밴드크라이"], ips: [] }),
    ], {
      checks: {},
      status: "all",
      ips: ["걸즈밴드크라이"],
      query: "",
    });
    expect(partial.map((c) => c.id)).toEqual(["b"]);
  });

  it("searches name/booth/genre normalized (whitespace-insensitive)", () => {
    expect(
      filterCircles(circles, { checks: {}, status: "all", ips: [], query: "통 판" }).map((c) => c.id),
    ).toEqual(["t"]);
    expect(
      filterCircles(circles, { checks: {}, status: "all", ips: [], query: "a-01" }).map((c) => c.id),
    ).toEqual(["b"]);
  });
});

describe("helpers", () => {
  it("chipLabel maps known hosts", () => {
    expect(chipLabel("https://x.com/foo")).toBe("X");
    expect(chipLabel("https://witchform.com/x")).toBe("윗치폼");
    expect(chipLabel("https://comicw.net/map/1")).toBe("배치도");
    expect(chipLabel("https://example.com")).toBe("링크");
  });

  it("boothShort takes leading booth or name initial", () => {
    expect(boothShort(mk({ id: "x", booth: "BE01·BE02" }))).toBe("BE01");
    expect(boothShort(mk({ id: "x", name: "통판", booth: undefined }))).toBe("통");
  });

  it("chipsFor puts boothUrl first as primary", () => {
    const chips = chipsFor(mk({ id: "x", booth: "A", boothUrl: "u", links: [{ label: "X", url: "https://x.com/a" }] }));
    expect(chips[0].primary).toBe(true);
    expect(chips[1].label).toBe("X");
  });
});
