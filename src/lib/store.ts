import { create } from "zustand";
import type { Sheet } from "../components/BottomNav";
import type { Status } from "./circle";

/** 하단 네비와 체크리스트 화면이 공유하는 UI 상태(시트 + 검색/필터). */
type UiState = {
  sheet: Sheet;
  status: Status;
  selectedIps: string[];
  query: string;
  setSheet: (sheet: Sheet) => void;
  setStatus: (status: Status) => void;
  toggleIp: (ip: string) => void;
  clearIps: () => void;
  setQuery: (query: string) => void;
  resetFilters: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  sheet: null,
  status: "all",
  selectedIps: [],
  query: "",
  setSheet: (sheet) => set({ sheet }),
  setStatus: (status) => set({ status }),
  toggleIp: (ip) => set((s) => ({
    selectedIps: s.selectedIps.includes(ip) ? s.selectedIps.filter((x) => x !== ip) : [...s.selectedIps, ip],
  })),
  clearIps: () => set({ selectedIps: [] }),
  setQuery: (query) => set({ query }),
  resetFilters: () => set({ status: "all", selectedIps: [], query: "" }),
}));

export const filterCount = (s: UiState) => (s.status === "all" ? 0 : 1) + s.selectedIps.length;
