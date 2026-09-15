import { create } from "zustand";
import type { Status } from "./circle";

/** 모바일 검색·필터 시트. 체크리스트 화면 안에서만 열린다. */
export type Sheet = "search-filter" | null;

/** 체크리스트 화면과 설정 화면이 공유하는 UI 상태(시트 + 검색/필터). */
type UiState = {
  sheet: Sheet;
  status: Status;
  selectedIps: string[];
  query: string;
  /** 마지막 서버 동기화 시각. 설정 화면이 읽는다. */
  syncedAt: number | null;
  setSheet: (sheet: Sheet) => void;
  setStatus: (status: Status) => void;
  toggleIp: (ip: string) => void;
  clearIps: () => void;
  setQuery: (query: string) => void;
  resetFilters: () => void;
  setSyncedAt: (syncedAt: number | null) => void;
};

export const useUiStore = create<UiState>((set) => ({
  sheet: null,
  status: "all",
  selectedIps: [],
  query: "",
  syncedAt: null,
  setSheet: (sheet) => set({ sheet }),
  setStatus: (status) => set({ status }),
  toggleIp: (ip) => set((s) => ({
    selectedIps: s.selectedIps.includes(ip) ? s.selectedIps.filter((x) => x !== ip) : [...s.selectedIps, ip],
  })),
  clearIps: () => set({ selectedIps: [] }),
  setQuery: (query) => set({ query }),
  resetFilters: () => set({ status: "all", selectedIps: [], query: "" }),
  setSyncedAt: (syncedAt) => set({ syncedAt }),
}));

export const filterCount = (s: UiState) => (s.status === "all" ? 0 : 1) + s.selectedIps.length;
