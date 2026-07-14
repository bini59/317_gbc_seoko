import { useEffect, useRef } from "react";
import type { Circle } from "../types";
import { boothShort } from "../lib/circle";
import { TweetCard } from "./TweetCard";

/* ---------- 상세 화면 ---------- */
export function Detail({
  item,
  checked,
  onToggle,
  onBack,
  color,
}: {
  item: Circle;
  checked: boolean;
  onToggle: () => void;
  onBack: () => void;
  color: string;
}) {
  const backRef = useRef<HTMLButtonElement>(null);
  // 상세 진입 시 포커스를 상세 컨텍스트(뒤로 버튼)로 이동 — 키보드/스크린리더 대응
  useEffect(() => {
    backRef.current?.focus();
  }, [item.id]);

  const short = boothShort(item);
  const links: { label: string; url: string; primary: boolean }[] = [];
  if (item.boothUrl)
    links.push({
      label: `📍 배치도에서 ${item.booth} 확인`,
      url: item.boothUrl,
      primary: true,
    });
  item.links.forEach((l) => links.push({ label: l.label, url: l.url, primary: false }));

  return (
    <div>
      <div className="sticky top-0 z-10 bg-bg flex items-center gap-1.5 px-4 pt-5 pb-3.5">
        <button
          ref={backRef}
          onClick={onBack}
          aria-label="목록으로 뒤로"
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
              background: color,
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

        <div className="text-[15px] text-[#4b5563] leading-[1.6] mt-4">{item.genre}</div>

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
            <div className="text-xs font-extrabold tracking-[0.04em] text-faint mb-2">MEMO</div>
            <div className="text-sm text-[#4b5563] leading-[1.65] bg-card border border-line rounded-2xl px-4 py-[15px]">
              {item.note}
            </div>
          </div>
        )}

        {item.tweetInfo && (
          <div className="mt-5">
            <div className="text-xs font-extrabold tracking-[0.04em] text-faint mb-2">
              참가 공지 (X)
            </div>
            <TweetCard tweet={item.tweetInfo} />
          </div>
        )}

        <div className="mt-[22px]">
          <div className="text-xs font-extrabold tracking-[0.04em] text-faint mb-2.5">링크</div>
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
