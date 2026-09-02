// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Settings, useTheme } from "../../src/components/Settings";
import type { InstallState } from "../../src/hooks/useInstallPrompt";

vi.mock("../../src/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/api")>()),
  login: vi.fn(),
}));
import { login } from "../../src/api";

const USER = { userId: "u1", email: "seoko@example.com", name: "세오코", avatarUrl: null };
const noop = () => {};
const noInstall: InstallState = { isInstalled: false, canPrompt: false, promptInstall: vi.fn() };
const base = { authEnabled: true, user: null, syncedAt: null, theme: "system" as const, onTheme: noop, onLogout: noop, install: noInstall };

/** 실제 배선과 동일 — 테마 상태는 부모(App)의 useTheme가 들고 내려준다 */
function Themed(props: Partial<Parameters<typeof Settings>[0]>) {
  const [theme, onTheme] = useTheme();
  return <Settings {...base} {...props} theme={theme} onTheme={onTheme} />;
}

describe("<Settings/>", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("hides the sync section entirely when auth is disabled but keeps 화면/데이터/정보", () => {
    render(<Settings {...base} authEnabled={false} />);
    expect(screen.queryByRole("button", { name: "연동하기" })).toBeNull();
    expect(screen.queryByRole("button", { name: "연동 해제" })).toBeNull();
    expect(screen.queryByText("기기 간 연동")).toBeNull();
    expect(screen.getByRole("group", { name: "테마" })).toBeTruthy();
    expect(screen.queryByText("데이터")).toBeNull();
    expect(screen.getByText(/앱 버전/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /문의·피드백/ }).getAttribute("href")).toBe("https://github.com/bini59/317_gbc_seoko/issues");
  });

  it("signed out: explains sync and calls login() from 연동하기 (#30: no feature-limit copy)", () => {
    render(<Settings {...base} />);
    expect(screen.getByText("로그인하면 방문 체크가 다른 기기와 동기화돼요")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "연동하기" }));
    expect(login).toHaveBeenCalledTimes(1);
  });

  it("signed in: shows profile, sync status, account center, and calls onLogout from 연동 해제 (#34)", () => {
    const onLogout = vi.fn();
    render(<Settings {...base} user={USER} syncedAt={new Date(2026, 8, 2, 14, 5).getTime()} onLogout={onLogout} />);
    expect(screen.getByText("세오코")).toBeTruthy();
    expect(screen.getByText("seoko@example.com")).toBeTruthy();
    expect(screen.getByText(/동기화 중 · 마지막 저장/)).toBeTruthy();
    const link = screen.getByRole("link", { name: /계정센터/ });
    expect(link.getAttribute("href")).toBe("https://auth.bini59.dev/client");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(screen.queryByRole("button", { name: "연동하기" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "연동 해제" }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("renders only https avatars, falling back to the initial otherwise", () => {
    const { unmount } = render(<Settings {...base} user={{ ...USER, avatarUrl: "http://evil.example/a.png" }} />);
    expect(document.querySelector("img")).toBeNull();
    expect(screen.getByText("세")).toBeTruthy();
    unmount();
    render(<Settings {...base} user={{ ...USER, avatarUrl: "https://cdn.example/a.png" }} />);
    expect(document.querySelector("img")?.getAttribute("src")).toBe("https://cdn.example/a.png");
  });

  it("theme segment writes data-theme + localStorage and 시스템 clears the attribute", () => {
    render(<Themed />);
    expect(screen.getByRole("button", { name: "시스템" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "다크" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(screen.getByRole("button", { name: "다크" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "시스템" }));
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(localStorage.getItem("theme")).toBe("system");
  });

  it("restores the saved theme on remount (survives reload)", () => {
    localStorage.setItem("theme", "light");
    render(<Themed />);
    expect(screen.getByRole("button", { name: "라이트" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("shows the manual home-screen installation guide when prompting is unavailable", () => {
    render(<Settings {...base} />);
    expect(screen.getByRole("heading", { name: "홈 화면에 추가" })).toBeTruthy();
    expect(screen.getByText("iPhone Safari에서 공유 버튼 선택")).toBeTruthy();
    expect(screen.getByText("Android Chrome 메뉴(⋮)에서 홈 화면에 추가 선택")).toBeTruthy();
  });

  it("shows the installed state without a call to action", () => {
    render(<Settings {...base} install={{ ...noInstall, isInstalled: true }} />);
    expect(screen.getByText("홈 화면에 추가됨")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "홈 화면에 추가" })).toBeNull();
  });

});
