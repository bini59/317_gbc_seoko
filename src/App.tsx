import { useEffect, useState } from "react";
import { event, circles } from "./data";
import type { Circle } from "./data";

const STORAGE_KEY = "gbc-seoko-2026-07-checks";

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
      // storage unavailable (private mode / quota) — checks stay in-memory
    }
  }, [checks]);
  const toggle = (id: string) => setChecks((c) => ({ ...c, [id]: !c[id] }));
  return [checks, toggle, () => setChecks({})];
}

const linkChip =
  "text-xs font-mono uppercase tracking-wider no-underline text-ink border border-ink px-2.5 py-1.5 hover:bg-ink hover:text-paper transition-colors duration-200";
const boothChip =
  "text-xs font-mono uppercase tracking-wider no-underline bg-ink text-paper border border-ink px-2.5 py-1.5 hover:bg-paper hover:text-ink transition-colors duration-200";

function Card({ item, checked, onToggle }: { item: Circle; checked: boolean; onToggle: () => void }) {
  // Newsprint: 라운드 0, 잉크 보더. 하이라이트는 빨간 좌측 룰, 체크 완료는 회지 배경.
  const cardCls = [
    "border border-ink px-4 py-3.5 mb-3 transition-colors duration-200",
    item.highlight ? "border-l-4 border-l-accent" : "",
    checked ? "bg-divider opacity-70" : "bg-paper hover:bg-neutral-100",
  ].join(" ");

  return (
    <div className={cardCls}>
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-[3px] w-[18px] h-[18px] accent-ink flex-none"
        />
        <span className="flex flex-wrap items-center gap-2">
          {item.booth && (
            <span className="font-mono text-xs border border-ink px-2 py-0.5">{item.booth}</span>
          )}
          <span className={"font-serif font-bold text-lg leading-tight" + (checked ? " line-through" : "")}>
            {item.name}
          </span>
          {item.day && (
            <span className="text-[11px] font-mono uppercase text-neutral-500 border border-neutral-400 px-[7px] py-px">
              {item.day}
            </span>
          )}
          {item.highlight && (
            <span className="text-[11px] font-mono uppercase tracking-wider bg-accent text-white px-2 py-0.5 font-bold">
              걸밴크 전문
            </span>
          )}
        </span>
      </label>
      <div className="text-neutral-500 text-[13px] mt-2 ml-7">{item.genre}</div>
      {item.note && (
        <div className="text-neutral-600 italic text-[12.5px] mt-1.5 ml-7 leading-[1.5]">{item.note}</div>
      )}
      <div className="flex flex-wrap gap-2 mt-3 ml-7">
        {item.boothUrl && (
          <a className={boothChip} href={item.boothUrl} target="_blank" rel="noopener noreferrer">
            📍 배치도 {item.booth} 확인 ↗
          </a>
        )}
        {item.links.map((l) => (
          <a key={l.url} className={linkChip} href={l.url} target="_blank" rel="noopener noreferrer">
            {l.label} ↗
          </a>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [checks, toggle, resetChecks] = useChecks();
  const doneCount = circles.filter((i) => checks[i.id]).length;

  return (
    <div className="max-w-[780px] mx-auto px-[18px] pt-7 pb-20">
      <header>
        <div className="border-b-4 border-ink pb-3 mb-4">
          <div className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-2">
            Vol. 1 · {event.date} · Seoul Comic World Edition
          </div>
          <h1 className="font-serif font-black text-4xl sm:text-5xl tracking-tighter leading-[0.95]">
            걸즈밴드크라이 @ 7월 서코
          </h1>
        </div>
        <div className="border border-ink bg-paper px-[18px] py-4">
          <strong className="font-serif text-xl font-bold">{event.title}</strong>
          <span className="ml-2 font-mono text-xs uppercase text-neutral-500 border border-neutral-400 px-2 py-0.5">
            {event.alias}
          </span>
          <div className="mt-2 text-neutral-600 text-sm">
            📅 {event.date} · 📍 {event.venue}
          </div>
          <a
            className="inline-block mt-2.5 text-ink text-sm font-semibold underline-offset-4 decoration-2 decoration-accent hover:underline"
            href={event.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            서울코믹월드 전체 부스배치도 ↗
          </a>
          <div className="mt-2.5 text-xs leading-[1.6] text-neutral-600 bg-neutral-100 border border-divider px-[11px] py-[9px] [&_b]:text-ink">
            ✅ 각 카드의 <b>📍 배치도 확인</b> 버튼 = 서울코믹월드 공식 부스배치도의 해당 부스로 바로 열립니다 (이번 서코 참가 증거).
            X/윗치폼 링크는 서클 연락처/판매 채널입니다.
          </div>
        </div>
        <div className="flex items-center gap-3 mt-[18px] mx-0.5 mb-1.5 font-mono text-sm text-neutral-600">
          체크 {doneCount} / {circles.length}
          <button
            className="ml-auto bg-transparent border border-ink text-ink px-3 py-1.5 cursor-pointer font-mono text-xs uppercase tracking-wider hover:bg-ink hover:text-paper transition-colors duration-200"
            onClick={resetChecks}
          >
            초기화
          </button>
        </div>
      </header>

      <section>
        <h2 className="font-mono text-xs uppercase tracking-widest font-bold border-b border-ink pb-2 mt-8 mx-0.5 mb-3">
          참가 서클 (서울코믹월드 배치도 기준 · 모두 양일)
        </h2>
        {circles.map((c) => (
          <Card key={c.id} item={c} checked={!!checks[c.id]} onToggle={() => toggle(c.id)} />
        ))}
      </section>

      <footer className="mt-9 font-mono text-neutral-500 text-xs leading-[1.6] border-t-4 border-ink pt-4">
        <p>
          출처: 서울코믹월드(comicw.net) 부스배치도 · 윗치폼(witchform.com) · X — 2026-07-01 기준.
          체크 상태는 이 브라우저에 저장됩니다.
        </p>
      </footer>
    </div>
  );
}
