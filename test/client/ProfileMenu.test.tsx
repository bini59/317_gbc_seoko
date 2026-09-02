// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ProfileMenu } from "../../src/components/ProfileMenu";

const logout = vi.fn();

const USER = { userId: "u1", email: "seoko@example.com", name: "세오코", avatarUrl: null };

describe("<ProfileMenu/>", () => {
  afterEach(cleanup);

  it("toggles the menu from the avatar trigger and shows account center + logout", () => {
    render(<ProfileMenu user={USER} onLogout={logout} />);
    const trigger = screen.getByRole("button", { name: /프로필 메뉴/ });
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const link = screen.getByRole("menuitem", { name: /계정센터/ });
    expect(link.getAttribute("href")).toBe("https://auth.bini59.dev/client");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(screen.getByText("seoko@example.com")).toBeTruthy();
    expect(document.activeElement).toBe(link); // 열리면 첫 항목 포커스
    fireEvent.click(trigger);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes on Escape and returns focus to the trigger", () => {
    render(<ProfileMenu user={USER} onLogout={logout} />);
    const trigger = screen.getByRole("button", { name: /프로필 메뉴/ });
    fireEvent.click(trigger);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes on outside pointerdown but not inside", () => {
    render(<div><ProfileMenu user={USER} onLogout={logout} /><p>바깥</p></div>);
    fireEvent.click(screen.getByRole("button", { name: /프로필 메뉴/ }));
    fireEvent.pointerDown(screen.getByRole("menu"));
    expect(screen.getByRole("menu")).toBeTruthy();
    fireEvent.pointerDown(screen.getByText("바깥"));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("cycles focus with ArrowDown/ArrowUp and calls logout", () => {
    render(<ProfileMenu user={USER} onLogout={logout} />);
    fireEvent.click(screen.getByRole("button", { name: /프로필 메뉴/ }));
    const out = screen.getByRole("menuitem", { name: "로그아웃" });
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(document.activeElement).toBe(out);
    fireEvent.keyDown(window, { key: "ArrowDown" }); // 순환
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: /계정센터/ }));
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(out);
    fireEvent.click(out);
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("closes when the account center link is clicked and keeps focus where an outside click landed", () => {
    render(<div><ProfileMenu user={USER} onLogout={logout} /><button>바깥</button></div>);
    const trigger = screen.getByRole("button", { name: /프로필 메뉴/ });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("menuitem", { name: /계정센터/ }));
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(trigger);
    const outside = screen.getByRole("button", { name: "바깥" });
    outside.focus();
    fireEvent.pointerDown(outside);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(outside);
  });

  it("renders only https avatars, falls back to the initial otherwise", () => {
    const { unmount } = render(<ProfileMenu user={{ ...USER, avatarUrl: "http://x/a.png" }} onLogout={logout} />);
    expect(document.querySelector("img")).toBeNull();
    expect(screen.getByRole("button", { name: /프로필 메뉴/ }).textContent).toContain("세");
    unmount();
    render(<ProfileMenu user={{ ...USER, avatarUrl: "https://x/a.png" }} onLogout={logout} />);
    expect(document.querySelector("img")?.getAttribute("src")).toBe("https://x/a.png");
  });
});
