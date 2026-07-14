import { useEffect, useState } from "react";

const STORAGE_KEY = "gbc-seoko-2026-07-checks";

export type Checks = Record<string, boolean>;

/* ---------- 방문 체크 상태: localStorage ---------- */
export function useChecks(): [Checks, (id: string) => void, () => void] {
  const [checks, setChecks] = useState<Checks>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checks));
    } catch {
      /* private mode / quota */
    }
  }, [checks]);
  const toggle = (id: string) => setChecks((c) => ({ ...c, [id]: !c[id] }));
  return [checks, toggle, () => setChecks({})];
}
