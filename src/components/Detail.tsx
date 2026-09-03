import { useEffect, useRef, useState } from "react";
import type { Circle } from "../types";
import { boothShort } from "../lib/circle";
import { TweetCard } from "./TweetCard";

export function Detail({
  item,
  checked,
  onToggle,
  onBack,
  color,
  starred = false,
  memo = "",
  onStar,
  onUpdateMemo,
}: {
  item: Circle;
  checked: boolean;
  onToggle: () => void;
  onBack: () => void;
  color: string;
  starred?: boolean;
  memo?: string;
  onStar?: () => void;
  onUpdateMemo?: (memo: string) => void;
}) {
  const backRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    backRef.current?.focus();
  }, [item.id]);

  const [localMemo, setLocalMemo] = useState(memo);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const localMemoRef = useRef(localMemo);
  localMemoRef.current = localMemo;
  const onUpdateMemoRef = useRef(onUpdateMemo);
  onUpdateMemoRef.current = onUpdateMemo;
  const externalMemoRef = useRef(memo);
  externalMemoRef.current = memo;

  useEffect(() => {
    setLocalMemo(memo);
  }, [item.id, memo]);

  const flushMemo = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = undefined;
    }
    if (localMemoRef.current !== externalMemoRef.current) {
      onUpdateMemoRef.current?.(localMemoRef.current);
    }
  };

  useEffect(() => {
    return () => {
      flushMemo();
    };
  }, [item.id]);

  const handleMemoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value.slice(0, 500);
    setLocalMemo(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onUpdateMemoRef.current?.(next);
    }, 300);
  };

  const handleMemoBlur = () => {
    flushMemo();
  };

  const handleStarClick = () => {
    flushMemo();
    onStar?.();
  };

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
      <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur flex items-center gap-1.5 px-4 pt-5 pb-3.5 border-b border-line">
        <button
          ref={backRef}
          onClick={onBack}
          aria-label="목록으로 뒤로"
          className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer bg-transparent border-0 text-ink"
        >
          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="text-[15px] font-bold text-ink">서클 상세</span>
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
            ★ {item.badge ?? "전문"} 서클
          </div>
        )}

        {item.ips && item.ips.length > 0 && (
          <div className="flex flex-wrap gap-[7px] mt-3.5">
            {item.ips.map((g) => (
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
            <div className="text-sm text-muted leading-[1.65] bg-card border border-line rounded-[10px] px-4 py-[15px]">
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

        {onUpdateMemo && (
          <div className="mt-6">
            <label htmlFor="circle-memo" className="text-xs font-extrabold tracking-[0.04em] text-faint">메모</label>
            <textarea
              id="circle-memo"
              maxLength={500}
              value={localMemo}
              onChange={handleMemoChange}
              onBlur={handleMemoBlur}
              className="mt-2 w-full min-h-24 resize-y rounded-xl border border-line bg-card p-3 text-sm text-ink outline-none"
            />
            <div className="mt-1 text-right text-xs text-faint">{localMemo.length}/500</div>
          </div>
        )}

        <div className="sticky bottom-0 mt-[26px] pt-3 pb-[calc(24px+env(safe-area-inset-bottom))] bg-bg/95 backdrop-blur flex gap-2">
          {onStar && (
            <button
              type="button"
              onClick={handleStarClick}
              aria-pressed={starred}
              aria-label={`${item.name} 찜 ${starred ? "해제" : "하기"}`}
              className={
                "flex items-center justify-center w-12 h-12 rounded-xl border text-lg font-extrabold cursor-pointer transition-colors shrink-0 md:w-[54px] md:h-[54px] md:rounded-2xl md:text-xl " +
                (starred ? "text-amber-500 border-amber-500/30 bg-amber-500/10" : "text-faint hover:text-muted border-line bg-card hover:bg-chip")
              }
            >
              {starred ? "★" : "☆"}
            </button>
          )}
          <button
            onClick={onToggle}
            className={
              "flex items-center justify-center gap-2 w-full h-12 rounded-xl text-[15.5px] font-extrabold cursor-pointer border-0 text-white md:h-[54px] md:rounded-2xl " +
              (checked ? "bg-accent" : "bg-ink text-bg")
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
    </div>
  );
}
