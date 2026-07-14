import type { Chip } from "../lib/circle";

/* ---------- 링크 칩 ---------- */
export function LinkChips({ chips }: { chips: Chip[] }) {
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
