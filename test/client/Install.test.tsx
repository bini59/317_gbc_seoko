// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { InstallBanner, InstallGuide } from "../../src/components/InstallGuide";
import { useInstallPrompt, type InstallState } from "../../src/hooks/useInstallPrompt";

function Harness() {
  const install = useInstallPrompt();
  return (
    <>
      <InstallBanner install={install} />
      <div data-testid="installed">{String(install.isInstalled)}</div>
    </>
  );
}

function deferredPrompt(outcome: "accepted" | "dismissed") {
  const event = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
    prompt: ReturnType<typeof vi.fn>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  };
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome });
  return event;
}

const noPrompt: InstallState = {
  isInstalled: false,
  canPrompt: false,
  promptInstall: vi.fn(),
};

describe("PWA install guidance", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("defers the supported browser prompt until the user clicks install", async () => {
    render(<Harness />);
    const event = deferredPrompt("accepted");
    window.dispatchEvent(event);

    const button = await screen.findByRole("button", { name: "홈 화면에 추가" });
    expect(event.prompt).not.toHaveBeenCalled();
    fireEvent.click(button);

    await waitFor(() => expect(event.prompt).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("installed").textContent).toBe("true");
    expect(screen.queryByRole("button", { name: "홈 화면에 추가" })).toBeNull();
  });

  it("keeps the guidance visible when the install prompt is dismissed", async () => {
    render(<Harness />);
    const event = deferredPrompt("dismissed");
    window.dispatchEvent(event);
    fireEvent.click(await screen.findByRole("button", { name: "홈 화면에 추가" }));

    await waitFor(() => expect(event.prompt).toHaveBeenCalledTimes(1));
    expect(screen.getByText("홈 화면에 추가하는 방법")).toBeTruthy();
    expect(screen.getByTestId("installed").textContent).toBe("false");
  });

  it("shows manual platform steps without requiring browser install APIs", () => {
    render(<InstallGuide install={noPrompt} />);

    expect(screen.queryByRole("button", { name: "홈 화면에 추가" })).toBeNull();
    expect(screen.getByText("iPhone Safari에서 공유 버튼 선택")).toBeTruthy();
    expect(screen.getByText("추가 완료")).toBeTruthy();
    expect(screen.getByText("Android Chrome 메뉴(⋮)에서 홈 화면에 추가 선택")).toBeTruthy();
  });

  it("hides install calls when the app is already running standalone", () => {
    render(<InstallGuide install={{ ...noPrompt, isInstalled: true }} />);

    expect(screen.getByText("홈 화면에 추가됨")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "홈 화면에 추가" })).toBeNull();
  });

  it("detects standalone mode from the display-mode media query", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    render(<Harness />);

    expect(screen.getByTestId("installed").textContent).toBe("true");
    expect(screen.queryByRole("heading", { name: "홈 화면에 추가하는 방법" })).toBeNull();
  });

  it("marks the app installed when the browser emits appinstalled", async () => {
    render(<Harness />);
    window.dispatchEvent(new Event("appinstalled"));

    await waitFor(() => expect(screen.getByTestId("installed").textContent).toBe("true"));
    expect(screen.queryByRole("heading", { name: "홈 화면에 추가하는 방법" })).toBeNull();
  });

  it("stores the event-list card dismissal independently", () => {
    const { unmount } = render(<InstallBanner install={noPrompt} />);
    fireEvent.click(screen.getByRole("button", { name: "설치 안내 닫기" }));
    expect(localStorage.getItem("gbc-seoko-install-banner-dismissed")).toBe("true");

    unmount();
    render(<InstallBanner install={noPrompt} />);
    expect(screen.queryByText(/앱처럼 빠르게 열 수 있어요/)).toBeNull();
    expect(screen.queryByText("Safari의 공유 버튼 선택")).toBeNull();
  });
});
