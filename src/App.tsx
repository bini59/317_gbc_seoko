import { useCallback, useEffect, useMemo, useState } from "react";
import type { Circle } from "./types";
import { fetchCircles, fetchEvents, pickActiveEvent, type ApiEvent } from "./api";
import { badgeColor, filterCircles, STATUS, type Status } from "./lib/circle";
import { useChecks } from "./hooks/useChecks";
import { useAppRoute } from "./hooks/useAppRoute";
import { Card } from "./components/Card";
import { Detail } from "./components/Detail";

/** 행사 부제: 별칭·장소·기간 중 존재하는 것만 · 로 잇는다. */
function eventSubtitle(event: ApiEvent | null): string {
  if (!event) return "행사 정보를 불러오는 중…";
  const parts = [event.alias || event.title, event.venue, event.date_label].filter(Boolean);
  return parts.length ? parts.join(" · ") : event.title;
}

const EVENT_SECTIONS = [
  { status: "active", label: "진행 중" },
  { status: "upcoming", label: "예정" },
  { status: "past", label: "지난 행사" },
] as const;

function EventList({ events }: { events: ApiEvent[] }) {
  return EVENT_SECTIONS.map(({ status, label }) => {
    const matches = events
      .filter((event) => event.status === status)
      .sort((a, b) => {
        const comparison = (a.start_date ?? "").localeCompare(b.start_date ?? "");
        return status === "past" ? -comparison : comparison;
      });
    if (matches.length === 0) return null;
    return (
      <section key={status} className="mt-6">
        <h2 className="mb-2 text-xs font-extrabold tracking-[0.04em] text-faint">{label}</h2>
        <div className="flex flex-col gap-3">
          {matches.map((candidate) => (
            <a key={candidate.slug} href={`#/events/${encodeURIComponent(candidate.slug)}`} className="block rounded-[18px] border border-line bg-card p-4 no-underline">
              <div className="text-[17px] font-extrabold text-ink">{candidate.title}</div>
              <div className="mt-1 text-xs font-semibold text-faint">{eventSubtitle(candidate)}</div>
            </a>
          ))}
        </div>
      </section>
    );
  });
}

