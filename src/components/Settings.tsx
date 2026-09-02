import { useState } from "react";
import { AUTH_ORIGIN, login, type AuthUser } from "../api";
import { InstallGuide } from "./InstallGuide";
import type { InstallState } from "../hooks/useInstallPrompt";

const ACCOUNT_CENTER_URL = `${AUTH_ORIGIN}/client`;
const ISSUES_URL = "https://github.com/bini59/317_gbc_seoko/issues";

/** 320_archive와 동일 — https 아바타만 허용, 파싱 실패는 null */
function safeAvatarUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function Avatar({ src, fallback }: { src: string | null; fallback: string }) {
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-chip text-[13px] font-semibold text-muted">
      {src ? <img alt="" src={src} width={36} height={36} referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : fallback}
    </span>
  );
}

export type Theme = "system" | "light" | "dark";
const THEMES: { k: Theme; label: string }[] = [
  { k: "system", label: "시스템" },
  { k: "light", label: "라이트" },
  { k: "dark", label: "다크" },
];

function readTheme(): Theme {
  try {
    const t = localStorage.getItem("theme");
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

// index.html 인라인 부트스트랩과 같은 규칙 — system은 속성을 지워 prefers-color-scheme에 맡긴다
function applyTheme(next: Theme) {
  if (next === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = next;
  try { localStorage.setItem("theme", next); } catch { /* private mode */ }
}

/** 테마 상태는 App에서 한 번만 가진다 — 모바일 시트와 사이드바 두 사본이 같은 값을 보도록 */
export function useTheme(): [Theme, (next: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(readTheme);
  return [theme, (next) => { applyTheme(next); setTheme(next); }];
}

const svgProps = { viewBox: "0 0 24 24", width: 14, height: 14, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
const External = () => <svg {...svgProps} className="ml-auto shrink-0 text-faint"><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></svg>;

const headingCls = "text-xs font-extrabold tracking-[0.04em] text-faint";
const rowCls = "flex w-full items-center gap-2 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-semibold no-underline hover:bg-chip ";
const primaryBtn = "inline-flex h-9 items-center rounded-full bg-ink px-4 text-[13px] font-bold text-bg";

/**
 * 설정 패널(#45): 기기 간 연동 · 화면 · 정보.
 * 모바일 시트와 데스크톱 사이드바 <details>가 같은 컴포넌트를 감싼다 — DOM id를 두지 않는다(두 사본 공존).
 */
export function Settings({
  authEnabled,
  user,
  syncedAt,
  theme,
  onTheme,
  onLogout,
  install,
}: {
  authEnabled: boolean;
  user: AuthUser | null;
  syncedAt: number | null;
  theme: Theme;
  onTheme: (next: Theme) => void;
  onLogout: () => void;
  install: InstallState;
}) {

  const displayName = user?.name ?? user?.email ?? "사용자";
  const fallback = [...displayName][0]?.toUpperCase() ?? "?";
  const savedAt = syncedAt ? new Date(syncedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <div className="grid gap-6 text-ink">
      {authEnabled ? (
        <section className="grid gap-2.5">
          <h3 className={headingCls}>기기 간 연동</h3>
          {user ? (
            <div className="rounded-[14px] border border-line bg-card">
              <div className="flex items-center gap-3 border-b border-line px-3.5 py-3">
                <Avatar src={safeAvatarUrl(user.avatarUrl)} fallback={fallback} />
                <span className="grid min-w-0">
                  <strong className="truncate text-[14px] font-semibold">{displayName}</strong>
                  {user.email ? <span className="truncate text-[12px] text-faint">{user.email}</span> : null}
                  <span className="mt-0.5 text-[11.5px] font-semibold text-accent">동기화 중{savedAt ? ` · 마지막 저장 ${savedAt}` : ""}</span>
                </span>
              </div>
              <div className="grid gap-0.5 p-1.5">
                <a href={ACCOUNT_CENTER_URL} target="_blank" rel="noreferrer noopener" className={rowCls + "text-muted hover:text-ink"}>
                  <span>계정센터<span className="sr-only"> (새 창)</span></span>
                  <External />
                </a>
                <button type="button" onClick={onLogout} className={rowCls + "text-danger hover:bg-danger/10"}>연동 해제</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-[14px] border border-line bg-card px-3.5 py-3">
              <p className="m-0 break-keep text-[13px] text-muted">로그인하면 방문 체크가 다른 기기와 동기화돼요</p>
              <button type="button" onClick={login} className={primaryBtn + " shrink-0"}>연동하기</button>
            </div>
          )}
        </section>
      ) : null}

      <InstallGuide install={install} />

      <section className="grid gap-2.5">
        <h3 className={headingCls}>화면</h3>
        <div role="group" aria-label="테마" className="grid grid-cols-3 gap-1 rounded-[10px] border border-line bg-card p-1">
          {THEMES.map((t) => (
            <button
              key={t.k}
              type="button"
              aria-pressed={theme === t.k}
              onClick={() => onTheme(t.k)}
              className={"h-8 rounded-[7px] text-[13px] font-semibold " + (theme === t.k ? "bg-ink text-bg" : "text-muted hover:bg-chip")}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-2.5">
        <h3 className={headingCls}>정보</h3>
        <div className="rounded-[14px] border border-line bg-card p-1.5">
          <div className={rowCls + "text-muted"}>앱 버전<span className="ml-auto text-faint">v{import.meta.env.VITE_APP_VERSION ?? "dev"}</span></div>
          <a href={ISSUES_URL} target="_blank" rel="noreferrer noopener" className={rowCls + "text-muted hover:text-ink"}>
            <span>문의·피드백<span className="sr-only"> (새 창)</span></span>
            <External />
          </a>
        </div>
      </section>
    </div>
  );
}
