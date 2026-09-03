// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render as rtlRender, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "../../src/App";
import { circleHash, parseRoute } from "../../src/lib/route";

const EVENT = {
  id: 1,
  slug: "ev",
  title: "코믹월드",
  alias: "별칭",
  venue: "장소",
  date_label: "기간",
  map_url: "https://example.com/map",
  status: "active",
};
const CIRCLES = [
  { id: 1, participationId: 1, slug: "booth1", name: "부스서클", ips: ["걸밴크"], booth: "A-01", day: null, boothUrl: null, highlight: false, badge: null, note: null, status: "confirmed", links: [] },
];

function json(obj: unknown) {
  return new Response(JSON.stringify(obj), { status: 200, headers: { "content-type": "application/json" } });
}

/** Keep App tests independent: every render gets an isolated client with no automatic retries. */
function render(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return rtlRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

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
    window.location.hash = "#/events/ev";
    render(<App />);
    await screen.findByText("부스서클");
    expect(screen.getByRole("searchbox", { name: "서클·부스·장르·메모 검색" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "행사" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "전체 부스배치도 (새 창)" }).getAttribute("target")).toBe("_blank");
    const allBtn = screen.getByRole("button", { name: "전체" });
    expect(allBtn.getAttribute("aria-pressed")).toBe("true");
    const done = screen.getByRole("button", { name: "체크함" });
    expect(done.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(done);
    expect(screen.getByRole("button", { name: "체크함" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("opening detail updates the hash; hashchange back returns to the list", async () => {
    window.location.hash = "#/events/ev";
    render(<App />);
    fireEvent.click(await screen.findByText("부스서클"));
    expect(screen.getByText("서클 상세")).toBeTruthy();
    expect(parseRoute(window.location.hash)).toEqual({ kind: "circle", eventSlug: "ev", circleSlug: "booth1" });

    // simulate browser back to the list
    window.location.hash = "#/events/ev";
    fireEvent(window, new Event("hashchange"));
    await waitFor(() => expect(screen.queryByText("서클 상세")).toBeNull());
    expect(screen.getByText("부스서클")).toBeTruthy();
  });

  it("direct entry to a detail hash renders that circle", async () => {
    window.location.hash = circleHash("ev", "booth1");
    render(<App />);
    await waitFor(() => expect(screen.getByText("서클 상세")).toBeTruthy());
  });

  it("opens settings as a real route and keeps the current data loaded", async () => {
    window.location.hash = "#/events/ev";
    render(<App />);
    await screen.findByText("부스서클");
    const callsBefore = vi.mocked(fetch).mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "설정" }));
    expect(window.location.hash).toBe("#/settings");
    expect(await screen.findByRole("heading", { name: "설정" })).toBeTruthy();
    expect(screen.getByText("코믹월드")).toBeTruthy();
    expect(vi.mocked(fetch).mock.calls.length).toBe(callsBefore);
    expect(screen.getByRole("link", { name: "설정" }).getAttribute("aria-current")).toBe("page");
  });

  it("opens a legacy detail hash in the active 행사 context", async () => {
    window.location.hash = "#/c/booth1";
    render(<App />);
    await waitFor(() => expect(screen.getByText("서클 상세")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "목록으로 뒤로" }));
    expect(window.location.hash).toBe("#/events/ev");
  });

  it("shows a retry button that re-fetches without a page reload", async () => {
    window.location.hash = "#/events/ev";
    let failures = 0;
    const fetchMock = vi
      .fn()
      .mockImplementation(async (url: string) => {
        if ((url.includes("/api/events") || url.includes("/api/circles")) && failures++ < 2) {
          throw new Error("네트워크 오류");
        }
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

  it("does not retry beyond the metadata/data pair, while manual retry recovers", async () => {
    let eventRequests = 0;
    let circleRequests = 0;
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/api/events?metadata=1" || url === "/api/events") {
        eventRequests += 1;
        if (eventRequests <= 2) throw new Error("네트워크 오류");
        return url.endsWith("metadata=1")
          ? json({ meta: { schemaVersion: 1, hash: "a".repeat(32) } })
          : json({ events: [EVENT], meta: { schemaVersion: 1, hash: "a".repeat(32) } });
      }
      if (url === "/api/circles?event=ev&status=all&metadata=1" || url === "/api/circles?event=ev&status=all") {
        circleRequests += 1;
        return url.endsWith("metadata=1")
          ? json({ meta: { schemaVersion: 1, hash: "b".repeat(32) } })
          : json({ circles: CIRCLES, meta: { schemaVersion: 1, hash: "b".repeat(32) } });
      }
      if (url === "/api/auth/me") return json({ enabled: false, user: null });
      throw new Error("unexpected " + url);
    });
    vi.stubGlobal("fetch", fetchMock);
    window.location.hash = "#/events/ev";

    render(<App />);
    const retry = await screen.findByRole("button", { name: "다시 시도" });
    expect(eventRequests).toBe(2);
    expect(circleRequests).toBe(0);
    fireEvent.click(retry);
    expect(await screen.findByText("부스서클")).toBeTruthy();
    expect(eventRequests).toBe(4);
    expect(circleRequests).toBe(2);
  });
});
