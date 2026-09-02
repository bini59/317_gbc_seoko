import { useState } from "react";
import type { InstallState } from "../hooks/useInstallPrompt";

export const INSTALL_BANNER_DISMISSED_KEY = "gbc-seoko-install-banner-dismissed";

function readBannerDismissed() {
  try {
    return localStorage.getItem(INSTALL_BANNER_DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

function saveBannerDismissed() {
  try { localStorage.setItem(INSTALL_BANNER_DISMISSED_KEY, "true"); } catch { /* private mode */ }
}

const buttonCls = "inline-flex h-9 items-center justify-center rounded-full bg-ink px-4 text-[13px] font-bold text-bg";

function ManualSteps() {
  return (
    <div className="grid gap-2.5 rounded-[12px] border border-line bg-card p-3.5 text-[13px] text-muted">
      <div className="font-bold text-ink">브라우저에서 직접 추가하기</div>
      <ol className="m-0 grid gap-2 pl-5">
        <li>iPhone Safari에서 공유 버튼 선택</li>
        <li>홈 화면에 추가 선택</li>
        <li>추가 완료</li>
        <li>Android Chrome 메뉴(⋮)에서 홈 화면에 추가 선택</li>
        <li>다른 브라우저도 메뉴에서 홈 화면에 추가 또는 앱 설치 선택</li>
      </ol>
    </div>
  );
}

export function InstallGuide({ install }: { install: InstallState }) {
  return (
    <section aria-labelledby="install-guide-title" className="grid gap-2.5">
      <h3 id="install-guide-title" className="text-xs font-extrabold tracking-[0.04em] text-faint">홈 화면에 추가</h3>
      {install.isInstalled ? (
        <div role="status" className="rounded-[14px] border border-accent/30 bg-accent/10 px-3.5 py-3 text-[13px] font-semibold text-accent">홈 화면에 추가됨</div>
      ) : (
        <div className="grid gap-3 rounded-[14px] border border-line bg-card p-3.5">
          <p className="m-0 text-[13px] text-muted">홈 화면에 추가하면 행사장에서 앱처럼 빠르게 열 수 있어요.</p>
          {install.canPrompt ? <button type="button" onClick={() => void install.promptInstall()} className={buttonCls}>홈 화면에 추가</button> : null}
          <ManualSteps />
        </div>
      )}
    </section>
  );
}

export function InstallBanner({ install, onOpenSettings }: { install: InstallState; onOpenSettings?: () => void }) {
  const [dismissed, setDismissed] = useState(readBannerDismissed);

  if (install.isInstalled || dismissed) return null;

  const dismiss = () => {
    saveBannerDismissed();
    setDismissed(true);
  };

  return (
    <section aria-labelledby="install-banner-title" className="mx-5 mt-6 rounded-[16px] border border-accent/30 bg-accent/10 p-4 md:mx-8">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 id="install-banner-title" className="m-0 text-[14px] font-extrabold text-ink">홈 화면에 추가하는 방법</h2>
          <p className="mt-1.5 mb-0 text-[13px] leading-5 text-muted">이 체크리스트를 홈 화면에 추가하면 행사장에서 앱처럼 빠르게 열 수 있어요.</p>
        </div>
        <button type="button" aria-label="설치 안내 닫기" onClick={dismiss} className="shrink-0 text-faint">×</button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {install.canPrompt ? <button type="button" onClick={() => void install.promptInstall()} className={buttonCls}>홈 화면에 추가</button> : null}
        <a href="#/settings" onClick={(event) => { if (onOpenSettings) { event.preventDefault(); onOpenSettings(); } }} className="text-[13px] font-bold text-accent no-underline">설치 방법 자세히 보기</a>
      </div>
    </section>
  );
}
