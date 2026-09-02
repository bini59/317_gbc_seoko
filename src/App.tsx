import { useCallback, useEffect, useRef, useState } from "react";
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
import { authQuery, eventsQuery as eventsOptions, SIGNED_OUT } from "./lib/queries";

/* ---------- 앱 쉘: 라우트 → 화면 분기, 사이드바/하단 네비, 인증, 체크 동기화 ---------- */
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

  // 원격 저장 완료 시각 + 첫 병합 안내(#45). merged 0 = 단순 저장(안내 없음)
  const handleSync = useCallback((merged: number) => {
    setSyncedAt(Date.now());
    if (merged > 0) setAnnounce(`${merged}개 항목을 동기화했어요`);
  }, []);
  const handleSyncError = useCallback(() => setAnnounce("방문 체크를 저장하지 못했어요"), []);

  // 화면들도 같은 쿼리를 각자 구독한다(캐시 공유). 여기서는 체크 동기화에 필요한 현재 행사만 해석한다.
  // 설정 화면에서는 새 구독자가 없어 stale 데이터를 재조회하지 않는다.
  const { data: events = [] } = useQuery({ ...eventsOptions(), enabled: route.kind !== "settings" });
  const requestedEventSlug = route.kind === "event" || route.kind === "circle" ? route.eventSlug : null;
  const routeEvent = route.kind === "legacy-circle"
    ? pickActiveEvent(events)
    : requestedEventSlug !== null
      ? events.find((candidate) => candidate.slug === requestedEventSlug) ?? null
      : null;
  // 설정 화면은 행사 컨텍스트가 URL에 없으므로 마지막 행사를 기억해 체크 동기화와 하단 탭을 이어 준다.
  const lastEventSlug = useRef<string | null>(null);
  useEffect(() => {
    if (route.kind === "events") lastEventSlug.current = null;
    else if (routeEvent) lastEventSlug.current = routeEvent.slug;
  }, [routeEvent, route.kind]);
  const event = route.kind === "settings"
    ? events.find((candidate) => candidate.slug === lastEventSlug.current) ?? null
    : routeEvent;
  const eventSlug = event?.slug ?? null;

  const [checks, toggle] = useChecks(eventSlug, event?.status === "active", !!user, authLoading, handleSync, handleSyncError, user?.userId ?? null);
  const handleToggle = (id: string) => {
    setAnnounce(checks[id] ? "방문 체크를 해제했어요" : "방문 체크했어요");
    toggle(id);
  };

  // 워커가 쿠키를 지우므로 revoke 결과와 무관하게 클라이언트는 로그아웃 상태로 전환한다.
  const handleLogout = useCallback(() => {
    void logout().catch(() => {}).finally(() => {
      clearAllChecks(localStorage);
      queryClient.setQueryData(authQuery().queryKey, (prev) => (prev ? { ...prev, user: null } : SIGNED_OUT));
      setSyncedAt(null);
    });
  }, [queryClient]);

  // 하단 네비와 체크리스트가 공유하는 상태. 네비는 라우트가 바뀌어도 한 인스턴스로 유지돼야 포커스가 살아 있다.
  const filters = useChecklistFilters(requestedEventSlug);
  const [sheet, setSheet] = useState<Sheet>(null);
  // 라우트가 바뀌면 시트를 닫는다. 설정에서 검색/필터 탭으로 현재 행사에 진입한 경우에는 그 시트를 연다.
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
  // 시트는 행사 체크리스트에서만 존재한다. 라우트 전환 직후의 이전 상태가 한 프레임이라도 남지 않도록 렌더 경계를 둔다.
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
        onSettings={openSettings}
      />
      <main className={"w-full max-w-[560px] mx-auto border-x border-line md:max-w-none md:mx-0 md:border-x-0 md:min-h-screen " + (route.kind === "events" ? "" : "flex-1")}>
        {route.kind === "settings" ? (
          <SettingsScreen authEnabled={authEnabled} user={user} syncedAt={syncedAt} theme={theme} onTheme={setTheme} onLogout={handleLogout} install={install} />
        ) : route.kind === "events" ? (
          <EventsScreen install={install} onOpenSettings={openSettings} />
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
          />
        )}
      </main>
      {showNav && (
        <BottomNav context={navContext} sheet={visibleSheet} onSheet={handleNavSheet} onList={handleNavList} onEvents={openEvents} searchCount={filters.query ? 1 : 0} filterCount={filters.filterCount} onSettings={openSettings} />
      )}
    </div>
  );
}
