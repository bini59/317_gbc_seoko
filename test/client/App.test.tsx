// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
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
          ],
        });
      if (url.includes("/api/circles")) return json({ circles });
      throw new Error("unexpected fetch " + url);
    }),
  );
}

const CIRCLES = [
  apiCircle({ slug: "booth1", name: "부스서클", status: "confirmed", booth: "A-01" }),
  apiCircle({ slug: "tsuhan1", name: "통판서클", status: "unlisted", genres: ["오리지널"] }),
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
    render(<App />);
    expect(await screen.findByText("부스서클")).toBeTruthy();
    expect(screen.getByText("통판서클")).toBeTruthy();
    expect(screen.getByText("윗치폼 통판")).toBeTruthy(); // section header
  });

  it("opens the 통판 detail from its card", async () => {
    render(<App />);
    fireEvent.click(await screen.findByText("통판서클"));
    expect(screen.getByText("서클 상세")).toBeTruthy();
  });

  it("search matches 통판 by name and hides booth circles", async () => {
    render(<App />);
    await screen.findByText("통판서클");
    fireEvent.change(screen.getByPlaceholderText("서클 · 부스 · 장르 검색"), { target: { value: "통판" } });
    expect(screen.getByText("통판서클")).toBeTruthy();
    expect(screen.queryByText("부스서클")).toBeNull();
  });

  it("persists a 통판 visit check to per-event storage", async () => {
    render(<App />);
    await screen.findByText("통판서클");
    const checkBtn = screen.getAllByLabelText("방문 체크")[1]; // 통판 is second
    fireEvent.click(checkBtn);
    await waitFor(() => expect(screen.getAllByLabelText("방문 체크 해제").length).toBeGreaterThan(0));
    const stored = JSON.parse(localStorage.getItem("gbc-seoko-checks:ev") || "{}");
    expect(Object.values(stored).some(Boolean)).toBe(true);
  });
});
