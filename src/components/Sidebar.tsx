import type { ApiEvent, AuthUser } from "../api";
import { Settings, type Theme } from "./Settings";
import { eventSubtitle } from "../lib/event";

const EVENT_SECTIONS = [
  { status: "active", label: "진행 중" },
  { status: "upcoming", label: "예정" },
  { status: "past", label: "지난 행사" },
] as const;

/** 행사 목록(진행 중/예정/지난). 데스크톱 사이드바와 모바일 행사 시트가 공유한다. */
export function EventList({ events, currentSlug }: { events: ApiEvent[]; currentSlug: string | null }) {
  return EVENT_SECTIONS.map(({ status, label }) => {
    const matches = events
      .filter((event) => event.status === status)
      .sort((a, b) => {
        const comparison = (a.start_date ?? "").localeCompare(b.start_date ?? "");
        return status === "past" ? -comparison : comparison;
      });
    if (matches.length === 0) return null;
    return (
      <section key={status} className="mt-6 md:mt-5">
        <h2 className="mb-2 text-xs font-extrabold tracking-[0.04em] text-faint">{label}</h2>
        <div className="flex flex-col gap-3 md:gap-1">
          {matches.map((candidate) => {
            const current = candidate.slug === currentSlug;
            return (
              <a
                key={candidate.slug}
                href={`#/events/${encodeURIComponent(candidate.slug)}`}
                aria-current={current ? "page" : undefined}
                className={
                  "block rounded-[18px] border p-4 no-underline md:rounded-[10px] md:border-transparent md:px-3 md:py-2 " +
                  (current ? "border-accent/40 bg-accent/10" : "border-line bg-card md:bg-transparent md:hover:bg-chip")
                }
              >
                <div className={"flex items-center gap-1.5 text-[17px] font-extrabold md:text-sm " + (current ? "text-accent" : "text-ink")}>
                  {current ? <span aria-hidden="true">✓</span> : null}
                  {candidate.title}
                </div>
                <div className="mt-1 text-xs font-semibold text-faint md:mt-0.5 md:text-[11px]">{eventSubtitle(candidate)}</div>
              </a>
            );
          })}
        </div>
      </section>
    );
  });
}

/**
 * 데스크톱(md+) 좌측 사이드바: 브랜드 · 행사 목록 · 하단 설정(기기 간 연동 포함, #45).
 * 모바일에서는 행사 선택 화면(루트)에서만 본문 아래에 인라인으로 노출된다.
 */
export function Sidebar({
  events,
  currentSlug,
  showOnMobile,
  authEnabled,
  user,
  syncedAt,
  eventTitle,
  theme,
  onTheme,
  onLogout,
  onReset,
}: {
  events: ApiEvent[];
  currentSlug: string | null;
  showOnMobile: boolean;
  authEnabled: boolean;
  user: AuthUser | null;
  syncedAt: number | null;
  eventTitle: string | null;
  theme: Theme;
  onTheme: (next: Theme) => void;
  onLogout: () => void;
  onReset: () => void;
}) {
  return (
    <aside
      className={
        (showOnMobile ? "flex flex-1 order-last" : "hidden") +
        " w-full max-w-[560px] mx-auto flex-col border-x border-line md:order-none md:flex md:max-w-none md:mx-0 md:sticky md:top-0 md:h-screen md:overflow-y-auto md:border-x-0 md:border-r md:bg-card/40"
      }
    >
      <div className="hidden px-5 md:block md:pt-6">
        <a href="#/" className="text-sm font-extrabold text-accent no-underline">걸즈밴드 체크리스트</a>
      </div>
      <nav aria-label="행사" className="flex-1 px-5 pb-6">
        <EventList events={events} currentSlug={currentSlug} />
      </nav>
      {/* 설정 — native <details>: 팝오버 상태/포커스 코드 없이 인라인 펼침 */}
      <details className="border-t border-line px-5 py-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </svg>
          설정
        </summary>
        <div className="mt-3">
          <Settings authEnabled={authEnabled} user={user} syncedAt={syncedAt} eventTitle={eventTitle} theme={theme} onTheme={onTheme} onLogout={onLogout} onReset={onReset} />
        </div>
      </details>
    </aside>
  );
}
