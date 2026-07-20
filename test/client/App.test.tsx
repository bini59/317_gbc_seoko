// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor, act } from "@testing-library/react";
import App from "../../src/App";

type ApiCircleLike = Record<string, unknown>;

const apiCircle = (o: Partial<ApiCircleLike> & { slug: string; name: string; status: string }): ApiCircleLike => ({
  id: 1,
  participationId: 1,
  genre: "걸밴크",
  genres: ["걸밴크"],
  ips: [],
  booth: null,
  day: null,
  boothUrl: null,
  highlight: false,
  badge: null,
  note: null,
  links: [],
  ...o,
});

function mockApi(circles: ApiCircleLike[]) {
  const json = (obj: unknown) =>
    new Response(JSON.stringify(obj), { status: 200, headers: { "content-type": "application/json" } });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.includes("/api/events"))
        return json({
          events: [
            { id: 1, slug: "ev", title: "코믹월드", alias: "별칭", venue: "장소", date_label: "기간", map_url: null, status: "active" },
            { id: 2, slug: "illustar", title: "일러스타 페스", alias: null, venue: "SETEC", date_label: "8월", map_url: null, status: "upcoming" },
          ],
        });
      if (url.includes("/api/circles")) return json({ circles });
      throw new Error("unexpected fetch " + url);
    }),
  );
}

const CIRCLES = [
  apiCircle({ slug: "booth1", name: "부스서클", status: "confirmed", booth: "A-01", ips: ["걸즈밴드크라이"] }),
  apiCircle({ slug: "tsuhan1", name: "통판서클", status: "unlisted", genre: "단독장르", genres: ["오리지널"] }),
];

