import { useEffect, useState } from "react";
import { circleHash, eventHash, parseRoute, settingsHash, type AppRoute } from "../lib/route";

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

  return {
    route,
    openCircle: (eventSlug: string, circleSlug: string) => navigate(circleHash(eventSlug, circleSlug)),
    backToEvent: (eventSlug: string) => navigate(eventHash(eventSlug)),
    openSettings: () => navigate(settingsHash()),
  };
}
