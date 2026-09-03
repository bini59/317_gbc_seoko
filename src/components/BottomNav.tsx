import { useEffect, useState } from "react";

export type Sheet = "search-filter" | "events" | null;

const ICONS = {
  list: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></>,
  filter: <><path d="M4 7h16M7 12h10M10 17h4" /></>,
  wishlist: <><path d="M20.8 8.9c0 5.5-8.8 10.1-8.8 10.1S3.2 14.4 3.2 8.9A4.7 4.7 0 0 1 12 6.3a4.7 4.7 0 0 1 8.8 2.6Z" /></>,
  events: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
};

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

function Tab({
  icon, label, active, badge, onClick, disabled, ...aria
}: {
  icon: keyof typeof ICONS;
  label: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
  "aria-label"?: string;
  "aria-current"?: "page";
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
  "aria-disabled"?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={badge ? `${label} ${badge}개 적용` : undefined}
      {...aria}
      className={"relative flex flex-1 flex-col items-center justify-center gap-0.5 z-[1] min-h-[52px] min-w-[44px] rounded-full text-[11px] font-bold transition-colors " + (disabled ? "cursor-not-allowed text-muted opacity-50" : active ? "cursor-pointer text-accent" : "cursor-pointer text-muted")}
    >
      <Icon name={icon} />
      {label}
      {badge ? (
        <span aria-hidden="true" className="absolute top-1.5 right-[calc(50%-20px)] min-w-4 h-4 px-1 rounded-full bg-accent text-bg text-[10px] leading-4 text-center">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

/** 모바일 전용 하단 네비 — md 이상은 사이드바/topbar가 대신한다. */
export function BottomNav({
  context, sheet, onSheet, onList, onEvents, onWishlist, wishlistActive, searchCount, filterCount, onSettings,
}: {
  context: "event" | "events" | "settings";
  sheet: Sheet;
  onSheet: (next: Sheet) => void;
  onList: () => void;
  onEvents: () => void;
  onWishlist: () => void;
  wishlistActive: boolean;
  searchCount: number;
  filterCount: number;
  onSettings: () => void;
}) {
  const settingsActive = context === "settings";
  const toggle = (s: Exclude<Sheet, null>) => onSheet(sheet === s ? null : s);
  const tabsCount = 5;
  const activeIndex = settingsActive ? 4 : wishlistActive ? 2 : context === "events" ? 3 : sheet === "search-filter" ? 1 : sheet === "events" ? 3 : 0;
  const [contentOverlaps, setContentOverlaps] = useState(false);
  const listActive = activeIndex === 0;
  const sheetsDisabled = context === "events";
  const listDisabled = context === "events";

  useEffect(() => {
    const nav = document.querySelector<HTMLElement>('nav[aria-label="하단 메뉴"]');
    const content = document.querySelector<HTMLElement>("main");
    if (!nav || !content) return;
    const updateOverlap = () => {
      const navRect = nav.getBoundingClientRect();
      const x = navRect.left + navRect.width / 2;
      const y = navRect.top + navRect.height / 2;
      const previousPointerEvents = nav.style.pointerEvents;
      nav.style.pointerEvents = "none";
      const underlying = document.elementFromPoint(x, y);
      nav.style.pointerEvents = previousPointerEvents;
      setContentOverlaps(underlying instanceof HTMLElement && content.contains(underlying));
    };
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateOverlap);
    resizeObserver?.observe(nav);
    resizeObserver?.observe(content);
    updateOverlap();
    window.addEventListener("resize", updateOverlap);
    window.addEventListener("scroll", updateOverlap, { passive: true });
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateOverlap);
      window.removeEventListener("scroll", updateOverlap);
    };
  }, [context, sheet]);

  return (
    <nav aria-label="하단 메뉴" data-content-overlap={contentOverlaps ? "true" : "false"} className="glass glass-refract fixed left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[536px] bottom-[calc(env(safe-area-inset-bottom)+12px)] z-30 flex rounded-full p-1.5 md:hidden">
      {/* 렌즈 인디케이터 — 탭 사이를 액체처럼 미끄러진다. */}
      <span
        aria-hidden="true"
        className="glass-lens absolute inset-y-1.5 left-1.5"
        style={{ transform: `translateX(${activeIndex * 100}%)`, width: `calc(${100 / tabsCount}% - 2.5px)` }}
      >
        <span key={activeIndex} className="glass-lens-body block h-full w-full rounded-full" />
      </span>
      <Tab icon="list" label="목록" active={listActive && !wishlistActive} aria-current={listActive && !wishlistActive ? "page" : undefined} aria-disabled={listDisabled || undefined} disabled={listDisabled} onClick={onList} />
      <Tab icon="search" label="검색·필터" active={sheet === "search-filter"} badge={searchCount + filterCount} aria-current={sheet === "search-filter" ? "page" : undefined} aria-expanded={sheetsDisabled ? undefined : sheet === "search-filter"} aria-controls={sheetsDisabled ? undefined : "sheet-search-filter"} aria-disabled={sheetsDisabled || undefined} disabled={sheetsDisabled} onClick={() => { if (!sheetsDisabled) toggle("search-filter"); }} />
      <Tab icon="wishlist" label="찜목록" active={wishlistActive} aria-current={wishlistActive ? "page" : undefined} onClick={onWishlist} />
      <Tab icon="events" label="행사" active={sheet === "events" || context === "events"} aria-current={sheet === "events" || context === "events" ? "page" : undefined} aria-expanded={context === "settings" ? undefined : sheet === "events"} aria-controls={context === "settings" ? undefined : "sheet-events"} onClick={() => { if (context === "settings") onEvents(); else if (context !== "events") toggle("events"); }} />
      <Tab icon="settings" label="설정" active={settingsActive} aria-current={settingsActive ? "page" : undefined} onClick={onSettings} />
    </nav>
  );
}
