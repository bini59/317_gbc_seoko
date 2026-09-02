import { useEffect, useId, useRef, useState } from "react";
import { logout, type AuthUser } from "../api";

const ACCOUNT_CENTER_URL = "https://auth.bini59.dev/client";

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

function Avatar({ src, fallback, className = "" }: { src: string | null; fallback: string; className?: string }) {
  return (
    <span className={"grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-chip text-[11.5px] font-semibold text-muted " + className}>
      {src ? <img alt="" src={src} className="h-full w-full object-cover" /> : fallback}
    </span>
  );
}

const ICON = "shrink-0";
const svgProps = { viewBox: "0 0 24 24", width: 16, height: 16, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

/**
 * 아바타 트리거 + 드롭다운(role="menu"). 320_archive `ProfileMenu` 포팅 — 키보드/포커스/aria 동작 동일.
 * 사이드바 하단에서 위로 열린다(모바일 루트 화면에선 인라인 렌더).
 */
export function ProfileMenu({ user }: { user: AuthUser }) {
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const wasOpen = useRef(false);

  const displayName = user.name ?? user.email ?? "사용자";
  const fallback = displayName.slice(0, 1).toUpperCase();
  const avatarUrl = safeAvatarUrl(user.avatarUrl);

  useEffect(() => {
    if (!open) {
      if (wasOpen.current) triggerRef.current?.focus();
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" && event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
      if (!items.length) return;
      const current = items.indexOf(document.activeElement as HTMLElement);
      const forward = event.key === "ArrowDown" || (event.key === "Tab" && !event.shiftKey);
      event.preventDefault();
      items[(current + (forward ? 1 : -1) + items.length) % items.length].focus();
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const itemCls = "flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-left text-[13px] no-underline hover:bg-chip ";

  return (
    <div ref={containerRef} className="relative flex items-center gap-2.5 min-w-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label="프로필 메뉴"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="flex min-w-0 items-center gap-2.5 rounded-full text-left"
      >
        <Avatar src={avatarUrl} fallback={fallback} className="hover:border-line-strong" />
        <span className="truncate text-xs font-semibold text-muted">{displayName}</span>
      </button>
      {open ? (
        <div id={menuId} ref={menuRef} role="menu" aria-label="프로필 메뉴" className="absolute bottom-full left-0 z-40 mb-2 w-[232px] overflow-hidden rounded-[10px] border border-line-strong bg-card shadow-lg">
          <div className="flex items-center gap-2.5 border-b border-line px-3 py-2.5">
            <Avatar src={avatarUrl} fallback={fallback} />
            <span className="grid min-w-0">
              <strong className="truncate text-[12.5px] font-semibold text-ink">{displayName}</strong>
              {user.email ? <span className="truncate text-[11px] text-faint">{user.email}</span> : null}
            </span>
          </div>
          <div className="grid gap-0.5 p-1.5">
            <a role="menuitem" href={ACCOUNT_CENTER_URL} target="_blank" rel="noreferrer noopener" onClick={() => setOpen(false)} className={itemCls + "text-muted hover:text-ink"}>
              <svg {...svgProps} className={ICON}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
              <span>계정센터</span>
              <svg {...svgProps} width={13} height={13} className={ICON + " ml-auto text-faint"}><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></svg>
            </a>
            <button role="menuitem" type="button" onClick={logout} className={itemCls + "text-[#e0455c] hover:bg-[#e0455c]/10"}>
              <svg {...svgProps} className={ICON}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
