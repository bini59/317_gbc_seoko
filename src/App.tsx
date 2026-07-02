import { useEffect, useMemo, useState } from "react";
import { circles, witchformExtra, event } from "./data";
import type { Circle } from "./data";

const STORAGE_KEY = "gbc-seoko-2026-07-checks";

/* 카드 앞 아이콘(부스 배지) 색상 팔레트 */
const BADGE = [
  "#3e5bff",
  "#7c5cff",
  "#f43f72",
  "#0ea5a5",
  "#f59e0b",
  "#6366f1",
  "#22a559",
];
const badgeColor = (id: string) => {
  const i = circles.findIndex((c) => c.id === id);
  return BADGE[(i < 0 ? 2 : i) % BADGE.length];
};

/* 연속 부스(BE01·BE02)는 앞쪽만. 부스 없으면 이름 첫 글자. */
const boothShort = (c: Circle) =>
  c.booth ? c.booth.split("·")[0].trim() : (c.name || "?").trim().charAt(0);

/* 링크 URL → 짧은 칩 라벨 */
const chipLabel = (url: string) => {
  if (/comicw\.net\/map/.test(url)) return "배치도";
  if (/comicw\.net\/g/.test(url)) return "샵";
  if (/witchform/.test(url)) return "윗치폼";
  if (/instagram/.test(url)) return "Insta";
  if (/x\.com|twitter/.test(url)) return "X";
  return "링크";
};

type Chip = { label: string; full: string; url: string; primary: boolean };
const chipsFor = (c: Circle): Chip[] => {
  const out: Chip[] = [];
  if (c.boothUrl)
    out.push({
      label: "배치도",
      full: `배치도에서 ${c.booth ?? ""} 확인`,
      url: c.boothUrl,
      primary: true,
    });
  c.links.forEach((l) =>
    out.push({
      label: chipLabel(l.url),
      full: l.label,
      url: l.url,
      primary: false,
    }),
  );
  return out;
};

const norm = (s: string) => s.replace(/\s/g, "");

