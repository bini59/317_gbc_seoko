// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render as rtlRender, screen, fireEvent, cleanup, waitFor, act, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "../../src/App";
import { cacheKeys } from "../../src/lib/cache";

type ApiCircleLike = Record<string, unknown>;

const apiCircle = (o: Partial<ApiCircleLike> & { slug: string; name: string; status: string }): ApiCircleLike => ({
  id: 1,
  participationId: 1,
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

function json(obj: unknown) {
  return new Response(JSON.stringify(obj), { status: 200, headers: { "content-type": "application/json" } });
}

function mockApi(circles: ApiCircleLike[], authEnabled = false, user: { userId: string; email: null; name: string; avatarUrl: null } | null = null) {
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
      if (url.includes("/api/auth/logout")) return json({ ok: true });
      if (url.includes("/api/checks")) return json({ checks: { booth1: true } });
      if (url.includes("/api/auth/me")) return json({ enabled: authEnabled, user });
      throw new Error("unexpected fetch " + url);
    }),
  );
}

/** Keep App tests independent: every render gets an isolated client with no automatic retries. */
function render(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return rtlRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

function goTo(hash: string) {
  window.location.hash = hash;
  fireEvent(window, new Event("hashchange"));
}

function cached<T>(hash: string, data: T) {
  return JSON.stringify({ schemaVersion: 1, hash, cachedAt: Date.now(), data });
}

const CIRCLES = [
  apiCircle({ slug: "booth1", name: "부스서클", status: "confirmed", booth: "A-01", ips: ["걸즈밴드크라이"] }),
  apiCircle({ slug: "tsuhan1", name: "통판서클", status: "unlisted", ips: [] }),
];

/** 설정 진입점은 모바일/데스크톱 모두 독립 페이지로 이동한다. */
function openSidebarSettings() {
  window.location.hash = "#/settings";
  fireEvent(window, new Event("hashchange"));
  expect(window.location.hash).toBe("#/settings");
  return within(screen.getByRole("main"));
}

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
    expect(screen.getByRole("heading", { name: "홈 화면에 추가하는 방법" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "진행 중" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "예정" })).toBeTruthy();
    expect(screen.getByText("코믹월드")).toBeTruthy();
    fireEvent.click(screen.getByRole("link", { name: /일러스타 페스/ }));
    await waitFor(() => expect(window.location.hash).toBe("#/events/illustar"));
    expect(await screen.findByText("부스서클")).toBeTruthy();
  });

  it("opens the detailed installation guide from the event landing card", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "행사 선택" });
    fireEvent.click(screen.getByRole("link", { name: "설치 방법 자세히 보기" }));

    expect(window.location.hash).toBe("#/settings");
    expect(await screen.findByRole("heading", { name: "홈 화면에 추가" })).toBeTruthy();
  });

  it("marks the current 행사 in the sidebar", async () => {
    window.location.hash = "#/events/ev";
    render(<App />);
    await screen.findByText("부스서클");
    expect(screen.getByRole("link", { name: /코믹월드/ }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: /일러스타 페스/ }).getAttribute("aria-current")).toBeNull();
    // 설정은 항상 있지만 연동 섹션은 auth 비활성이면 없다 (#45)
    const settings = openSidebarSettings();
    expect(settings.queryByRole("button", { name: "연동하기" })).toBeNull();
    expect(settings.queryByText("기기 간 연동")).toBeNull();
    expect(settings.getByRole("group", { name: "테마" })).toBeTruthy();
  });

  it("shows the sync entry inside the sidebar settings when auth is enabled (#45)", async () => {
    window.location.hash = "#/events/ev";
    mockApi(CIRCLES, true);
    render(<App />);
    await screen.findByText("부스서클");
    const settings = openSidebarSettings();
    expect(await settings.findByRole("button", { name: "연동하기" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "로그인" })).toBeNull();
  });

  it("keeps name/logout in the sidebar settings only when signed in (#52)", async () => {
    window.location.hash = "#/events/ev";
    mockApi(CIRCLES, true, { userId: "u1", email: null, name: "세오코", avatarUrl: null });
    render(<App />);
    await screen.findByText("부스서클");
    const settings = openSidebarSettings();
    expect(await settings.findByRole("button", { name: "로그아웃" })).toBeTruthy();
    expect(settings.getByText("세오코")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "연동하기" })).toBeNull();
    expect(screen.queryByRole("button", { name: "로그인" })).toBeNull();
  });

  it("logs out with a POST to the worker and falls back to the sync entry (#34)", async () => {
    window.location.hash = "#/events/ev";
    mockApi(CIRCLES, true, { userId: "u1", email: null, name: "세오코", avatarUrl: null });
    render(<App />);
    await screen.findByText("부스서클");
    const settings = openSidebarSettings();
    fireEvent.click(await settings.findByRole("button", { name: "로그아웃" }));
    expect(await settings.findByRole("button", { name: "연동하기" })).toBeTruthy();
    expect(vi.mocked(fetch)).toHaveBeenCalledWith("/api/auth/logout", { method: "POST", credentials: "include" });
    expect(screen.queryByRole("button", { name: "로그아웃" })).toBeNull();
  });

  it("announces the merged count after the first remote sync (#45)", async () => {
    window.location.hash = "#/events/ev";
    localStorage.setItem("gbc-seoko-checks:ev", JSON.stringify({ tsuhan1: true }));
    mockApi(CIRCLES, true, { userId: "u1", email: null, name: "세오코", avatarUrl: null });
    render(<App />);
    expect(await screen.findByText("1개 항목을 동기화했어요")).toBeTruthy(); // 로컬에서 올라간 항목만 센다
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(expect.stringContaining("/api/checks"), expect.objectContaining({ method: "PUT" }));
    openSidebarSettings();
    expect(screen.getByText(/마지막 저장/)).toBeTruthy();
  });

  it("does not announce or stamp a save on a plain load with nothing to merge (#45)", async () => {
    window.location.hash = "#/events/ev";
    mockApi(CIRCLES, true, { userId: "u1", email: null, name: "세오코", avatarUrl: null });
    render(<App />);
    await screen.findByLabelText("방문 체크 해제"); // 원격 booth1 반영됨
    expect(screen.queryByText(/동기화했어요/)).toBeNull();
    expect(vi.mocked(fetch)).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ method: "PUT" }));
    openSidebarSettings();
    expect(screen.queryByText(/마지막 저장/)).toBeNull();
  });

  it("keeps the merged checks and announces when the merge save fails (#45)", async () => {
    window.location.hash = "#/events/ev";
    localStorage.setItem("gbc-seoko-checks:ev", JSON.stringify({ tsuhan1: true }));
    mockApi(CIRCLES, true, { userId: "u1", email: null, name: "세오코", avatarUrl: null });
    const base = vi.mocked(fetch).getMockImplementation()!;
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      if (String(url).includes("/api/checks") && init?.method === "PUT") return new Response(null, { status: 500 });
      return base(url, init);
    });
    render(<App />);
    expect(await screen.findByText("방문 체크를 저장하지 못했어요")).toBeTruthy();
    await waitFor(() => expect(screen.getAllByLabelText("방문 체크 해제").length).toBe(2)); // 원격 booth1 + 로컬 tsuhan1 모두 유지
  });

  it("does not render the removed visit reset action", async () => {
    window.location.hash = "#/events";
    render(<App />);
    await screen.findByRole("heading", { name: "행사 선택" });
    openSidebarSettings();
    expect(screen.queryByRole("button", { name: "이 행사 방문 체크 초기화" })).toBeNull();
  });

  it("still signs out locally when the logout request fails (#34)", async () => {
    window.location.hash = "#/events/ev";
    mockApi(CIRCLES, true, { userId: "u1", email: null, name: "세오코", avatarUrl: null });
    const base = vi.mocked(fetch).getMockImplementation()!;
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      if (String(url).includes("/api/auth/logout")) throw new Error("offline");
      return base(url, init);
    });
    render(<App />);
    await screen.findByText("부스서클");
    const settings = openSidebarSettings();
    fireEvent.click(await settings.findByRole("button", { name: "로그아웃" }));
    expect(await settings.findByRole("button", { name: "연동하기" })).toBeTruthy();
  });

  it("opens the 통판 detail from its card", async () => {
    window.location.hash = "#/events/ev";
    render(<App />);
    fireEvent.click(await screen.findByText("통판서클"));
    expect(screen.getByText("서클 상세")).toBeTruthy();
    expect(screen.getByText("부스서클")).toBeTruthy(); // 데스크톱 2컬럼: 목록 유지
  });

  it("search matches 통판 by name and hides booth circles", async () => {
    window.location.hash = "#/events/ev";
    render(<App />);
    await screen.findByText("통판서클");
    fireEvent.change(screen.getByPlaceholderText("서클 · 부스 · 장르 · 메모 검색"), { target: { value: "통판" } });
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

  it("persists a signed-in visit check locally before remote sync", async () => {
    window.location.hash = "#/events/ev";
    mockApi(CIRCLES, true, { userId: "u1", email: null, name: "세오코", avatarUrl: null });
    render(<App />);
    await screen.findByText("부스서클");
    fireEvent.click(screen.getByLabelText("방문 체크"));

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("gbc-seoko-checks:ev") || "{}");
      expect(stored.tsuhan1).toBe(true);
    });
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining("/api/checks?event=ev"),
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("builds top filters only from the selected 행사의 IPs and hides a missing map link", async () => {
    window.location.hash = "#/events/ev";
    render(<App />);
    expect(await screen.findByRole("button", { name: "걸즈밴드크라이" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "오리지널" })).toBeNull();
    expect(screen.queryByRole("button", { name: "단독장르" })).toBeNull();
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
    await screen.findByText("부스서클");
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
    await screen.findByText("부스서클");
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

  it("reuses the events and circles query caches when re-entering within five minutes", async () => {
    const hash = "a".repeat(32);
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/api/events?metadata=1") return json({ meta: { schemaVersion: 1, hash } });
      if (url === "/api/events") return json({ events: [
        { id: 1, slug: "ev", title: "캐시 행사", status: "active" },
      ], meta: { schemaVersion: 1, hash } });
      if (url === "/api/circles?event=ev&status=all&metadata=1") return json({ meta: { schemaVersion: 1, hash } });
      if (url === "/api/circles?event=ev&status=all") return json({
        circles: [apiCircle({ slug: "cached-circle", name: "첫 로드 서클", status: "confirmed" })],
        meta: { schemaVersion: 1, hash },
      });
      if (url === "/api/auth/me") return json({ enabled: false, user: null });
      throw new Error("unexpected fetch " + url);
    });
    vi.stubGlobal("fetch", fetchMock);

    goTo("#/events/ev");
    render(<App />);
    await screen.findByText("첫 로드 서클");
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/events").length).toBe(1);
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/events?metadata=1").length).toBe(1);
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/circles?event=ev&status=all").length).toBe(1);

    goTo("#/");
    await screen.findByRole("heading", { name: "행사 선택" });
    goTo("#/events/ev");
    await screen.findByText("첫 로드 서클");

    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/events").length).toBe(1);
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/events?metadata=1").length).toBe(1);
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/circles?event=ev&status=all").length).toBe(1);
  });

  it("isolates circle caches by event slug and restores the matching cached dataset", async () => {
    const eventHash = "b".repeat(32);
    const evCircle = apiCircle({ slug: "ev-circle", name: "코믹 서클", status: "confirmed" });
    const illustarCircle = apiCircle({ slug: "illustar-circle", name: "일러스타 서클", status: "confirmed" });
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/api/events?metadata=1") return json({ meta: { schemaVersion: 1, hash: eventHash } });
      if (url === "/api/events") return json({ events: [
        { id: 1, slug: "ev", title: "코믹월드", status: "active" },
        { id: 2, slug: "illustar", title: "일러스타 페스", status: "upcoming" },
      ], meta: { schemaVersion: 1, hash: eventHash } });
      if (url === "/api/circles?event=ev&status=all&metadata=1") return json({ meta: { schemaVersion: 1, hash: "c".repeat(32) } });
      if (url === "/api/circles?event=ev&status=all") return json({ circles: [evCircle] });
      if (url === "/api/circles?event=illustar&status=all&metadata=1") return json({ meta: { schemaVersion: 1, hash: "d".repeat(32) } });
      if (url === "/api/circles?event=illustar&status=all") return json({ circles: [illustarCircle] });
      if (url === "/api/auth/me") return json({ enabled: false, user: null });
      throw new Error("unexpected fetch " + url);
    });
    vi.stubGlobal("fetch", fetchMock);

    goTo("#/events/ev");
    render(<App />);
    await screen.findByText("코믹 서클");

    goTo("#/events/illustar");
    await screen.findByText("일러스타 서클");
    expect(screen.queryByText("코믹 서클")).toBeNull();

    goTo("#/events/ev");
    await screen.findByText("코믹 서클");
    expect(screen.queryByText("일러스타 서클")).toBeNull();
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/circles?event=ev&status=all").length).toBe(1);
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/circles?event=illustar&status=all").length).toBe(1);
  });

  it("revalidates metadata and refreshes both datasets after staleTime expires", async () => {
    const initialHash = "e".repeat(32);
    const refreshedHash = "f".repeat(32);
    let version = 1;
    const fetchMock = vi.fn((url: string) => {
      const hash = version === 1 ? initialHash : refreshedHash;
      if (url === "/api/events?metadata=1") return json({ meta: { schemaVersion: 1, hash } });
      if (url === "/api/events") return json({ events: [
        { id: 1, slug: "ev", title: version === 1 ? "첫 행사 버전" : "새 행사 버전", status: "active" },
      ], meta: { schemaVersion: 1, hash } });
      if (url === "/api/circles?event=ev&status=all&metadata=1") return json({ meta: { schemaVersion: 1, hash } });
      if (url === "/api/circles?event=ev&status=all") return json({ circles: [apiCircle({
        slug: "versioned-circle",
        name: version === 1 ? "이전 데이터" : "새 데이터",
        status: "confirmed",
      })], meta: { schemaVersion: 1, hash } });
      if (url === "/api/auth/me") return json({ enabled: false, user: null });
      throw new Error("unexpected fetch " + url);
    });
    vi.stubGlobal("fetch", fetchMock);

    const initialNow = Date.now();
    vi.useFakeTimers({ now: initialNow });
    try {
      goTo("#/events/ev");
      render(<App />);
      for (let i = 0; i < 100; i += 1) {
        await act(async () => { await vi.advanceTimersByTimeAsync(1); });
        await Promise.resolve();
      }
      expect(screen.getByText("이전 데이터")).toBeTruthy();
      await act(async () => { await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 1); });
      vi.setSystemTime(initialNow + 5 * 60 * 1000 + 1);
      version = 2;
      goTo("#/settings");
      expect(screen.getByRole("heading", { name: "설정" })).toBeTruthy();
      await act(async () => { await Promise.resolve(); });
      goTo("#/events/ev");
      await act(async () => {
        for (let i = 0; i < 100; i += 1) {
          await vi.advanceTimersByTimeAsync(1);
          await Promise.resolve();
        }
      });
      expect(screen.getByText("새 데이터")).toBeTruthy();
      expect(screen.getAllByText("새 행사 버전").length).toBeGreaterThan(0);
    } finally {
      vi.useRealTimers();
    }

    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/events?metadata=1").length).toBe(2);
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/events").length).toBe(2);
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/circles?event=ev&status=all&metadata=1").length).toBe(2);
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/circles?event=ev&status=all").length).toBe(2);
  });

  it("uses matching local metadata caches without downloading either full dataset", async () => {
    const eventsHash = "1".repeat(32);
    const circlesHash = "2".repeat(32);
    const cachedEvent = { id: 1, slug: "ev", title: "로컬 캐시 행사", status: "active" };
    const cachedCircle = { id: "local-circle", name: "로컬 캐시 서클", links: [] };
    localStorage.setItem(cacheKeys.events, cached(eventsHash, [cachedEvent]));
    localStorage.setItem(cacheKeys.circles("ev"), cached(circlesHash, { circles: [cachedCircle], witchformExtra: [] }));
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/api/events?metadata=1") return json({ meta: { schemaVersion: 1, hash: eventsHash } });
      if (url === "/api/circles?event=ev&status=all&metadata=1") return json({ meta: { schemaVersion: 1, hash: circlesHash } });
      if (url === "/api/auth/me") return json({ enabled: false, user: null });
      throw new Error("full dataset should not be requested: " + url);
    });
    vi.stubGlobal("fetch", fetchMock);

    goTo("#/events/ev");
    render(<App />);
    await screen.findByText("로컬 캐시 서클");
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/events")).toHaveLength(0);
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/circles?event=ev&status=all")).toHaveLength(0);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("metadata=1"))).toHaveLength(2);
  });
});

