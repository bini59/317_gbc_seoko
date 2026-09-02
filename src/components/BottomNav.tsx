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
      className={"relative flex flex-1 flex-col items-center justify-center gap-0.5 z-[1] min-h-[52px] min-w-[44px] rounded-full text-[11px] font-bold transition-colors " + (active ? "text-accent" : "text-muted")}
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
  const activeIndex = sheet === "search" ? 1 : sheet === "filter" ? 2 : 0;
  return (
    <nav aria-label="하단 메뉴" className="glass glass-refract fixed left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[536px] bottom-[calc(env(safe-area-inset-bottom)+12px)] z-30 flex rounded-full p-1.5 md:hidden">
      {/* 렌즈 인디케이터 — 탭 사이를 액체처럼 미끄러진다. 행사 탭은 라우팅이라 인디케이터 없음. ponytail: 탭 4개 고정(w = (100%-패딩)/4) */}
      <span
        aria-hidden="true"
        className="glass-lens absolute inset-y-1.5 left-1.5 w-[calc(25%-3px)]"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      >
        <span key={activeIndex} className="glass-lens-body block h-full w-full rounded-full" />
      </span>
      <Tab icon="list" label="목록" active={sheet === null} aria-current={sheet === null ? "page" : undefined} onClick={() => onSheet(null)} />
      <Tab icon="search" label="검색" active={sheet === "search"} badge={searchCount} aria-expanded={sheet === "search"} aria-controls="sheet-search" onClick={() => toggle("search")} />
      <Tab icon="filter" label="필터" active={sheet === "filter"} badge={filterCount} aria-expanded={sheet === "filter"} aria-controls="sheet-filter" onClick={() => toggle("filter")} />
      <Tab icon="events" label="행사" aria-label="행사 목록" active={false} onClick={onEvents} />
    </nav>
  );
}
