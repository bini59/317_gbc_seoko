import { useEffect, useState } from "react";

export type NavTab = "events" | "list" | "wishlist" | "settings";

const ICONS = {
  events: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  list: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  wishlist: <><path d="M20.8 8.9c0 5.5-8.8 10.1-8.8 10.1S3.2 14.4 3.2 8.9A4.7 4.7 0 0 1 12 6.3a4.7 4.7 0 0 1 8.8 2.6Z" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
};

const TABS: { id: NavTab; label: string }[] = [
  { id: "events", label: "행사" },
  { id: "list", label: "서클" },
  { id: "wishlist", label: "찜목록" },
  { id: "settings", label: "설정" },
];

/** 모바일 전용 하단 네비 — 페이지 이동만 담당한다. md 이상은 사이드바가 대신한다. */
export function BottomNav({ active, disabled = [], onSelect }: { active: NavTab; disabled?: NavTab[]; onSelect: (tab: NavTab) => void }) {
  const activeIndex = TABS.findIndex((t) => t.id === active);
  const [contentOverlaps, setContentOverlaps] = useState(false);

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
      const underlying = typeof document.elementFromPoint === "function" ? document.elementFromPoint(x, y) : null;
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
  }, [active]);

  return (
    <nav aria-label="하단 메뉴" data-content-overlap={contentOverlaps ? "true" : "false"} className="glass glass-refract fixed left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[536px] bottom-[calc(env(safe-area-inset-bottom)+12px)] z-30 flex rounded-full p-1.5 md:hidden">
      {/* 렌즈 인디케이터 — 탭 사이를 액체처럼 미끄러진다. */}
      <span
        aria-hidden="true"
        className="glass-lens absolute inset-y-1.5 left-1.5"
        style={{ transform: `translateX(${activeIndex * 100}%)`, width: `calc(${100 / TABS.length}% - 2.5px)` }}
      >
        <span key={activeIndex} className="glass-lens-body block h-full w-full rounded-full" />
      </span>
      {TABS.map((t) => {
        const isDisabled = disabled.includes(t.id);
        return (
        <button
          key={t.id}
          type="button"
          onClick={() => onSelect(t.id)}
          disabled={isDisabled}
          aria-disabled={isDisabled || undefined}
          aria-current={t.id === active ? "page" : undefined}
          className={"relative flex flex-1 flex-col items-center justify-center gap-0.5 z-[1] min-h-[52px] min-w-[44px] rounded-full text-[11px] font-bold transition-colors " + (isDisabled ? "cursor-not-allowed text-muted opacity-50" : t.id === active ? "cursor-pointer text-accent" : "cursor-pointer text-muted")}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {ICONS[t.id]}
          </svg>
          {t.label}
        </button>
        );
      })}
    </nav>
  );
}
