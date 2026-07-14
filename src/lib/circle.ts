import type { Circle } from "../types";

/* 카드 앞 아이콘(부스 배지) 색상 팔레트 */
export const BADGE = [
  "#3e5bff",
  "#7c5cff",
  "#f43f72",
  "#0ea5a5",
  "#f59e0b",
  "#6366f1",
  "#22a559",
];

export const badgeColor = (id: string, circles: Circle[]) => {
  const i = circles.findIndex((c) => c.id === id);
  return BADGE[(i < 0 ? 2 : i) % BADGE.length];
};

/* 연속 부스(BE01·BE02)는 앞쪽만. 부스 없으면 이름 첫 글자. */
export const boothShort = (c: Circle) =>
  c.booth ? c.booth.split("·")[0].trim() : (c.name || "?").trim().charAt(0);

/* 링크 URL → 짧은 칩 라벨 */
export const chipLabel = (url: string) => {
  if (/comicw\.net\/map/.test(url)) return "배치도";
  if (/comicw\.net\/g/.test(url)) return "샵";
  if (/witchform/.test(url)) return "윗치폼";
  if (/instagram/.test(url)) return "Insta";
  if (/x\.com|twitter/.test(url)) return "X";
  return "링크";
};

export type Chip = { label: string; full: string; url: string; primary: boolean };

export const chipsFor = (c: Circle): Chip[] => {
  const out: Chip[] = [];
  if (c.boothUrl)
    out.push({
      label: "배치도",
      full: `배치도에서 ${c.booth ?? ""} 확인`,
      url: c.boothUrl,
      primary: true,
    });
  c.links.forEach((l) =>
    out.push({ label: chipLabel(l.url), full: l.label, url: l.url, primary: false }),
  );
  return out;
};

export const norm = (s: string) => s.replace(/\s/g, "");

/** 서클 데이터에 실제로 존재하는 장르 목록(중복 제거·정렬). 필터 칩 생성용. */
export function deriveGenres(circles: Circle[]): string[] {
  const set = new Set<string>();
  for (const c of circles) {
    for (const g of c.genres || []) {
      const t = g.trim();
      if (t) set.add(t);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, "ko"));
}

export type Status = "all" | "done" | "undone";
export const STATUS: { k: Status; label: string }[] = [
  { k: "all", label: "전체" },
  { k: "done", label: "체크함" },
  { k: "undone", label: "안 본 것" },
];

export type CircleFilter = {
  checks: Record<string, boolean>;
  status: Status;
  genres: string[];
  query: string;
};

/** 순수 검색/필터/정렬 — React 없이 테스트 가능. */
export function filterCircles(circles: Circle[], f: CircleFilter): Circle[] {
  const q = norm(f.query.toLowerCase());
  return circles
    .filter((c) => {
      if (f.status === "done" && !f.checks[c.id]) return false;
      if (f.status === "undone" && f.checks[c.id]) return false;
      if (f.genres.length > 0) {
        const hay = norm(c.genre) + norm((c.genres || []).join(""));
        if (!f.genres.some((g) => hay.includes(norm(g)))) return false;
      }
      if (q) {
        const hay = norm(
          (c.name + c.genre + (c.booth || "") + (c.genres || []).join("")).toLowerCase(),
        );
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (!a.booth !== !b.booth) return a.booth ? -1 : 1; // 통판(부스 없음)은 뒤로
      return (a.booth || a.name).localeCompare(b.booth || b.name, "ko", { numeric: true });
    });
}
