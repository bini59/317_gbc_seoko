import { useEffect, useState } from "react";
import { circleHash, eventHash, eventsHash, parseRoute, settingsHash, type AppRoute } from "../lib/route";

export function useAppRoute() {
  const [route, setRoute] = useState<AppRoute>(() => parseRoute(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash));
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
