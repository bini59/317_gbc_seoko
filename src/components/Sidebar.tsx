import { login, logout, type ApiEvent, type AuthUser } from "../api";
import { eventSubtitle } from "../lib/event";

const EVENT_SECTIONS = [
  { status: "active", label: "진행 중" },
  { status: "upcoming", label: "예정" },
  { status: "past", label: "지난 행사" },
] as const;

function EventList({ events, currentSlug }: { events: ApiEvent[]; currentSlug: string | null }) {
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
                <div className={"text-[17px] font-extrabold md:text-sm " + (current ? "text-accent" : "text-ink")}>{candidate.title}</div>
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
 * 데스크톱(md+) 좌측 사이드바: 브랜드 · 행사 목록 · 하단 동기화(로그인) 진입점.
 * 모바일에서는 행사 선택 화면(루트)에서만 본문 아래에 인라인으로 노출된다.
 */
export function Sidebar({
  events,
  currentSlug,
  showOnMobile,
  authEnabled,
  user,
}: {
  events: ApiEvent[];
  currentSlug: string | null;
  showOnMobile: boolean;
  authEnabled: boolean;
  user: AuthUser | null;
}) {
  return (
    <aside
      className={
        (showOnMobile ? "flex flex-1 order-last" : "hidden") +
        " w-full max-w-[560px] mx-auto flex-col border-x border-line md:order-none md:flex md:max-w-none md:mx-0 md:sticky md:top-0 md:h-screen md:overflow-y-auto md:border-x-0 md:border-r md:bg-card/40"
      }
    >
      <div className="hidden px-5 md:block md:pt-6">
        <a href="#/" className="text-sm font-extrabold text-accent no-underline">동인행사 체크리스트</a>
      </div>
      <nav aria-label="행사" className="flex-1 px-5 pb-6">
        <EventList events={events} currentSlug={currentSlug} />
      </nav>
      {authEnabled ? (
        <div className="border-t border-line px-5 py-4 text-xs text-faint">
          {user ? (
            <div className="flex items-center justify-between gap-2">
              <span className="truncate">{user.name ?? "로그인됨"} · 동기화 중</span>
              <button type="button" onClick={logout} className="shrink-0 font-bold text-muted">로그아웃</button>
            </div>
          ) : (
            <button type="button" onClick={login} className="text-left font-semibold text-muted">
              기기 간 동기화
            </button>
          )}
        </div>
      ) : null}
    </aside>
  );
}