describe("<App/> bottom navigation (mobile)", () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = "#/events/ev";
    mockApi(CIRCLES);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders 5 tabs and opens the 행사 sheet without hiding the nav", async () => {
    render(<App />);
    await screen.findByText("부스서클");
    const nav = screen.getByRole("navigation", { name: "하단 메뉴" });
    expect(nav.querySelectorAll("button").length).toBe(5);
    expect(screen.getByRole("button", { name: "목록" }).getAttribute("aria-current")).toBe("page");
    const indicator = nav.querySelector<HTMLElement>('span[aria-hidden="true"]')!;
    expect(indicator.style.transform).toBe("translateX(0%)");
    fireEvent.click(screen.getByRole("button", { name: "검색·필터" }));
    expect(indicator.style.transform).toBe("translateX(100%)");

    const eventsTab = screen.getByRole("button", { name: "행사" });
    fireEvent.click(eventsTab);
    expect(indicator.style.transform).toBe("translateX(300%)");
    expect(eventsTab.getAttribute("aria-expanded")).toBe("true");
    expect(eventsTab.getAttribute("aria-controls")).toBe("sheet-events");
    const sheet = document.getElementById("sheet-events")!;
    expect(sheet.className).toContain("md:hidden");
    expect(document.activeElement).toBe(within(sheet).getByRole("link", { name: /코믹월드/ }));
    expect(screen.getByRole("navigation", { name: "하단 메뉴" })).toBeTruthy();
    expect(window.location.hash).toBe("#/events/ev");
    // 현재 행사는 헤더 + 체크 표시
    expect(within(sheet).getByRole("link", { name: /코믹월드/ }).getAttribute("aria-current")).toBe("page");

    fireEvent.click(within(sheet).getByRole("link", { name: /일러스타 페스/ }));
    await waitFor(() => expect(window.location.hash).toBe("#/events/illustar"));
    await waitFor(() => expect(within(sheet).queryByRole("link", { name: /일러스타 페스/ })).toBeNull());
    expect(eventsTab.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("navigation", { name: "하단 메뉴" })).toBeTruthy();
  });

  it("closes the 행사 sheet with Escape, the backdrop, and re-tapping the current 행사", async () => {
    render(<App />);
    await screen.findByText("부스서클");
    const tab = screen.getByRole("button", { name: "행사" });
    const sheet = document.getElementById("sheet-events")!;
    fireEvent.click(tab);
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(tab.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(tab);
    fireEvent.click(screen.getByRole("button", { name: "시트 닫기" }));
    expect(tab.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(tab);
    fireEvent.click(within(sheet).getByRole("link", { name: /코믹월드/ })); // 같은 해시 → hashchange 없음
    expect(tab.getAttribute("aria-expanded")).toBe("false");
    expect(window.location.hash).toBe("#/events/ev");
    expect(document.body.style.overflow).toBe("");
    await act(() => new Promise((r) => setTimeout(r, 0))); // jsdom의 지연된 앵커 내비게이션이 다음 테스트로 새지 않게
  });

  it.skip("opens the settings sheet from the header gear, keeps 4 tabs, and closes on Escape (#45)", async () => {
    mockApi(CIRCLES, true);
    render(<App />);
    await screen.findByText("부스서클");
    const gear = screen.getByRole("button", { name: "설정" });
    expect(gear.getAttribute("aria-controls")).toBe("sheet-settings");
    const sheet = document.getElementById("sheet-settings")!;
    expect(sheet.className.split(" ")).toContain("hidden");
    expect(within(sheet).queryByRole("button", { name: "연동하기" })).toBeNull(); // 닫힘 = 미렌더(사이드바 사본과 중복 방지)
    gear.focus(); // 브라우저는 클릭 시 포커스가 붙지만 jsdom의 fireEvent.click은 아니다
    fireEvent.click(gear);
    expect(gear.getAttribute("aria-expanded")).toBe("true");
    expect(sheet.className.split(" ")).not.toContain("hidden");
    expect(sheet.className).toContain("md:hidden");
    expect(document.activeElement).toBe(within(sheet).getByRole("button", { name: "연동하기" }));
    expect(screen.getByRole("navigation", { name: "하단 메뉴" }).querySelectorAll("button").length).toBe(4);
    expect(screen.getByRole("button", { name: "목록" }).getAttribute("aria-current")).toBe("page");
    // 테마는 App이 한 번만 들고 있어 시트에서 고르면 사이드바 사본도 같은 값을 본다
    fireEvent.click(within(sheet).getByRole("button", { name: "다크" }));
    const aside = screen.getByText("설정", { selector: "summary" }).closest("aside")!;
    expect(within(aside).getByRole("button", { name: "다크" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(within(sheet).getByRole("button", { name: "시스템" })); // data-theme 정리
    fireEvent.keyDown(window, { key: "Escape" });
    expect(gear.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(gear);
  });

  it("shows the 행사 landing with a nav and disables irrelevant actions", async () => {
    window.location.hash = "#/events";
    render(<App />);
    expect(await screen.findByRole("heading", { name: "행사 선택" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /코믹월드/ })).toBeTruthy();
    expect(within(screen.getByRole("complementary")).getByRole("link", { name: "설정" }).parentElement?.classList.contains("hidden")).toBe(true);
    const nav = screen.getByRole("navigation", { name: "하단 메뉴" });
    expect(screen.getByRole("button", { name: "행사" }).getAttribute("aria-current")).toBe("page");
    expect(nav.querySelector<HTMLElement>('span[aria-hidden="true"]')!.style.transform).toBe("translateX(300%)");
    const unavailable = [screen.getByRole("button", { name: "목록" }), screen.getByRole("button", { name: "검색·필터" })];
    for (const tab of unavailable) {
      expect((tab as HTMLButtonElement).disabled).toBe(true);
      expect(tab.getAttribute("aria-disabled")).toBe("true");
      expect(tab.className).toContain("cursor-not-allowed");
      expect(tab.className).toContain("opacity");
    }
    expect(nav.querySelectorAll('button[aria-disabled="true"]').length).toBe(2);
  });

  it("clears the selected 행사 when opening the landing from a checklist", async () => {
    window.location.hash = "#/events/ev";
    render(<App />);
    await screen.findByText("부스서클");
    fireEvent.click(screen.getByRole("button", { name: "설정" }));
    fireEvent.click(screen.getByRole("button", { name: "행사" }));
    await screen.findByRole("heading", { name: "행사 선택" });
    expect(screen.getByRole("link", { name: /코믹월드/ }).getAttribute("aria-current")).toBeNull();
  });

  it("strengthens the nav background when content is underneath", async () => {
    const elementFromPoint = vi.spyOn(document, "elementFromPoint").mockReturnValue(null);
    render(<App />);
    await screen.findByText("부스서클");
    const nav = screen.getByRole("navigation", { name: "하단 메뉴" });
    expect(nav.dataset.contentOverlap).toBe("false");

    elementFromPoint.mockReturnValue(screen.getByText("부스서클"));
    fireEvent(window, new Event("resize"));
    expect(nav.dataset.contentOverlap).toBe("true");
  });

  it("marks wishlist and settings as the active tab position", async () => {
    window.location.hash = "#/wishlist";
    render(<App />);
    expect(await screen.findByRole("heading", { name: "찜목록" })).toBeTruthy();
    const nav = screen.getByRole("navigation", { name: "하단 메뉴" });
    expect(nav.querySelector<HTMLElement>('span[aria-hidden="true"]')!.style.transform).toBe("translateX(200%)");
    expect(screen.getByRole("button", { name: "찜목록" }).getAttribute("aria-current")).toBe("page");

    fireEvent.click(screen.getByRole("button", { name: "설정" }));
    expect(await screen.findByRole("heading", { name: "설정" })).toBeTruthy();
    expect(nav.querySelector<HTMLElement>('span[aria-hidden="true"]')!.style.transform).toBe("translateX(400%)");
    expect(screen.getByRole("button", { name: "설정" }).getAttribute("aria-current")).toBe("page");
  });

  it("connects settings navigation to the current checklist", async () => {
    window.location.hash = "#/events/ev";
    render(<App />);
    await screen.findByText("부스서클");
    fireEvent.click(screen.getByRole("button", { name: "설정" }));
    expect(await screen.findByRole("heading", { name: "설정" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "설정" }).parentElement?.className).toContain("pb-[calc(88px+env(safe-area-inset-bottom))]");
    fireEvent.click(screen.getByRole("button", { name: "행사" }));
    expect(await screen.findByRole("heading", { name: "행사 선택" })).toBeTruthy();
    fireEvent.click(screen.getByRole("link", { name: /코믹월드/ }));
    expect(await screen.findByText("부스서클")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "설정" }));
    fireEvent.click(screen.getByRole("button", { name: "목록" }));
    expect(await screen.findByText("부스서클")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "설정" }));
    fireEvent.click(screen.getByRole("button", { name: "검색·필터" }));
    expect(await screen.findByRole("searchbox")).toBeTruthy();
    expect(window.location.hash).toBe("#/events/ev");
    await act(async () => { fireEvent(window, new Event("hashchange")); });
    expect(document.getElementById("sheet-search-filter")!.classList.contains("hidden")).toBe(false);
    expect(screen.getByRole("button", { name: "검색·필터" }).getAttribute("aria-expanded")).toBe("true");
  });

  it("keeps the bottom nav focused across screen changes", async () => {
    window.location.hash = "#/events/ev";
    render(<App />);
    await screen.findByText("부스서클");
    const settings = screen.getByRole("button", { name: "설정" });
    settings.focus();
    fireEvent.click(settings);
    expect(await screen.findByRole("heading", { name: "설정" })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "설정" }));
    const list = screen.getByRole("button", { name: "목록" });
    list.focus();
    fireEvent.click(list);
    expect(await screen.findByText("부스서클")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "목록" }));
  });

  it("toggles the search/filter sheets and shows the active filter count", async () => {
    render(<App />);
    await screen.findByText("부스서클");
    const search = screen.getByRole("button", { name: "검색·필터" });
    expect(document.getElementById("sheet-search-filter")!.classList.contains("hidden")).toBe(true);
    search.focus();
    fireEvent.click(search);
    expect(search.getAttribute("aria-expanded")).toBe("true");
    expect(search.getAttribute("aria-current")).toBe("page");
    expect(document.getElementById("sheet-search-filter")!.classList.contains("hidden")).toBe(false);
    expect(document.activeElement).toBe(screen.getByRole("searchbox"));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "부스" } });
    expect(screen.getByRole("button", { name: "검색·필터 1개 적용" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "시트 닫기" }));
    expect(document.getElementById("sheet-search-filter")!.classList.contains("hidden")).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "검색·필터 1개 적용" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "" } });

    fireEvent.click(search);
    expect(search.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "체크함" }));
    fireEvent.click(screen.getByRole("button", { name: "걸즈밴드크라이" }));
    expect(screen.getByRole("button", { name: "검색·필터 2개 적용" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "목록" }).getAttribute("aria-current")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "목록" }));
    expect(screen.getByRole("button", { name: "목록" }).getAttribute("aria-current")).toBe("page");
    fireEvent.click(screen.getByRole("button", { name: "검색·필터 2개 적용" }));

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("button", { name: "검색·필터 2개 적용" }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("button", { name: "시트 닫기" })).toBeNull();
  });

  it("hides the nav while a circle detail is open", async () => {
    render(<App />);
    fireEvent.click(await screen.findByText("부스서클"));
    expect(screen.getByText("서클 상세")).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "하단 메뉴" })).toBeNull();
  });

  it("does not carry an open sheet into circle detail", async () => {
    render(<App />);
    await screen.findByText("부스서클");
    fireEvent.click(screen.getByRole("button", { name: "검색·필터" }));
    expect(screen.getByRole("group", { name: "검색과 필터" }).classList.contains("hidden")).toBe(false);

    fireEvent.click(screen.getByText("부스서클"));
    expect(await screen.findByText("서클 상세")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "시트 닫기" })).toBeNull();
    expect(screen.getByRole("group", { name: "검색과 필터" }).classList.contains("hidden")).toBe(true);
  });
});
