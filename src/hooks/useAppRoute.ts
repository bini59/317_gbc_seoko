import { useEffect, useState } from "react";
import { circleHash, eventHash, eventsHash, parseRoute, settingsHash, type AppRoute } from "../lib/route";

export function useAppRoute() {
  const [route, setRoute] = useState<AppRoute>(() => parseRoute(window.location.hash));

  useEffect(() => {
    // navigate()가 이미 반영한 라우트면 그대로 둔다 — 같은 화면에 대한 불필요한 리렌더/effect 재실행 방지
    const onChange = () => setRoute((prev) => {
      const next = parseRoute(window.location.hash);
      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
    });
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = (hash: string) => {
    window.location.hash = hash;
    setRoute(parseRoute(hash));
  };

  const openEvent = (eventSlug: string) => navigate(eventHash(eventSlug));
  return {
    route,
    openEvents: () => navigate(eventsHash()),
    openEvent,
    openCircle: (eventSlug: string, circleSlug: string) => navigate(circleHash(eventSlug, circleSlug)),
    backToEvent: openEvent,
    openSettings: () => navigate(settingsHash()),
  };
}
