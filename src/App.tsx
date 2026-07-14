import { useEffect, useMemo, useState } from "react";
import type { Circle } from "./types";
import { fetchActiveEvent, fetchCircles } from "./api";
import { badgeColor, filterCircles, STATUS, type Status } from "./lib/circle";
import { useChecks } from "./hooks/useChecks";
import { Card } from "./components/Card";
import { Detail } from "./components/Detail";

const GENRES = ["걸즈밴드크라이", "뱅드림", "케이온", "봇치더록"];

/* ---------- 앱 ---------- */
export default function App() {
  const [checks, toggle] = useChecks();
  const [status, setStatus] = useState<Status>("all");
  const [genres, setGenres] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

  const [circles, setCircles] = useState<Circle[]>([]);
  const [witchformExtra, setWitchformExtra] = useState<Circle[]>([]);
  const [mapUrl, setMapUrl] = useState("https://comicw.net/map/");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const ev = await fetchActiveEvent();
        if (!ev) throw new Error("등록된 행사가 없어요");
        const { circles: cs, witchformExtra: wf } = await fetchCircles(ev.slug);
        if (cancelled) return;
        setCircles(cs);
        setWitchformExtra(wf);
        setMapUrl(ev.map_url || "https://comicw.net/map/");
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "불러오기 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const doneCount = circles.filter((c) => checks[c.id]).length;

  const list = useMemo(
    () => filterCircles(circles, { checks, status, genres, query }),
    [circles, checks, status, genres, query],
  );

  const detail = detailId
    ? circles.find((c) => c.id === detailId) || witchformExtra.find((c) => c.id === detailId)
    : null;

  const statusChip = (active: boolean) =>
    "inline-flex items-center h-[34px] px-4 rounded-full text-[13.5px] font-bold cursor-pointer whitespace-nowrap border " +
    (active ? "bg-ink text-white border-ink" : "bg-card text-[#7b818c] border-line");
  const genreChip = (active: boolean) =>
    "inline-flex items-center h-8 px-[13px] rounded-full text-[13px] font-bold cursor-pointer whitespace-nowrap border " +
    (active ? "bg-accent/10 text-accent border-accent/30" : "bg-card text-[#7b818c] border-line");

  return (
    <div className="min-h-screen bg-bg max-w-[520px] mx-auto">
      {detail ? (
        <Detail
          item={detail}
          checked={!!checks[detail.id]}
          onToggle={() => toggle(detail.id)}
          onBack={() => setDetailId(null)}
          color={badgeColor(detail.id, circles)}
        />
      ) : (
        <div className="pb-7">
          {/* sticky 헤더 */}
          <div className="sticky top-0 z-10 bg-bg px-5 pt-[22px] pb-3">
            <div className="mb-4">
              <div className="text-[22px] font-extrabold -tracking-[0.02em] text-ink leading-none">
                걸밴크 서코
              </div>
              <div className="text-xs font-semibold text-faint mt-[5px]">
                334회 · 7코 일산 킨텍스 · 7/18–19
              </div>
            </div>

            <div className="flex items-center gap-2.5 h-12 bg-card border border-line rounded-[14px] px-3.5">
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="#9aa0aa"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4-4" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="서클 · 부스 · 장르 검색"
                className="flex-1 min-w-0 border-0 outline-none bg-transparent text-[16px] text-ink placeholder:text-faint"
              />
              {query ? (
                <button
                  onClick={() => setQuery("")}
                  title="검색 초기화"
                  aria-label="검색 초기화"
                  className="flex items-center"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="#9aa0aa"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              ) : (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="전체 부스배치도"
                  className="flex items-center"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="#9aa0aa"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </a>
              )}
            </div>

            <div className="flex gap-2 mt-3.5">
              {STATUS.map((s) => (
                <button
                  key={s.k}
                  onClick={() => setStatus(s.k)}
                  className={statusChip(status === s.k)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* 장르 칩 (가로 스크롤) */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 pt-1 pb-0.5">
            <button onClick={() => setGenres([])} className={genreChip(genres.length === 0)}>
              전체 장르
            </button>
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() =>
                  setGenres((prev) =>
                    prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
                  )
                }
                className={genreChip(genres.includes(g))}
              >
                {g}
              </button>
            ))}
          </div>

          {/* 진행 표시 */}
          <div className="flex items-center justify-between px-[22px] pt-3.5 pb-2">
            <div className="text-[12.5px] font-bold text-faint">참가 서클 {list.length}곳</div>
            <div className="text-[12.5px] font-bold text-accent">
              방문 {doneCount}/{circles.length}
            </div>
          </div>

          {/* 카드 목록 */}
          <div className="flex flex-col gap-3 px-5">
            {loadError && (
              <div className="text-center py-14 text-[#e0455c] text-sm font-semibold">
                {loadError} · 새로고침해서 다시 시도해주세요
              </div>
            )}
            {!loadError && loading && circles.length === 0 && (
              <div className="text-center py-14 text-[#b0b4bc] text-sm font-semibold">
                불러오는 중...
              </div>
            )}
            {!loadError &&
              list.map((c) => (
                <Card
                  key={c.id}
                  item={c}
                  checked={!!checks[c.id]}
                  onToggle={() => toggle(c.id)}
                  onOpen={() => setDetailId(c.id)}
                  color={badgeColor(c.id, circles)}
                />
              ))}
            {!loadError && !loading && list.length === 0 && (
              <div className="text-center py-14 text-[#b0b4bc] text-sm font-semibold">
                조건에 맞는 서클이 없어요
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