describe("<App/> confirmed + unlisted", () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = ""; // 라우팅 상태 격리 (테스트 간 hash 누수 방지)
    mockApi(CIRCLES);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders both booth circles and unlisted 통판 with a 통판 section", async () => {
    window.location.hash = "#/events/ev";
    render(<App />);
    expect(await screen.findByText("부스서클")).toBeTruthy();
    expect(screen.getByText("통판서클")).toBeTruthy();
    expect(screen.getByText("윗치폼 통판")).toBeTruthy(); // section header
  });

  it("shows registered events at the root and opens the selected checklist", async () => {
    render(<App />);
    expect(await screen.findByRole("heading", { name: "행사 선택" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "진행 중" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "예정" })).toBeTruthy();
    expect(screen.getByText("코믹월드")).toBeTruthy();
    fireEvent.click(screen.getByRole("link", { name: /일러스타 페스/ }));
    await waitFor(() => expect(window.location.hash).toBe("#/events/illustar"));
    expect(await screen.findByText("부스서클")).toBeTruthy();
  });

  it("opens the 통판 detail from its card", async () => {
    window.location.hash = "#/events/ev";
    render(<App />);
    fireEvent.click(await screen.findByText("통판서클"));
    expect(screen.getByText("서클 상세")).toBeTruthy();
  });

  it("search matches 통판 by name and hides booth circles", async () => {
    window.location.hash = "#/events/ev";
    render(<App />);
    await screen.findByText("통판서클");
    fireEvent.change(screen.getByPlaceholderText("서클 · 부스 · 장르 검색"), { target: { value: "통판" } });
    expect(screen.getByText("통판서클")).toBeTruthy();
    expect(screen.queryByText("부스서클")).toBeNull();
  });

  it("persists a 통판 visit check to per-event storage", async () => {
    window.location.hash = "#/events/ev";
    render(<App />);
    await screen.findByText("통판서클");
    const checkBtn = screen.getAllByLabelText("방문 체크")[1]; // 통판 is second
    fireEvent.click(checkBtn);
    await waitFor(() => expect(screen.getAllByLabelText("방문 체크 해제").length).toBeGreaterThan(0));
    const stored = JSON.parse(localStorage.getItem("gbc-seoko-checks:ev") || "{}");
    expect(Object.values(stored).some(Boolean)).toBe(true);
  });

  it("builds top filters only from the selected 행사의 IPs and hides a missing map link", async () => {
    window.location.hash = "#/events/ev";
    render(<App />);
    expect(await screen.findByRole("button", { name: "걸즈밴드크라이" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "오리지널" })).toBeNull();
    expect(screen.getAllByRole("button", { name: "단독장르" }).some((button) => button.hasAttribute("aria-pressed"))).toBe(false);
    expect(screen.queryByRole("button", { name: "뱅드림" })).toBeNull();
    expect(screen.queryByTitle("전체 부스배치도")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "걸즈밴드크라이" }));
    expect(screen.getByText("부스서클")).toBeTruthy();
    expect(screen.queryByText("통판서클")).toBeNull();
  });

  it("resets search and filters when changing 행사", async () => {
    window.location.hash = "#/events/ev";
    render(<App />);
    await screen.findByText("부스서클");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "통판" } });
    fireEvent.click(screen.getByRole("button", { name: "체크함" }));
    fireEvent.click(screen.getByRole("button", { name: "걸즈밴드크라이" }));
    window.location.hash = "#/events/illustar";
    fireEvent(window, new Event("hashchange"));
    await screen.findByText("일러스타 페스");
    expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("");
    expect(screen.getByRole("button", { name: "전체" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "전체 장르" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("keeps visit checks isolated when switching 행사", async () => {
    window.location.hash = "#/events/ev";
    render(<App />);
    fireEvent.click((await screen.findAllByLabelText("방문 체크"))[0]);
    await waitFor(() => expect(localStorage.getItem("gbc-seoko-checks:ev")).toContain("true"));

    window.location.hash = "#/events/illustar";
    fireEvent(window, new Event("hashchange"));
    await screen.findByText("일러스타 페스");
    expect(screen.getAllByLabelText("방문 체크").length).toBeGreaterThan(0);
    expect(localStorage.getItem("gbc-seoko-checks:illustar")).toBeNull();
  });

  it("ignores an older 행사 response that resolves after a newer route", async () => {
    let resolveOld!: (response: Response) => void;
    const oldResponse = new Promise<Response>((resolve) => { resolveOld = resolve; });
    const json = (obj: unknown) => new Response(JSON.stringify(obj), { status: 200 });
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("/api/events")) return json({ events: [
        { id: 1, slug: "ev", title: "첫 행사", status: "active" },
        { id: 2, slug: "illustar", title: "둘째 행사", status: "upcoming" },
      ] });
      if (url.includes("event=ev")) return oldResponse;
      if (url.includes("event=illustar")) return json({ circles: [apiCircle({ slug: "new", name: "새 행사 서클", status: "confirmed" })] });
      throw new Error(`unexpected ${url}`);
    }));
    window.location.hash = "#/events/ev";
    render(<App />);
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining("event=ev"),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    ));
    const oldSignal = (vi.mocked(fetch).mock.calls.find(([url]) => String(url).includes("event=ev"))?.[1] as RequestInit).signal as AbortSignal;
    window.location.hash = "#/events/illustar";
    fireEvent(window, new Event("hashchange"));
    expect(await screen.findByText("새 행사 서클")).toBeTruthy();
    expect(oldSignal.aborted).toBe(true);
    await act(async () => {
      resolveOld(json({ circles: [apiCircle({ slug: "old", name: "늦은 이전 서클", status: "confirmed" })] }));
      await oldResponse;
    });
    expect(screen.queryByText("늦은 이전 서클")).toBeNull();
  });

  it("clears the previous checklist while a new route fails", async () => {
    window.location.hash = "#/events/ev";
    render(<App />);
    expect(await screen.findByText("부스서클")).toBeTruthy();
    window.location.hash = "#/events/missing";
    fireEvent(window, new Event("hashchange"));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByText("부스서클")).toBeNull();
    expect(screen.queryByLabelText("방문 체크")).toBeNull();
  });
});
