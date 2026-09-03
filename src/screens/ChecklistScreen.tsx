import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ApiEvent } from "../api";
import { badgeColor, filterCircles, STATUS } from "../lib/circle";
import type { Checks } from "../lib/checks";
import { eventSubtitle } from "../lib/event";
import { circlesQuery as circlesOptions, eventsQuery as eventsOptions } from "../lib/queries";
import { Card } from "../components/Card";
import { Detail } from "../components/Detail";
import { EventList } from "../components/Sidebar";
import type { Sheet } from "../components/BottomNav";
import type { ChecklistFilters } from "../hooks/useChecklistFilters";

type Props = {
  /** 라우트가 가리키는 행사. events 로딩 중이거나 slug가 없으면 null. */
  event: ApiEvent | null;
  circleSlug: string | null;
  checks: Checks;
  onToggle: (id: string) => void;
  filters: ChecklistFilters;
  /** 열린 시트. 부모(쉘)가 하단 네비와 함께 소유한다 — 상세 라우트에서는 null로 내려온다. */
  sheet: Sheet;
  onSheet: (next: Sheet) => void;
  onOpenEvent: (eventSlug: string) => void;
  onOpenCircle: (eventSlug: string, circleSlug: string) => void;
  wishlist?: import("../types").CircleWishlistMap;
  onToggleStar?: (id: string) => void;
  onUpdateMemo?: (id: string, memo: string) => void;
  eventWishlist?: string[];
  onToggleEventWishlist?: (slug: string) => void;
};

const statusChip = (active: boolean) =>
  "inline-flex items-center h-[32px] px-3 rounded-[8px] text-[13px] font-medium cursor-pointer whitespace-nowrap border " +
  (active ? "bg-ink text-bg border-ink" : "bg-card text-muted border-line");
const genreChip = (active: boolean) =>
  "inline-flex items-center h-7 px-2.5 rounded-full text-[12px] font-medium cursor-pointer whitespace-nowrap border " +
  (active ? "bg-accent/10 text-accent border-accent/30" : "bg-card text-muted border-line");

