import { useEffect, useState } from "react";
import type { Status } from "../lib/circle";

/** 체크리스트 검색/필터 상태. resetKey(행사 slug)가 바뀌면 초기화한다. */
export function useChecklistFilters(resetKey: string | null) {
  const [status, setStatus] = useState<Status>("all");
  const [selectedIps, setSelectedIps] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (resetKey === null) return;
    setStatus("all");
    setSelectedIps([]);
    setQuery("");
  }, [resetKey]);

  const filterCount = (status === "all" ? 0 : 1) + selectedIps.length;
  return { status, setStatus, selectedIps, setSelectedIps, query, setQuery, filterCount };
}

export type ChecklistFilters = ReturnType<typeof useChecklistFilters>;
