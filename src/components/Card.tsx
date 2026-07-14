import type { Circle } from "../types";
import { boothShort, chipsFor } from "../lib/circle";
import { LinkChips } from "./LinkChips";

/* ---------- 목록 카드 ---------- */
export function Card({
  item,
  checked,
  onToggle,
  onOpen,
  color,
}: {
  item: Circle;
  checked: boolean;
  onToggle: () => void;
  onOpen: () => void;
  color: string;
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
            background: color,
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
        <div className="text-[13.5px] text-muted leading-[1.5] mt-[9px]">{item.genre}</div>
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