/* ---------- 체크(방문) 상태: localStorage ---------- */
type Checks = Record<string, boolean>;
function useChecks(): [Checks, (id: string) => void, () => void] {
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

type Status = "all" | "done" | "undone";
const STATUS: { k: Status; label: string }[] = [
  { k: "all", label: "전체" },
  { k: "done", label: "체크함" },
  { k: "undone", label: "안 본 것" },
];
const GENRES = ["걸즈밴드크라이", "뱅드림", "케이온", "봇치더록"];

/* ---------- 링크 칩 ---------- */
function LinkChips({ chips }: { chips: Chip[] }) {
  return (
    <div className="flex flex-wrap gap-[7px] mt-3">
      {chips.map((lk) => (
        <a
          key={lk.url}
          href={lk.url}
          target="_blank"
          rel="noopener noreferrer"
          title={lk.full}
          className={
            "inline-flex items-center gap-0.5 h-7 px-[11px] rounded-lg text-xs font-bold no-underline " +
            (lk.primary ? "bg-accent/10 text-accent" : "bg-chip text-[#4b5563]")
          }
        >
          {lk.label} ↗
        </a>
      ))}
    </div>
  );
}

/* ---------- 목록 카드 ---------- */
function Card({
  item,
  checked,
  onToggle,
  onOpen,
}: {
  item: Circle;
  checked: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const short = boothShort(item);
  const cardCls = [
    "relative rounded-[18px] p-4 bg-card border transition-colors",
    item.highlight
      ? "border-transparent ring-[1.6px] ring-accent/40"
      : "border-[#eeeff2] shadow-[0_1px_2px_rgba(20,22,30,0.04)]",
    checked ? "!bg-[#f3f5f8] opacity-80" : "",
  ].join(" ");

  return (
    <div className={cardCls}>
      <div className="flex items-start gap-[11px]">
        <div
          className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center text-white font-extrabold flex-none -tracking-[0.02em]"
          style={{
            background: badgeColor(item.id),
            fontSize: short.length > 2 ? 11 : 15,
          }}
        >
          {short}
        </div>
        <button
          onClick={onOpen}
          className="flex-1 min-w-0 text-left bg-transparent border-0 p-0 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold tracking-[0.05em] text-faint">
              {(item.booth || "통판").toUpperCase()}
            </span>
            {item.highlight && (
              <span className="inline-flex items-center h-5 px-2 rounded-md bg-accent/10 text-accent text-[10.5px] font-extrabold">
                {item.badge ?? "걸밴크 전문"}
              </span>
            )}
          </div>
          <div
            className={
              "text-[16.5px] font-extrabold -tracking-[0.01em] text-ink leading-[1.28] mt-0.5 " +
              (checked ? "line-through decoration-[#b8bcc4]" : "")
            }
          >
            {item.name}
          </div>
        </button>
        <button
          onClick={onToggle}
          aria-label={checked ? "방문 체크 해제" : "방문 체크"}
          className={
            "w-[26px] h-[26px] rounded-full flex items-center justify-center flex-none border-2 cursor-pointer transition-colors " +
            (checked ? "bg-accent border-accent" : "bg-white border-[#d5d7de]")
          }
        >
          {checked && (
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="#fff"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </button>
      </div>

      <button
        onClick={onOpen}
        className="block w-full text-left bg-transparent border-0 p-0 cursor-pointer"
      >
        <div className="text-[13.5px] text-muted leading-[1.5] mt-[9px]">
          {item.genre}
        </div>
      </button>

      {item.note && (
        <div className="text-[12.5px] text-[#8a8f98] leading-[1.55] mt-[7px] bg-[#f6f7f9] rounded-[10px] px-[11px] py-[9px]">
          {item.note}
        </div>
      )}

      {item.genres && item.genres.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-[11px]">
          {item.genres.map((g) => (
            <span
              key={g}
              className="inline-flex items-center h-6 px-[9px] rounded-md bg-chip text-[#5b6270] text-[11.5px] font-bold"
            >
              {g}
            </span>
          ))}
        </div>
      )}

      <LinkChips chips={chipsFor(item)} />
    </div>
  );
}

/* ---------- 상세 화면 ---------- */
function Detail({
  item,
  checked,
  onToggle,
  onBack,
}: {
  item: Circle;
  checked: boolean;
  onToggle: () => void;
  onBack: () => void;
}) {
  const short = boothShort(item);
  const links: { label: string; url: string; primary: boolean }[] = [];
  if (item.boothUrl)
    links.push({
      label: `📍 배치도에서 ${item.booth} 확인`,
      url: item.boothUrl,
      primary: true,
    });
  item.links.forEach((l) =>
    links.push({ label: l.label, url: l.url, primary: false }),
  );

  return (
    <div>
      <div className="sticky top-0 z-10 bg-bg flex items-center gap-1.5 px-4 pt-5 pb-3.5">
        <button
          onClick={onBack}
          aria-label="뒤로"
          className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer bg-transparent border-0"
        >
          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="none"
            stroke="#17181c"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="text-[15px] font-bold text-[#3a3d44]">서클 상세</span>
      </div>

      <div className="px-[22px] pt-1.5">
        <div className="flex items-center gap-3.5">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-extrabold flex-none -tracking-[0.02em]"
            style={{
              background: badgeColor(item.id),
              fontSize: short.length > 2 ? 17 : 24,
            }}
          >
            {short}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-extrabold tracking-[0.05em] text-faint">
              {(item.booth || "윗치폼 통판").toUpperCase()}
            </div>
            <div className="text-[23px] font-extrabold -tracking-[0.02em] text-ink leading-[1.15] mt-[3px]">
              {item.name}
            </div>
          </div>
        </div>

        {item.highlight && (
          <div className="inline-flex items-center h-7 px-3 rounded-full mt-4 bg-accent/10 text-accent text-[12.5px] font-extrabold">
            ★ {item.badge ?? "걸밴크 전문"} 서클
          </div>
        )}

        <div className="text-[15px] text-[#4b5563] leading-[1.6] mt-4">
          {item.genre}
        </div>

        {item.genres && item.genres.length > 0 && (
          <div className="flex flex-wrap gap-[7px] mt-3.5">
            {item.genres.map((g) => (
              <span
                key={g}
                className="inline-flex items-center h-7 px-[11px] rounded-lg bg-chip text-[#5b6270] text-[12.5px] font-bold"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {item.note && (
          <div className="mt-5">
            <div className="text-xs font-extrabold tracking-[0.04em] text-faint mb-2">
              MEMO
            </div>
            <div className="text-sm text-[#4b5563] leading-[1.65] bg-card border border-line rounded-2xl px-4 py-[15px]">
              {item.note}
            </div>
          </div>
        )}

        <div className="mt-[22px]">
          <div className="text-xs font-extrabold tracking-[0.04em] text-faint mb-2.5">
            링크
          </div>
          <div className="flex flex-col gap-[9px]">
            {links.map((lk) => (
              <a
                key={lk.url}
                href={lk.url}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  "flex items-center justify-between h-[52px] px-[18px] rounded-2xl text-[14.5px] no-underline border " +
                  (lk.primary
                    ? "border-transparent bg-accent/10 text-accent font-extrabold"
                    : "border-line bg-card text-ink font-bold")
                }
              >
                <span>{lk.label}</span>
                <svg
                  viewBox="0 0 24 24"
                  width="17"
                  height="17"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 17L17 7" />
                  <path d="M8 7h9v9" />
                </svg>
              </a>
            ))}
          </div>
        </div>

        <button
          onClick={onToggle}
          className={
            "flex items-center justify-center gap-2 w-full h-[54px] mt-[26px] mb-6 rounded-2xl text-[15.5px] font-extrabold cursor-pointer border-0 text-white " +
            (checked ? "bg-accent" : "bg-ink")
          }
        >
          {checked && (
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
          <span>{checked ? "방문함" : "방문 체크"}</span>
        </button>
      </div>
    </div>
  );
}

/* ---------- 앱 ---------- */
export default function App() {
  const [checks, toggle, resetChecks] = useChecks();
  const [status, setStatus] = useState<Status>("all");
  const [genre, setGenre] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

  const doneCount = circles.filter((c) => checks[c.id]).length;

  const list = useMemo(() => {
    const q = norm(query.toLowerCase());
    return circles.filter((c) => {
      if (status === "done" && !checks[c.id]) return false;
      if (status === "undone" && checks[c.id]) return false;
      if (genre !== "all") {
        const hay = norm(c.genre) + norm((c.genres || []).join(""));
        if (!hay.includes(norm(genre))) return false;
      }
      if (q) {
        const hay = norm(
          (
            c.name +
            c.genre +
            (c.booth || "") +
            (c.genres || []).join("")
          ).toLowerCase(),
        );
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [checks, status, genre, query]);

  const detail = detailId
    ? circles.find((c) => c.id === detailId) ||
      witchformExtra.find((c) => c.id === detailId)
    : null;

  const statusChip = (active: boolean) =>
    "inline-flex items-center h-[34px] px-4 rounded-full text-[13.5px] font-bold cursor-pointer whitespace-nowrap border " +
    (active
      ? "bg-ink text-white border-ink"
      : "bg-card text-[#7b818c] border-line");
  const genreChip = (active: boolean) =>
    "inline-flex items-center h-8 px-[13px] rounded-full text-[13px] font-bold cursor-pointer whitespace-nowrap border " +
    (active
      ? "bg-accent/10 text-accent border-accent/30"
      : "bg-card text-[#7b818c] border-line");

  return (
    <div className="min-h-screen bg-bg max-w-[520px] mx-auto">
      {detail ? (
        <Detail
          item={detail}
          checked={!!checks[detail.id]}
          onToggle={() => toggle(detail.id)}
          onBack={() => setDetailId(null)}
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
                className="flex-1 border-0 outline-none bg-transparent text-[15px] text-ink placeholder:text-faint"
              />
              <a
                href={event.mapUrl}
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
            <button
              onClick={() => setGenre("all")}
              className={genreChip(genre === "all")}
            >
              전체 장르
            </button>
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => setGenre(g)}
                className={genreChip(genre === g)}
              >
                {g}
              </button>
            ))}
          </div>

          {/* 진행 표시 */}
          <div className="flex items-center justify-between px-[22px] pt-3.5 pb-2">
            <div className="text-[12.5px] font-bold text-faint">
              참가 서클 {list.length}곳
            </div>
            <div className="text-[12.5px] font-bold text-accent">
              방문 {doneCount}/{circles.length}
            </div>
          </div>

          {/* 카드 목록 */}
          <div className="flex flex-col gap-3 px-5">
            {list.map((c) => (
              <Card
                key={c.id}
                item={c}
                checked={!!checks[c.id]}
                onToggle={() => toggle(c.id)}
                onOpen={() => setDetailId(c.id)}
              />
            ))}
            {list.length === 0 && (
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
