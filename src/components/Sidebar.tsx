import { useQuery } from "@tanstack/react-query";
import { eventsQuery } from "../lib/queries";
import type { ApiEvent } from "../api";
import { eventHash } from "../lib/route";
import { eventSubtitle } from "../lib/event";

const EVENT_SECTIONS = [
  { status: "active", label: "진행 중" },
  { status: "upcoming", label: "예정" },
  { status: "past", label: "지난 행사" },
] as const;

/** 행사 목록(진행 중/예정/지난). 데스크톱 사이드바와 모바일 행사 시트가 공유한다. */
export function EventList({ events, currentSlug, wishlist = [], onToggleWishlist }: { events: ApiEvent[]; currentSlug: string | null; wishlist?: string[]; onToggleWishlist?: (slug: string) => void }) {
  const wishlistMatches = events
    .filter((event) => wishlist.includes(event.slug))
    .sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? ""));

  return (
    <>
      {wishlistMatches.length > 0 && (
        <section key="wishlist" className="mt-4 md:mt-5">
          <h2 className="mb-2 text-xs font-extrabold tracking-[0.04em] text-faint">찜한 행사</h2>
          <div className="flex flex-col gap-2 md:gap-1">
            {wishlistMatches.map((candidate) => {
              const current = candidate.slug === currentSlug;
              return (
                <div
                  key={`wishlist-${candidate.slug}`}
                  className={
                    "block rounded-[14px] border px-3.5 py-3 md:rounded-[10px] md:border-transparent md:px-3 md:py-2 " +
                    (current ? "border-accent/40 bg-accent/10" : "border-line bg-card md:bg-transparent md:hover:bg-chip")
                  }
                >
                  <div className="flex items-center gap-1.5">
                    <a href={eventHash(candidate.slug)} aria-current={current ? "page" : undefined} className={"min-w-0 flex-1 no-underline text-[15px] font-extrabold md:text-sm " + (current ? "text-accent" : "text-ink")}>
                      {current ? <span aria-hidden="true">✓</span> : null}
                      {candidate.title}
                    </a>
                    {onToggleWishlist && (
                      <button
                        type="button"
                        onClick={() => onToggleWishlist(candidate.slug)}
                        aria-pressed={true}
                        aria-label={`${candidate.title} 행사 찜 해제`}
                        className="ml-auto flex items-center justify-center w-9 h-9 md:w-8 md:h-8 rounded-lg text-base md:text-base border border-transparent hover:border-line hover:bg-chip cursor-pointer text-amber-500 shrink-0"
                      >
                        ★
                      </button>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] font-semibold text-faint md:mt-0.5 md:text-[11px]">{eventSubtitle(candidate)}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}
      {EVENT_SECTIONS.map(({ status, label }) => {
        const matches = events
          .filter((event) => event.status === status && !wishlist.includes(event.slug))
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
                const isStarred = wishlist.includes(candidate.slug);
                return (
                  <div
                    key={candidate.slug}
                    className={
                      "block rounded-[14px] border px-3.5 py-3 md:rounded-[10px] md:border-transparent md:px-3 md:py-2 " +
                      (current ? "border-accent/40 bg-accent/10" : "border-line bg-card md:bg-transparent md:hover:bg-chip")
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      <a href={eventHash(candidate.slug)} aria-current={current ? "page" : undefined} className={"min-w-0 flex-1 no-underline text-[15px] font-extrabold md:text-sm " + (current ? "text-accent" : "text-ink")}>
                        {current ? <span aria-hidden="true">✓</span> : null}
                        {candidate.title}
                      </a>
                      {onToggleWishlist && (
                        <button
                          type="button"
                          onClick={() => onToggleWishlist(candidate.slug)}
                          aria-pressed={isStarred}
                          aria-label={`${candidate.title} 행사 찜 ${isStarred ? "해제" : "하기"}`}
                          className={
                            "ml-auto flex items-center justify-center w-9 h-9 md:w-8 md:h-8 rounded-lg text-base md:text-base border border-transparent hover:border-line hover:bg-chip cursor-pointer shrink-0 " +
                            (isStarred ? "text-amber-500" : "text-faint hover:text-muted")
                          }
                        >
                          {isStarred ? "★" : "☆"}
                        </button>
                      )}
                    </div>
                    <div className="mt-0.5 text-[11px] font-semibold text-faint md:mt-0.5 md:text-[11px]">{eventSubtitle(candidate)}</div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}

/**
 * 데스크톱(md+) 좌측 사이드바: 브랜드 · 행사 목록 · 설정 페이지 진입점.
 * 모바일에서는 행사 선택 화면(루트)에서만 본문 아래에 인라인으로 노출된다.
 */
export function Sidebar({
  currentSlug,
  wishlist = [],
  onToggleWishlist,
  showOnMobile,
  settingsActive,
  wishlistActive,
  onWishlist,
  onSettings,
}: {
  currentSlug: string | null;
  wishlist?: string[];
  onToggleWishlist?: (slug: string) => void;
  showOnMobile: boolean;
  settingsActive: boolean;
  wishlistActive: boolean;
  onWishlist: () => void;
  onSettings: () => void;
}) {
  const { data: events = [] } = useQuery(eventsQuery());
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
        <a href="#/wishlist" onClick={(e) => { e.preventDefault(); onWishlist(); }} aria-current={wishlistActive ? "page" : undefined} className={(wishlistActive ? "bg-accent/10 text-accent " : "text-muted ") + "mt-5 flex items-center gap-2 rounded-[10px] px-3 py-2.5 text-sm font-extrabold no-underline hover:bg-chip hover:text-ink"}>
          <span aria-hidden="true">★</span>
          찜목록
          {wishlist.length > 0 ? <span className="ml-auto text-xs font-bold">{wishlist.length}</span> : null}
        </a>
        <EventList events={events} currentSlug={currentSlug} wishlist={wishlist} onToggleWishlist={onToggleWishlist} />
      </nav>
      <div className={(showOnMobile ? "hidden md:block " : "") + "border-t border-line px-5 py-4"}>
        <a href="#/settings" onClick={(e) => { e.preventDefault(); onSettings(); }} aria-current={settingsActive ? "page" : undefined} className={(settingsActive ? "bg-accent/10 text-accent " : "text-muted ") + "flex items-center gap-2 rounded-[10px] px-3 py-2.5 text-xs font-semibold no-underline hover:bg-chip hover:text-ink"}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </svg>
          설정
        </a>
      </div>
    </aside>
  );
}
