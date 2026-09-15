import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { pickActiveEvent } from "@/api";
import { useChecks } from "@/hooks/useChecks";
import { useAuth } from "@/hooks/useAuth";
import { useAppRoute } from "@/hooks/useAppRoute";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useTheme } from "@/components/Settings";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav, type NavTab } from "@/components/BottomNav";
import { ChecklistScreen } from "@/screens/ChecklistScreen";
import { CircleDetailScreen } from "@/screens/CircleDetailScreen";
import { EventsScreen } from "@/screens/EventsScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { WishlistScreen } from "@/screens/WishlistScreen";
import { useUiStore } from "@/lib/store";
import { useEventWishlist, useCircleWishlist } from "@/hooks/useWishlist";
import { circlesQuery as circlesOptions, eventsQuery as eventsOptions } from "@/lib/queries";

/* ---------- 앱 쉘: 라우트 → 화면 분기, 사이드바/하단 네비, 인증, 체크 동기화 ---------- */
const EMPTY_EVENTS: never[] = [];

export default function App() {
  const { route, openEvents, openWishlist, openEvent, openCircle, openSettings } = useAppRoute();
  const { user, userId, authenticated, loading: authLoading } = useAuth();
  const setSyncedAt = useUiStore((s) => s.setSyncedAt);
  const [announce, setAnnounce] = useState("");
  const [theme, setTheme] = useTheme();
  const install = useInstallPrompt();

  const handleSync = useCallback((merged: number) => {
    setSyncedAt(Date.now());
    if (merged > 0) setAnnounce(`${merged}개 항목을 동기화했어요`);
  }, [setSyncedAt]);
  const handleSyncError = useCallback(() => setAnnounce("방문 체크를 저장하지 못했어요"), []);

  const { data: events = EMPTY_EVENTS, isFetched: eventsFetched } = useQuery({ ...eventsOptions(), enabled: route.kind !== "settings" });
  const requestedEventSlug = route.kind === "event" || route.kind === "circle" ? route.eventSlug : null;
  const routeEvent = route.kind === "legacy-circle"
    ? pickActiveEvent(events)
    : requestedEventSlug !== null
      ? events.find((candidate) => candidate.slug === requestedEventSlug) ?? null
      : null;
  const lastEventSlug = useRef<string | null>(null);
  useEffect(() => {
    if (route.kind === "events") lastEventSlug.current = null;
    else if (routeEvent) lastEventSlug.current = routeEvent.slug;
  }, [routeEvent, route.kind]);
  // 설정/찜목록에서는 마지막으로 본 행사를 유지해 "서클" 탭이 그 행사로 돌아갈 수 있게 한다.
  const event = route.kind === "settings" || route.kind === "wishlist"
    ? events.find((candidate) => candidate.slug === lastEventSlug.current) ?? null
    : routeEvent;
  const eventSlug = event?.slug ?? null;

  const validEventSlugs = useMemo(
    () => eventsFetched ? events.map((candidate) => candidate.slug) : null,
    [events, eventsFetched],
  );
  const { data: circleData } = useQuery(circlesOptions(eventSlug));
  const allCircles = useMemo(
    () => circleData ? [...circleData.circles, ...circleData.witchformExtra] : [],
    [circleData],
  );
  const validCircleIds = useMemo(
    () => circleData ? allCircles.map((candidate) => candidate.id) : null,
    [circleData, allCircles],
  );
  const circleSlug = route.kind === "circle" || route.kind === "legacy-circle" ? route.circleSlug : null;
  // 서클 목록이 도착하기 전에는 상세를 확정할 수 없다 — 그동안은 목록을 계속 보여준다.
  const detail = circleSlug ? allCircles.find((candidate) => candidate.id === circleSlug) ?? null : null;
  const [checks, toggle] = useChecks(eventSlug, event?.status === "active", authenticated, authLoading, handleSync, handleSyncError, userId);
  const [eventWishlist, toggleEventWishlist] = useEventWishlist(authenticated, userId, () => setAnnounce("위시리스트를 저장했어요"), () => setAnnounce("위시리스트를 저장하지 못했어요"), validEventSlugs);
  const circleWishlist = useCircleWishlist(eventSlug, authenticated, userId, () => setAnnounce("위시리스트를 저장했어요"), () => setAnnounce("위시리스트를 저장하지 못했어요"), validCircleIds);
  const handleToggle = (id: string) => {
    setAnnounce(checks[id] ? "방문 체크를 해제했어요" : "방문 체크했어요");
    toggle(id);
  };
  const handleToggleEventWishlist = (slug: string) => {
    const isStarred = eventWishlist.includes(slug);
    setAnnounce(isStarred ? "행사 찜을 해제했어요" : "행사를 찜했어요");
    toggleEventWishlist(slug);
  };
  const handleToggleCircleStar = (id: string) => {
    const isStarred = !!circleWishlist.circles[id]?.star;
    setAnnounce(isStarred ? "서클 찜을 해제했어요" : "서클을 찜했어요");
    circleWishlist.toggleStar(id);
  };

  const setSheet = useUiStore((s) => s.setSheet);
  const resetFilters = useUiStore((s) => s.resetFilters);
  // 행사가 바뀌면 검색/필터를 초기화한다.
  useEffect(() => {
    if (requestedEventSlug !== null) resetFilters();
  }, [requestedEventSlug, resetFilters]);
  // 화면이 바뀌면 시트는 닫힌 채로 시작한다.
  useEffect(() => { setSheet(null); }, [route, setSheet]);
  const handleNav = (tab: NavTab) => {
    if (tab === "events") return openEvents();
    if (tab === "wishlist") return openWishlist();
    if (tab === "settings") return openSettings();
    setSheet(null);
    if (route.kind === "event") return;
    if (eventSlug) openEvent(eventSlug);
    else openEvents();
  };
  const navActive: NavTab = route.kind === "events" ? "events" : route.kind === "wishlist" ? "wishlist" : route.kind === "settings" ? "settings" : "list";
  // 돌아갈 행사가 없으면(행사 목록을 거쳐 선택이 풀린 상태) 목록 탭은 갈 곳이 없다.
  const navDisabled: NavTab[] = navActive !== "list" && !eventSlug ? ["list"] : [];
  const showNav = route.kind !== "circle" && route.kind !== "legacy-circle";

  return (
    // 쉘: 모바일은 단일 컬럼(560px), md 이상은 사이드바 + 콘텐츠 2컬럼. 컴포넌트는 공유하고 레이아웃만 분기.
    <div className="min-h-screen bg-bg flex flex-col md:grid md:grid-cols-[260px_minmax(0,1fr)]">
      <div role="status" aria-live="polite" className="sr-only">
        {announce}
      </div>
      <Sidebar
        currentSlug={requestedEventSlug !== null ? eventSlug : null}
        showOnMobile={route.kind === "events"}
        wishlistActive={route.kind === "wishlist"}
        onWishlist={openWishlist}
        settingsActive={route.kind === "settings"}
        wishlist={eventWishlist}
        onToggleWishlist={handleToggleEventWishlist}
        onSettings={openSettings}
      />
      <main className={"w-full max-w-[560px] mx-auto border-x border-line md:max-w-none md:mx-0 md:border-x-0 md:min-h-screen " + (route.kind === "events" ? "" : "flex-1")}>
        {route.kind === "settings" ? (
          <SettingsScreen theme={theme} onTheme={setTheme} install={install} />
        ) : route.kind === "wishlist" ? (
           <WishlistScreen events={events} eventWishlist={eventWishlist} />
        ) : route.kind === "events" ? (
          <EventsScreen install={install} onOpenSettings={openSettings} wishlist={eventWishlist} onToggleWishlist={handleToggleEventWishlist} />
        ) : (
          // 상세는 목록을 대신 차지한다. 서클 목록이 도착하기 전에는 상세를 확정할 수 없어 목록(로딩·에러 UI)을 그대로 둔다.
          detail ? (
            <CircleDetailScreen
              item={detail}
              all={allCircles}
              checks={checks}
              onToggle={handleToggle}
              circleWishlist={{ ...circleWishlist, toggleStar: handleToggleCircleStar }}
              onBack={() => eventSlug && openEvent(eventSlug)}
            />
          ) : (
            <ChecklistScreen
              event={event}
              checks={checks}
              onToggle={handleToggle}
              onOpenCircle={openCircle}
              circleWishlist={{ ...circleWishlist, toggleStar: handleToggleCircleStar }}
            />
          )
        )}
      </main>
      {showNav && <BottomNav active={navActive} disabled={navDisabled} onSelect={handleNav} />}
    </div>
  );
}