/** 행사 하나의 체크리스트 화면. 필터/시트 상태는 하단 네비와 공유하므로 쉘이 소유하고 props로 받는다. */
export function ChecklistScreen({
  event, circleSlug, checks, onToggle, filters, sheet, onSheet: setSheet,
  onOpenEvent, onOpenCircle, wishlist = {}, onToggleStar, onUpdateMemo,
  eventWishlist = [], onToggleEventWishlist,
}: Props) {
  const { status, setStatus, selectedIps, setSelectedIps, query, setQuery } = filters;
  const searchRef = useRef<HTMLInputElement>(null);
  const eventSlug = event?.slug ?? null;

  const eventsQuery = useQuery(eventsOptions());
  const events = eventsQuery.data ?? [];
  const circlesQuery = useQuery(circlesOptions(eventSlug));
  const circles = circlesQuery.data?.circles ?? [];
  const witchformExtra = circlesQuery.data?.witchformExtra ?? [];
  const missingEvent = eventsQuery.isSuccess && !event;
  const queryError = eventsQuery.error ?? circlesQuery.error;
  const loadError = missingEvent
    ? "행사 정보를 찾지 못했어요"
    : queryError instanceof Error
      ? queryError.message
      : queryError
        ? "불러오기 실패"
        : null;
  const loading = eventsQuery.isFetching || circlesQuery.isFetching;

  const all = useMemo(() => [...circles, ...witchformExtra], [circles, witchformExtra]);

  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!sheet) { opener.current?.focus(); opener.current = null; return; }
    opener.current = document.activeElement as HTMLElement | null;
    if (sheet === "search") searchRef.current?.focus();
    // 시트가 네비보다 DOM 앞에 있어 Tab으로 못 들어간다 — 첫 항목으로 포커스 이동
    if (sheet === "events") document.querySelector<HTMLElement>(`#sheet-${sheet} a, #sheet-${sheet} button`)?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSheet(null); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [sheet]);

  const doneCount = all.filter((c) => checks[c.id]).length;
  const starCount = all.filter((c) => wishlist[c.id]?.star).length;

  const filtered = useMemo(
    () => filterCircles(all, { checks, status, ips: selectedIps, query, wishlist }),
    [all, checks, status, selectedIps, query, wishlist],
  );
  const boothList = filtered.filter((c) => !c.unlisted);
  const tsuhanList = filtered.filter((c) => c.unlisted);
  const detail = circleSlug ? all.find((c) => c.id === circleSlug) ?? null : null;

  const gridCls = "grid gap-3 md:grid-cols-2 " + (detail ? "" : "xl:grid-cols-3");
  const visibleSheet = sheet;
  const sheetPanel = (s: Exclude<Sheet, null>) =>
    visibleSheet === s
      ? "glass fixed left-1/2 -translate-x-1/2 w-full max-w-[560px] bottom-0 z-20 rounded-t-[28px] border-b-0 px-5 pt-5 pb-[calc(92px+env(safe-area-inset-bottom))] max-h-[75vh] overflow-y-auto "
      : "hidden ";
  const sheetCls = (s: Exclude<Sheet, null>) =>
    sheetPanel(s) + "md:static md:block md:translate-x-0 md:max-w-none md:rounded-none md:border-0 md:bg-transparent md:shadow-none md:backdrop-filter-none md:after:hidden md:p-0 md:max-h-none md:overflow-visible";
  const genres = Array.from(new Set(all.flatMap((circle) => circle.ips ?? []).filter(Boolean))).sort();

  const renderCards = (list: typeof all) => (
    <div className={gridCls}>
      {list.map((c) => (
        <Card
          key={c.id}
          item={c}
          checked={!!checks[c.id]}
          onToggle={() => onToggle(c.id)}
           onOpen={() => eventSlug && onOpenCircle(eventSlug, c.id)}
           color={badgeColor(c.id, all)}
           starred={wishlist[c.id]?.star}
           memo={wishlist[c.id]?.memo}
           onStar={onToggleStar ? () => onToggleStar(c.id) : undefined}
        />
      ))}
    </div>
  );

  return (
    <div className="xl:flex xl:items-start">

      <div className={"min-w-0 flex-1 pb-[calc(88px+env(safe-area-inset-bottom))] md:pb-7 " /* 하단 바 64px + 오프셋 12px + 여백 12px */ + (detail ? "hidden xl:block" : "")}>

        <div className="sticky top-0 z-10 bg-bg px-5 pt-4 pb-3 border-b border-line md:px-8 md:bg-bg/95 md:backdrop-blur">
          <div className="flex items-center justify-between gap-3 md:mb-3 md:gap-6">
            <div className="min-w-0">
              <div className="text-[19px] font-extrabold -tracking-[0.02em] text-ink leading-none truncate">
                {event?.title ?? "걸즈밴드 체크리스트"}
              </div>
              <div className="text-xs font-semibold text-faint mt-[5px] truncate">
                {eventSubtitle(event)}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="text-[12.5px] font-bold text-accent">찜 {starCount} · 방문 {doneCount}/{all.length}</div>
            </div>
          </div>

          {visibleSheet ? <button type="button" aria-label="시트 닫기" onClick={() => setSheet(null)} className="fixed inset-0 z-20 bg-black/40 md:hidden" /> : null}

          <div id="sheet-search" role="group" aria-label="검색" className={sheetCls("search")}>
            <div className="flex items-center gap-2.5 h-12 bg-card border border-line rounded-[14px] px-3.5 md:h-10 md:max-w-[520px]">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#9aa0aa" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4-4" />
              </svg>
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="서클 · 부스 · 장르 · 메모 검색"
                aria-label="서클·부스·장르·메모 검색"
                className="flex-1 min-w-0 border-0 outline-none bg-transparent text-[16px] text-ink placeholder:text-faint"
              />
              {query ? (
                <button onClick={() => setQuery("")} title="검색 초기화" aria-label="검색 초기화" className="flex items-center">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#9aa0aa" strokeWidth="2" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              ) : event?.map_url ? (
                <a href={event.map_url} target="_blank" rel="noopener noreferrer" title="전체 부스배치도" aria-label="전체 부스배치도 (새 창)" className="flex items-center">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#9aa0aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </a>
              ) : null}
            </div>
          </div>

          <div id="sheet-filter" role="group" aria-label="필터" className={sheetCls("filter")}>
            <div className="flex gap-2 md:mt-3.5">
              {STATUS.map((s) => (
                <button key={s.k} onClick={() => setStatus(s.k)} aria-pressed={status === s.k} className={statusChip(status === s.k)}>
                  {s.label}
                </button>
              ))}
            </div>


            <div className="flex flex-wrap gap-2 pt-3 md:pt-4 md:max-h-24 md:overflow-y-auto">
              <button onClick={() => setSelectedIps([])} aria-pressed={selectedIps.length === 0} className={genreChip(selectedIps.length === 0)}>
                전체 장르
              </button>
              {genres.map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedIps((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]))}
                  aria-pressed={selectedIps.includes(g)}
                  className={genreChip(selectedIps.includes(g))}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>


          <div id="sheet-events" role="group" aria-label="행사 전환" onClick={() => setSheet(null)} className={sheetPanel("events") + "md:hidden"}>
            {sheet === "events" ? (
              <>
                <div className="text-xs font-extrabold tracking-[0.04em] text-faint">현재 행사</div>
                <div className="mt-1 text-[17px] font-extrabold text-ink truncate">{event?.title}</div>
                <EventList events={events} currentSlug={eventSlug} wishlist={eventWishlist} onToggleWishlist={onToggleEventWishlist} />
              </>
            ) : null}
          </div>
        </div>

        <div className="px-[22px] pt-3.5 pb-2 text-[12.5px] font-bold text-faint md:px-8">참가 서클 {filtered.length}곳</div>


        <div className="px-5 md:px-8" {...(visibleSheet ? { inert: "" } : {})}>
          {loadError && (
            <div className="text-center py-14" role="alert">
              <div className="text-danger text-sm font-semibold">{loadError}</div>
              <button
                onClick={() => void (eventsQuery.error || missingEvent ? eventsQuery.refetch() : circlesQuery.refetch())}
                disabled={loading}
                className="mt-3 inline-flex items-center h-9 px-4 rounded-full bg-ink text-bg text-[13px] font-bold cursor-pointer border-0 disabled:opacity-60"
              >
                {loading ? "다시 시도 중…" : "다시 시도"}
              </button>
            </div>
          )}
          {!loadError && loading && circles.length === 0 && (
            <div className="text-center py-14 text-[#b0b4bc] text-sm font-semibold">불러오는 중...</div>
          )}
          {!loadError && renderCards(boothList)}


          {!loadError && tsuhanList.length > 0 && (
            <>
              <div className="flex items-center gap-2 mt-7 mb-3.5">
                <span className="text-[12.5px] font-extrabold tracking-[0.04em] text-faint">윗치폼 통판</span>
                <span className="text-[11px] font-bold text-accent">{tsuhanList.length}</span>
                <div className="flex-1 h-px bg-line" />
              </div>
              {renderCards(tsuhanList)}
            </>
          )}

          {!loadError && !loading && filtered.length === 0 && (
            <div className="text-center py-14 text-[#b0b4bc] text-sm font-semibold">조건에 맞는 서클이 없어요</div>
          )}
        </div>
      </div>


      {detail && (
        <section aria-label="서클 상세" className="min-w-0 xl:w-[400px] xl:shrink-0 xl:sticky xl:top-0 xl:h-screen xl:overflow-y-auto xl:border-l xl:border-line">
          <Detail
            item={detail}
            checked={!!checks[detail.id]}
            onToggle={() => onToggle(detail.id)}
            onBack={() => eventSlug && onOpenEvent(eventSlug)}
             color={badgeColor(detail.id, all)}
             starred={wishlist[detail.id]?.star}
             memo={wishlist[detail.id]?.memo}
             onStar={onToggleStar ? () => onToggleStar(detail.id) : undefined}
             onUpdateMemo={onUpdateMemo ? (memo) => onUpdateMemo(detail.id, memo) : undefined}
           />
        </section>
      )}
    </div>
  );
}