/* ---------- 앱 ---------- */
export default function App() {
  const { route, openCircle, backToEvent } = useAppRoute();
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [event, setEvent] = useState<ApiEvent | null>(null);
  const [checks, toggle] = useChecks(event?.slug ?? null);
  const [status, setStatus] = useState<Status>("all");
  const [genres, setGenres] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [announce, setAnnounce] = useState("");

  const [circles, setCircles] = useState<Circle[]>([]);
  const [witchformExtra, setWitchformExtra] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 행사장 서클 + 통판(unlisted)을 한 데이터셋으로 다뤄 검색·필터·체크를 일관 적용
  const all = useMemo(() => [...circles, ...witchformExtra], [circles, witchformExtra]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const available = await fetchEvents();
      setEvents(available);
      if (route.kind === "events") {
        setEvent(null);
        setCircles([]);
        setWitchformExtra([]);
        return;
      }
      const requestedSlug = route.kind === "legacy-circle"
        ? pickActiveEvent(available)?.slug
        : route.eventSlug;
      const ev = available.find((candidate) => candidate.slug === requestedSlug);
      if (!ev) throw new Error("행사 정보를 찾지 못했어요");
      const { circles: cs, witchformExtra: wf } = await fetchCircles(ev.slug);
      setEvent(ev);
      setCircles(cs);
      setWitchformExtra(wf);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, [route]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleToggle = (id: string) => {
    setAnnounce(checks[id] ? "방문 체크를 해제했어요" : "방문 체크했어요");
    toggle(id);
  };

  // 진행률은 통판 포함(모두 방문 대상) — 제품 규칙
  const doneCount = all.filter((c) => checks[c.id]).length;

  const filtered = useMemo(
    () => filterCircles(all, { checks, status, genres, query }),
    [all, checks, status, genres, query],
  );
  const boothList = filtered.filter((c) => !c.unlisted);
  const tsuhanList = filtered.filter((c) => c.unlisted);

  const detailSlug = route.kind === "circle" || route.kind === "legacy-circle" ? route.circleSlug : null;
  const detail = detailSlug ? all.find((c) => c.id === detailSlug) ?? null : null;

  const statusChip = (active: boolean) =>
    "inline-flex items-center h-[34px] px-4 rounded-full text-[13.5px] font-bold cursor-pointer whitespace-nowrap border " +
    (active ? "bg-ink text-white border-ink" : "bg-card text-[#7b818c] border-line");
  const genreChip = (active: boolean) =>
    "inline-flex items-center h-8 px-[13px] rounded-full text-[13px] font-bold cursor-pointer whitespace-nowrap border " +
    (active ? "bg-accent/10 text-accent border-accent/30" : "bg-card text-[#7b818c] border-line");

  return (
    <div className="min-h-screen bg-bg max-w-[520px] mx-auto">
      <div role="status" aria-live="polite" className="sr-only">
        {announce}
      </div>
      {route.kind === "events" ? (
        <main className="px-5 py-7">
          <div className="text-sm font-extrabold text-accent">동인행사 체크리스트</div>
          <h1 className="mt-1 text-[26px] font-extrabold text-ink">행사 선택</h1>
          <p className="mt-2 text-sm text-muted">방문할 행사를 골라 관심 서클을 확인하세요.</p>
          {loadError ? <div role="alert" className="mt-8 text-sm text-[#e0455c]">{loadError}</div> : null}
          <EventList events={events} />
          {!loading && !loadError && events.length === 0 ? <div className="py-14 text-center text-sm text-faint">등록된 행사가 없어요</div> : null}
        </main>
      ) : detail ? (
        <Detail
          item={detail}
          checked={!!checks[detail.id]}
          onToggle={() => handleToggle(detail.id)}
          onBack={() => event && backToEvent(event.slug)}
          color={badgeColor(detail.id, all)}
        />
      ) : (
        <div className="pb-7">
          {/* sticky 헤더 */}
          <div className="sticky top-0 z-10 bg-bg px-5 pt-[22px] pb-3">
            <div className="mb-4">
              <div className="text-[22px] font-extrabold -tracking-[0.02em] text-ink leading-none">
                {event?.title ?? "동인행사 체크리스트"}
              </div>
              <div className="text-xs font-semibold text-faint mt-[5px]">
                {eventSubtitle(event)}
              </div>
            </div>

            <div className="flex items-center gap-2.5 h-12 bg-card border border-line rounded-[14px] px-3.5">
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="#9aa0aa"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4-4" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="서클 · 부스 · 장르 검색"
                aria-label="서클·부스·장르 검색"
                className="flex-1 min-w-0 border-0 outline-none bg-transparent text-[16px] text-ink placeholder:text-faint"
              />
              {query ? (
                <button
                  onClick={() => setQuery("")}
                  title="검색 초기화"
                  aria-label="검색 초기화"
                  className="flex items-center"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="#9aa0aa"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              ) : event?.map_url ? (
                <a
                  href={event.map_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="전체 부스배치도"
                  className="flex items-center"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="#9aa0aa"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </a>
              ) : null}
            </div>

            <div className="flex gap-2 mt-3.5">
              {STATUS.map((s) => (
                <button
                  key={s.k}
                  onClick={() => setStatus(s.k)}
                  aria-pressed={status === s.k}
                  className={statusChip(status === s.k)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* 장르 칩 (가로 스크롤) */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 pt-1 pb-0.5">
            <button
              onClick={() => setGenres([])}
              aria-pressed={genres.length === 0}
              className={genreChip(genres.length === 0)}
            >
              전체 장르
            </button>
            {Array.from(new Set(all.flatMap((circle) => circle.genres ?? []).filter(Boolean))).sort().map((g) => (
              <button
                key={g}
                onClick={() =>
                  setGenres((prev) =>
                    prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
                  )
                }
                aria-pressed={genres.includes(g)}
                className={genreChip(genres.includes(g))}
              >
                {g}
              </button>
            ))}
          </div>

          {/* 진행 표시 */}
          <div className="flex items-center justify-between px-[22px] pt-3.5 pb-2">
            <div className="text-[12.5px] font-bold text-faint">참가 서클 {filtered.length}곳</div>
            <div className="text-[12.5px] font-bold text-accent">
              방문 {doneCount}/{all.length}
            </div>
          </div>

          {/* 카드 목록 */}
          <div className="flex flex-col gap-3 px-5">
            {loadError && (
              <div className="text-center py-14" role="alert">
                <div className="text-[#e0455c] text-sm font-semibold">{loadError}</div>
                <button
                  onClick={() => void load()}
                  disabled={loading}
                  className="mt-3 inline-flex items-center h-9 px-4 rounded-full bg-ink text-white text-[13px] font-bold cursor-pointer border-0 disabled:opacity-60"
                >
                  {loading ? "다시 시도 중…" : "다시 시도"}
                </button>
              </div>
            )}
            {!loadError && loading && circles.length === 0 && (
              <div className="text-center py-14 text-[#b0b4bc] text-sm font-semibold">
                불러오는 중...
              </div>
            )}
            {!loadError &&
              boothList.map((c) => (
                <Card
                  key={c.id}
                  item={c}
                  checked={!!checks[c.id]}
                  onToggle={() => handleToggle(c.id)}
                  onOpen={() => event && openCircle(event.slug, c.id)}
                  color={badgeColor(c.id, all)}
                />
              ))}

            {/* 통판(윗치폼) 섹션 — 행사장 부스 없이 온라인 주문 */}
            {!loadError && tsuhanList.length > 0 && (
              <>
                <div className="flex items-center gap-2 mt-4 mb-0.5">
                  <span className="text-[12.5px] font-extrabold tracking-[0.04em] text-faint">
                    윗치폼 통판
                  </span>
                  <span className="text-[11px] font-bold text-accent">{tsuhanList.length}</span>
                  <div className="flex-1 h-px bg-line" />
                </div>
                {tsuhanList.map((c) => (
                  <Card
                    key={c.id}
                    item={c}
                    checked={!!checks[c.id]}
                    onToggle={() => handleToggle(c.id)}
                    onOpen={() => event && openCircle(event.slug, c.id)}
                    color={badgeColor(c.id, all)}
                  />
                ))}
              </>
            )}

            {!loadError && !loading && filtered.length === 0 && (
              <div className="text-center py-14 text-[#b0b4bc] text-sm font-semibold">
                조건에 맞는 서클이 없어요
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
