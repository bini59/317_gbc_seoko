import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Circle } from "./types";
import { fetchAuth, fetchCircles, fetchEvents, pickActiveEvent, type ApiEvent, type AuthUser } from "./api";
import { badgeColor, filterCircles, STATUS, type Status } from "./lib/circle";
import { useChecks } from "./hooks/useChecks";
import { useAppRoute } from "./hooks/useAppRoute";
import { Card } from "./components/Card";
import { Detail } from "./components/Detail";
import { Sidebar } from "./components/Sidebar";
import { eventSubtitle } from "./lib/event";

/* ---------- 앱 ---------- */
export default function App() {
  const { route, openCircle, openEvents, backToEvent } = useAppRoute();
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [event, setEvent] = useState<ApiEvent | null>(null);
  const [authEnabled, setAuthEnabled] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checks, toggle] = useChecks(event?.slug ?? null, event?.status === "active", !!user, authLoading);
  const [status, setStatus] = useState<Status>("all");
  const [selectedIps, setSelectedIps] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [announce, setAnnounce] = useState("");

  const [circles, setCircles] = useState<Circle[]>([]);
  const [witchformExtra, setWitchformExtra] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadGeneration = useRef(0);
  const loadController = useRef<AbortController | null>(null);
  const requestedEventSlug = route.kind === "event" || route.kind === "circle" ? route.eventSlug : null;
  const routeMode = route.kind === "events" ? "events" : route.kind === "legacy-circle" ? "legacy" : "event";

  const loadAuth = useCallback(() => {
    void fetchAuth().then(({ enabled, user: currentUser }) => {
      setAuthEnabled(enabled);
      setUser(currentUser);
    }).catch(() => {
      setAuthEnabled(false);
      setUser(null);
    }).finally(() => setAuthLoading(false));
  }, []);

  // 행사장 서클 + 통판(unlisted)을 한 데이터셋으로 다뤄 검색·필터·체크를 일관 적용
  const all = useMemo(() => [...circles, ...witchformExtra], [circles, witchformExtra]);

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    try {
      setLoading(true);
      setLoadError(null);
      setEvent(null);
      setCircles([]);
      setWitchformExtra([]);
      const available = await fetchEvents(controller.signal);
      if (generation !== loadGeneration.current) return;
      setEvents(available);
      if (routeMode === "events") {
        setEvent(null);
        setCircles([]);
        setWitchformExtra([]);
        return;
      }
      const requestedSlug = routeMode === "legacy"
        ? pickActiveEvent(available)?.slug
        : requestedEventSlug;
      const ev = available.find((candidate) => candidate.slug === requestedSlug);
      if (!ev) throw new Error("행사 정보를 찾지 못했어요");
      const { circles: cs, witchformExtra: wf } = await fetchCircles(ev.slug, controller.signal);
      if (generation !== loadGeneration.current) return;
      setEvent(ev);
      setCircles(cs);
      setWitchformExtra(wf);
    } catch (e) {
      if (generation !== loadGeneration.current) return;
      if (e instanceof DOMException && e.name === "AbortError") return;
      setLoadError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  }, [requestedEventSlug, routeMode]);

  useEffect(() => {
    void load();
    return () => loadController.current?.abort();
  }, [load]);

  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  useEffect(() => {
    setStatus("all");
    setSelectedIps([]);
    setQuery("");
  }, [requestedEventSlug]);

  const handleToggle = (id: string) => {
    setAnnounce(checks[id] ? "방문 체크를 해제했어요" : "방문 체크했어요");
    toggle(id);
  };

  // 진행률은 통판 포함(모두 방문 대상) — 제품 규칙
  const doneCount = all.filter((c) => checks[c.id]).length;

  const filtered = useMemo(
    () => filterCircles(all, { checks, status, ips: selectedIps, query }),
    [all, checks, status, selectedIps, query],
  );
  const boothList = filtered.filter((c) => !c.unlisted);
  const tsuhanList = filtered.filter((c) => c.unlisted);

  const detailSlug = route.kind === "circle" || route.kind === "legacy-circle" ? route.circleSlug : null;
  const detail = detailSlug ? all.find((c) => c.id === detailSlug) ?? null : null;

  const statusChip = (active: boolean) =>
    "inline-flex items-center h-[32px] px-3 rounded-[8px] text-[13px] font-medium cursor-pointer whitespace-nowrap border " +
    (active ? "bg-ink text-bg border-ink" : "bg-card text-muted border-line");
  const gridCls = "grid gap-3 md:grid-cols-2 xl:grid-cols-3";
  const genreChip = (active: boolean) =>
    "inline-flex items-center h-7 px-2.5 rounded-full text-[12px] font-medium cursor-pointer whitespace-nowrap border " +
    (active ? "bg-accent/10 text-accent border-accent/30" : "bg-card text-muted border-line");

  return (
    // 쉘: 모바일은 단일 컬럼(560px), md 이상은 사이드바 + 콘텐츠 2컬럼. 컴포넌트는 공유하고 레이아웃만 분기.
    <div className="min-h-screen bg-bg flex flex-col md:grid md:grid-cols-[260px_minmax(0,1fr)]">
      <div role="status" aria-live="polite" className="sr-only">
        {announce}
      </div>
      <Sidebar
        events={events}
        currentSlug={event?.slug ?? null}
        showOnMobile={route.kind === "events"}
        authEnabled={authEnabled}
        user={user}
      />
      <div className={"w-full max-w-[560px] mx-auto border-x border-line md:max-w-none md:mx-0 md:border-x-0 md:min-h-screen " + (route.kind === "events" ? "" : "flex-1")}>
      {route.kind === "events" ? (
        <main className="px-5 pt-7 pb-2 md:px-8 md:py-10">
          <h1 className="text-[26px] font-extrabold text-ink">행사 선택</h1>
          <p className="mt-2 text-sm text-muted">방문할 행사를 골라 관심 서클을 확인하세요.</p>
          {loadError ? <div role="alert" className="mt-8 text-sm text-[#e0455c]">{loadError}</div> : null}
          {!loading && !loadError && events.length === 0 ? <div className="py-14 text-center text-sm text-faint">등록된 행사가 없어요</div> : null}
        </main>
      ) : (
        <div className="md:flex md:items-start">
        {/* 목록 — 모바일에서 상세가 열리면 숨김, 데스크톱은 유지 */}
        <div className={"min-w-0 flex-1 pb-7 " + (detail ? "hidden md:block" : "")}>
          {/* sticky 헤더(모바일) / topbar(데스크톱) */}
          <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur px-5 pt-[22px] pb-3 border-b border-line md:px-8 md:pt-4">
            <div className="mb-4 flex items-start justify-between gap-3 md:mb-3 md:items-center md:gap-6">
              <div className="min-w-0">
                <div className="text-[22px] font-extrabold -tracking-[0.02em] text-ink leading-none md:text-[19px]">
                {event?.title ?? "동인행사 체크리스트"}
                </div>
                <div className="text-xs font-semibold text-faint mt-[5px] truncate">
                  {eventSubtitle(event)}
                </div>
              </div>
              <button type="button" onClick={openEvents} className="shrink-0 rounded-full border border-line bg-card px-3 py-2 text-xs font-bold text-muted md:hidden">행사 목록</button>
            </div>

            <div className="flex items-center gap-2.5 h-12 bg-card border border-line rounded-[14px] px-3.5 md:h-10 md:max-w-[520px]">
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
                  aria-label="전체 부스배치도 (새 창)"
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
          <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 pt-1 pb-0.5 md:flex-wrap md:px-8 md:pt-4">
            <button
              onClick={() => setSelectedIps([])}
              aria-pressed={selectedIps.length === 0}
              className={genreChip(selectedIps.length === 0)}
            >
              전체 장르
            </button>
            {Array.from(new Set(all.flatMap((circle) => circle.ips ?? []).filter(Boolean))).sort().map((g) => (
              <button
                key={g}
                onClick={() =>
                  setSelectedIps((prev) =>
                    prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
                  )
                }
                aria-pressed={selectedIps.includes(g)}
                className={genreChip(selectedIps.includes(g))}
              >
                {g}
              </button>
            ))}
          </div>

          {/* 진행 표시 */}
          <div className="flex items-center justify-between px-[22px] pt-3.5 pb-2 md:px-8">
            <div className="text-[12.5px] font-bold text-faint">참가 서클 {filtered.length}곳</div>
            <div className="text-[12.5px] font-bold text-accent">
              방문 {doneCount}/{all.length}
            </div>
          </div>

          {/* 카드 목록 — 데스크톱은 2~3열 그리드 */}
          <div className="px-5 md:px-8">
            {loadError && (
              <div className="text-center py-14" role="alert">
                <div className="text-[#e0455c] text-sm font-semibold">{loadError}</div>
                <button
                  onClick={() => void load()}
                  disabled={loading}
                  className="mt-3 inline-flex items-center h-9 px-4 rounded-full bg-ink text-bg text-[13px] font-bold cursor-pointer border-0 disabled:opacity-60"
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
            {!loadError && (
              <div className={gridCls}>
                {boothList.map((c) => (
                  <Card
                    key={c.id}
                    item={c}
                    checked={!!checks[c.id]}
                    onToggle={() => handleToggle(c.id)}
                    onOpen={() => event && openCircle(event.slug, c.id)}
                    color={badgeColor(c.id, all)}
                  />
                ))}
              </div>
            )}

            {/* 통판(윗치폼) 섹션 — 행사장 부스 없이 온라인 주문 */}
            {!loadError && tsuhanList.length > 0 && (
              <>
                <div className="flex items-center gap-2 mt-7 mb-3.5">
                  <span className="text-[12.5px] font-extrabold tracking-[0.04em] text-faint">
                    윗치폼 통판
                  </span>
                  <span className="text-[11px] font-bold text-accent">{tsuhanList.length}</span>
                  <div className="flex-1 h-px bg-line" />
                </div>
                <div className={gridCls}>
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
                </div>
              </>
            )}

            {!loadError && !loading && filtered.length === 0 && (
              <div className="text-center py-14 text-[#b0b4bc] text-sm font-semibold">
                조건에 맞는 서클이 없어요
              </div>
            )}
          </div>
        </div>

        {/* 서클 상세 — 모바일은 전체 화면, 데스크톱은 우측 패널(목록 유지) */}
        {detail && (
          <aside className="min-w-0 md:w-[400px] md:shrink-0 md:sticky md:top-0 md:h-screen md:overflow-y-auto md:border-l md:border-line">
            <Detail
              item={detail}
              checked={!!checks[detail.id]}
              onToggle={() => handleToggle(detail.id)}
              onBack={() => event && backToEvent(event.slug)}
              color={badgeColor(detail.id, all)}
            />
          </aside>
        )}
        </div>
      )}
      </div>
    </div>
  );
}
