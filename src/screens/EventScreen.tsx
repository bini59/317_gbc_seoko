import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ApiEvent } from "@/api";
import { useAuth } from "@/hooks/useAuth";
import { useChecks } from "@/hooks/useChecks";
import { useCircleWishlist } from "@/hooks/useWishlist";
import { circlesQuery } from "@/lib/queries";
import { useUiStore } from "@/lib/store";
import { ChecklistScreen } from "@/screens/ChecklistScreen";
import { CircleDetailScreen } from "@/screens/CircleDetailScreen";

type Props = {
  /** 라우트가 가리키는 행사. events 로딩 중이거나 slug가 없으면 null. */
  event: ApiEvent | null;
  /** 상세 라우트의 서클 id. 목록 라우트면 null. */
  circleSlug: string | null;
  onOpenCircle: (eventSlug: string, circleSlug: string) => void;
  onBackToEvent: (eventSlug: string) => void;
};

/** 행사 하나의 컨테이너: 방문 체크·서클 찜 상태를 소유하고 목록/상세를 분기한다. */
export function EventScreen({ event, circleSlug, onOpenCircle, onBackToEvent }: Props) {
  const eventSlug = event?.slug ?? null;
  const { userId, authenticated, loading: authLoading } = useAuth();
  const setAnnounce = useUiStore((s) => s.setAnnounce);
  const setSyncedAt = useUiStore((s) => s.setSyncedAt);

  const handleSync = useCallback((merged: number) => {
    setSyncedAt(Date.now());
    if (merged > 0) setAnnounce(`${merged}개 항목을 동기화했어요`);
  }, [setSyncedAt, setAnnounce]);
  const handleSyncError = useCallback(() => setAnnounce("방문 체크를 저장하지 못했어요"), [setAnnounce]);

  const { data: circleData } = useQuery(circlesQuery(eventSlug));
  const allCircles = useMemo(
    () => circleData ? [...circleData.circles, ...circleData.witchformExtra] : [],
    [circleData],
  );
  const validCircleIds = useMemo(
    () => circleData ? allCircles.map((candidate) => candidate.id) : null,
    [circleData, allCircles],
  );

  const [checks, toggle] = useChecks(eventSlug, event?.status === "active", authenticated, authLoading, handleSync, handleSyncError, userId);
  const circleWishlist = useCircleWishlist(eventSlug, authenticated, userId, () => setAnnounce("위시리스트를 저장했어요"), () => setAnnounce("위시리스트를 저장하지 못했어요"), validCircleIds);

  const handleToggle = (id: string) => {
    setAnnounce(checks[id] ? "방문 체크를 해제했어요" : "방문 체크했어요");
    toggle(id);
  };
  const handleToggleStar = (id: string) => {
    setAnnounce(circleWishlist.circles[id]?.star ? "서클 찜을 해제했어요" : "서클을 찜했어요");
    circleWishlist.toggleStar(id);
  };
  const wishlist = { ...circleWishlist, toggleStar: handleToggleStar };

  // 서클 목록이 도착하기 전에는 상세를 확정할 수 없다 — 그동안은 목록(로딩·에러 UI)을 그대로 둔다.
  const detail = circleSlug ? allCircles.find((candidate) => candidate.id === circleSlug) ?? null : null;
  if (detail) {
    return (
      <CircleDetailScreen
        item={detail}
        all={allCircles}
        checks={checks}
        onToggle={handleToggle}
        circleWishlist={wishlist}
        onBack={() => eventSlug && onBackToEvent(eventSlug)}
      />
    );
  }
  return <ChecklistScreen event={event} checks={checks} onToggle={handleToggle} onOpenCircle={onOpenCircle} circleWishlist={wishlist} />;
}
