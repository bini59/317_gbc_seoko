import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { logout, pickActiveEvent } from "./api";
import { useChecks } from "./hooks/useChecks";
import { useAppRoute } from "./hooks/useAppRoute";
import { useChecklistFilters } from "./hooks/useChecklistFilters";
import { useInstallPrompt } from "./hooks/useInstallPrompt";
import { useTheme } from "./components/Settings";
import { Sidebar } from "./components/Sidebar";
import { BottomNav, type Sheet } from "./components/BottomNav";
import { ChecklistScreen } from "./screens/ChecklistScreen";
import { EventsScreen } from "./screens/EventsScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { clearAllChecks } from "./lib/checks";
import { clearAllWishlist } from "./lib/wishlist";
import { useEventWishlist, useCircleWishlist } from "./hooks/useWishlist";
import { authQuery, circlesQuery as circlesOptions, eventsQuery as eventsOptions, SIGNED_OUT } from "./lib/queries";

/* ---------- 앱 쉘: 라우트 → 화면 분기, 사이드바/하단 네비, 인증, 체크 동기화 ---------- */
const EMPTY_EVENTS: never[] = [];

export default function App() {
  const { route, openEvents, openEvent, openCircle, openSettings } = useAppRoute();
  const queryClient = useQueryClient();
  const auth = useQuery(authQuery());
  const { enabled: authEnabled, user } = auth.data ?? SIGNED_OUT;
  const authLoading = auth.isPending;
  const [syncedAt, setSyncedAt] = useState<number | null>(null);
  const [announce, setAnnounce] = useState("");
  const [theme, setTheme] = useTheme();
  const install = useInstallPrompt();

  const handleSync = useCallback((merged: number) => {
    setSyncedAt(Date.now());
    if (merged > 0) setAnnounce(`${merged}개 항목을 동기화했어요`);
  }, []);
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
  const event = route.kind === "settings"
    ? events.find((candidate) => candidate.slug === lastEventSlug.current) ?? null
    : routeEvent;
  const eventSlug = event?.slug ?? null;

  const validEventSlugs = useMemo(
    () => eventsFetched ? events.map((candidate) => candidate.slug) : null,
    [events, eventsFetched],
  );
  const { data: circleData } = useQuery(circlesOptions(eventSlug));
  const validCircleIds = useMemo(
    () => circleData?.circles.concat(circleData.witchformExtra).map((candidate) => candidate.id) ?? null,
    [circleData],
  );
  const [checks, toggle] = useChecks(eventSlug, event?.status === "active", !!user, authLoading, handleSync, handleSyncError, user?.userId ?? null);
  const [eventWishlist, toggleEventWishlist] = useEventWishlist(!!user, user?.userId ?? null, () => setAnnounce("위시리스트를 저장했어요"), () => setAnnounce("위시리스트를 저장하지 못했어요"), validEventSlugs);
  const circleWishlist = useCircleWishlist(eventSlug, !!user, user?.userId ?? null, () => setAnnounce("위시리스트를 저장했어요"), () => setAnnounce("위시리스트를 저장하지 못했어요"), validCircleIds);
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

  const handleLogout = useCallback(() => {
    void logout().catch(() => {}).finally(() => {
      clearAllChecks(localStorage);
      clearAllWishlist(localStorage);
      queryClient.setQueryData(authQuery().queryKey, (prev) => (prev ? { ...prev, user: null } : SIGNED_OUT));
      setSyncedAt(null);
    });
  }, [queryClient]);

  const filters = useChecklistFilters(requestedEventSlug);
  const [sheet, setSheet] = useState<Sheet>(null);
  const pendingSheet = useRef<Sheet>(null);
  useEffect(() => {
    setSheet(pendingSheet.current);
    pendingSheet.current = null;
  }, [route]);
  const handleNavSheet = (next: Sheet) => {
    if (route.kind === "settings") {
      if (next === "events" || !eventSlug) return openEvents();
      pendingSheet.current = next;
      return openEvent(eventSlug);
    }
    if (route.kind !== "events") setSheet(next);
  };
  const handleNavList = () => {
    setSheet(null);
    if (route.kind === "event") return;
    if (eventSlug) openEvent(eventSlug);
    else openEvents();
  };
  const visibleSheet = route.kind === "event" ? sheet : null;
  const navContext = route.kind === "settings" ? "settings" : route.kind === "events" ? "events" : "event";
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
        settingsActive={route.kind === "settings"}
        wishlist={eventWishlist}
        onToggleWishlist={handleToggleEventWishlist}
        onSettings={openSettings}
      />
      <main className={"w-full max-w-[560px] mx-auto border-x border-line md:max-w-none md:mx-0 md:border-x-0 md:min-h-screen " + (route.kind === "events" ? "" : "flex-1")}>
        {route.kind === "settings" ? (
          <SettingsScreen authEnabled={authEnabled} user={user} syncedAt={syncedAt} theme={theme} onTheme={setTheme} onLogout={handleLogout} install={install} />
        ) : route.kind === "events" ? (
          <EventsScreen install={install} onOpenSettings={openSettings} wishlist={eventWishlist} onToggleWishlist={handleToggleEventWishlist} />
        ) : (
          <ChecklistScreen
            event={event}
            circleSlug={route.kind === "circle" || route.kind === "legacy-circle" ? route.circleSlug : null}
            checks={checks}
            onToggle={handleToggle}
            filters={filters}
            sheet={visibleSheet}
            onSheet={setSheet}
            onOpenEvent={openEvent}
            onOpenCircle={openCircle}
            wishlist={circleWishlist.circles}
            onToggleStar={handleToggleCircleStar}
            onUpdateMemo={circleWishlist.updateMemo}
            eventWishlist={eventWishlist}
            onToggleEventWishlist={handleToggleEventWishlist}
          />
        )}
      </main>
      {showNav && (
        <BottomNav context={navContext} sheet={visibleSheet} onSheet={handleNavSheet} onList={handleNavList} onEvents={openEvents} searchCount={filters.query ? 1 : 0} filterCount={filters.filterCount} onSettings={openSettings} />
      )}
    </div>
  );
}
