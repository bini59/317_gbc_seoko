export type Sheet = "search" | "filter" | null;

const ICONS = {
  list: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></>,
  filter: <><path d="M4 7h16M7 12h10M10 17h4" /></>,
  events: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
};

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

function Tab({
  icon, label, active, badge, onClick, ...aria
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
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={badge ? `${label} ${badge}개 적용` : undefined}
      {...aria}
      className={"relative flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[56px] min-w-[44px] text-[11px] font-bold " + (active ? "text-accent" : "text-faint")}
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
  sheet, onSheet, onEvents, searchCount, filterCount,
}: {
  sheet: Sheet;
  onSheet: (next: Sheet) => void;
  onEvents: () => void;
  searchCount: number;
  filterCount: number;
}) {
  const toggle = (s: Exclude<Sheet, null>) => onSheet(sheet === s ? null : s);
  return (
    <nav aria-label="하단 메뉴" className="fixed left-1/2 -translate-x-1/2 w-full max-w-[560px] bottom-0 z-30 flex border-t border-line bg-bg pb-[env(safe-area-inset-bottom)] md:hidden">
      <Tab icon="list" label="목록" active={sheet === null} aria-current={sheet === null ? "page" : undefined} onClick={() => onSheet(null)} />
      <Tab icon="search" label="검색" active={sheet === "search"} badge={searchCount} aria-expanded={sheet === "search"} aria-controls="sheet-search" onClick={() => toggle("search")} />
      <Tab icon="filter" label="필터" active={sheet === "filter"} badge={filterCount} aria-expanded={sheet === "filter"} aria-controls="sheet-filter" onClick={() => toggle("filter")} />
      <Tab icon="events" label="행사" aria-label="행사 목록" active={false} onClick={onEvents} />
    </nav>
  );
}
