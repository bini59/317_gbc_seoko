import { useQuery } from "@tanstack/react-query";
import { InstallBanner } from "../components/InstallGuide";
import type { InstallState } from "../hooks/useInstallPrompt";
import { eventsQuery } from "../lib/queries";
import { eventSubtitle } from "../lib/event";

export function EventsScreen({ install, onOpenSettings, wishlist = [], onToggleWishlist }: { install: InstallState; onOpenSettings: () => void; wishlist?: string[]; onToggleWishlist?: (slug: string) => void }) {
  const { data: events = [], error, isFetching } = useQuery(eventsQuery());
  const loadError = error instanceof Error ? error.message : error ? "불러오기 실패" : null;
  const wishlistMatches = events
    .filter((event) => wishlist.includes(event.slug))
    .sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? ""));

  return (
    <div className="px-5 pt-7 pb-2 md:px-8 md:py-10">
      <h1 className="text-[26px] font-extrabold text-ink">행사 선택</h1>
      <p className="mt-2 text-sm text-muted">방문할 행사를 골라 관심 서클을 확인하세요.</p>
      <InstallBanner install={install} onOpenSettings={onOpenSettings} />
      {loadError ? <div role="alert" className="mt-8 text-sm text-danger">{loadError}</div> : null}
      {!isFetching && !loadError && events.length === 0 ? <div className="py-14 text-center text-sm text-faint">등록된 행사가 없어요</div> : null}
      {!loadError && wishlistMatches.length > 0 && (
        <section className="mt-6 md:mt-8">
          <h2 className="mb-2 text-xs font-extrabold tracking-[0.04em] text-faint">내 위시리스트</h2>
          <div className="flex flex-col gap-3 md:gap-1">
            {wishlistMatches.map((candidate) => (
              <div
                key={`screen-wishlist-${candidate.slug}`}
                className="block rounded-[18px] border border-line bg-card p-4 md:rounded-[10px] md:border-transparent md:px-3 md:py-2 md:bg-transparent md:hover:bg-chip"
              >
                <div className="flex items-center gap-1.5">
                  <a href={`#/events/${encodeURIComponent(candidate.slug)}`} className="min-w-0 flex-1 no-underline text-[17px] font-extrabold text-ink md:text-sm">
                    {candidate.title}
                  </a>
                  {onToggleWishlist && (
                    <button
                      type="button"
                      onClick={() => onToggleWishlist(candidate.slug)}
                      aria-pressed={true}
                      aria-label={`${candidate.title} 행사 찜 해제`}
                      className="ml-auto flex items-center justify-center w-11 h-11 md:w-8 md:h-8 rounded-xl md:rounded-lg text-lg md:text-base border border-transparent hover:border-line hover:bg-chip cursor-pointer text-amber-500 shrink-0"
                    >
                      ★
                    </button>
                  )}
                </div>
                <div className="mt-1 text-xs font-semibold text-faint md:mt-0.5 md:text-[11px]">{eventSubtitle(candidate)}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
