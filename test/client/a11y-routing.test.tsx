// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import App from "../../src/App";
import { parseDetailId, detailHash } from "../../src/lib/route";

const EVENT = {
  id: 1,
  slug: "ev",
  title: "코믹월드",
  alias: "별칭",
  venue: "장소",
  date_label: "기간",
  map_url: null,
  status: "active",
};
const CIRCLES = [
  { id: 1, participationId: 1, slug: "booth1", name: "부스서클", genre: "걸밴크", genres: ["걸밴크"], ips: [], booth: "A-01", day: null, boothUrl: null, highlight: false, badge: null, note: null, status: "confirmed", links: [] },
];

function json(obj: unknown) {
  return new Response(JSON.stringify(obj), { status: 200, headers: { "content-type": "application/json" } });
}

describe("route helpers", () => {
  it("round-trips a detail id through the hash", () => {
    expect(parseDetailId(detailHash("a b/c"))).toBe("a b/c");
  });
  it("returns null for non-detail hashes", () => {
    expect(parseDetailId("")).toBeNull();
    expect(parseDetailId("#/other")).toBeNull();
  });
});

describe("<App/> accessibility + routing", () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/api/events")) return json({ events: [EVENT] });
        if (url.includes("/api/circles")) return json({ circles: CIRCLES });
        throw new Error("unexpected " + url);
      }),
    );
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("search input has an accessible name and filter toggles expose aria-pressed", async () => {
    render(<App />);
    await screen.findByText("부스서클");
    expect(screen.getByRole("searchbox", { name: "서클·부스·장르 검색" })).toBeTruthy();
    const allBtn = screen.getByRole("button", { name: "전체" });
    expect(allBtn.getAttribute("aria-pressed")).toBe("true");
    const done = screen.getByRole("button", { name: "체크함" });
    expect(done.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(done);
    expect(screen.getByRole("button", { name: "체크함" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("opening detail updates the hash; hashchange back returns to the list", async () => {
    render(<App />);
    fireEvent.click(await screen.findByText("부스서클"));
    expect(screen.getByText("서클 상세")).toBeTruthy();
    expect(parseDetailId(window.location.hash)).toBe("booth1");

    // simulate browser back to the list
    window.location.hash = "";
    fireEvent(window, new Event("hashchange"));
    await waitFor(() => expect(screen.queryByText("서클 상세")).toBeNull());
    expect(screen.getByText("부스서클")).toBeTruthy();
  });

  it("direct entry to a detail hash renders that circle", async () => {
    window.location.hash = detailHash("booth1");
    render(<App />);
    await waitFor(() => expect(screen.getByText("서클 상세")).toBeTruthy());
  });

  it("shows a retry button that re-fetches without a page reload", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("네트워크 오류"))
      .mockImplementation(async (url: string) => {
        if (url.includes("/api/events")) return json({ events: [EVENT] });
        if (url.includes("/api/circles")) return json({ circles: CIRCLES });
        throw new Error("unexpected " + url);
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    const retry = await screen.findByRole("button", { name: /다시 시도/ });
    fireEvent.click(retry);
    expect(await screen.findByText("부스서클")).toBeTruthy();
  });
});
