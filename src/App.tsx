import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { event, circles } from "./data";
import type { Circle } from "./data";

const STORAGE_KEY = "gbc-seoko-2026-07-checks";

type Checks = Record<string, boolean>;

function useChecks(): [Checks, (id: string) => void, Dispatch<SetStateAction<Checks>>] {
  const [checks, setChecks] = useState<Checks>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checks));
  }, [checks]);
  const toggle = (id: string) => setChecks((c) => ({ ...c, [id]: !c[id] }));
  return [checks, toggle, setChecks];
}

const linkChip =
  "text-[13px] no-underline text-accent2 bg-[#12142b] border border-line px-[11px] py-1.5 rounded-lg font-semibold hover:border-accent2 hover:text-white";
const boothChip =
  "text-[13px] no-underline text-[#7ee0a8] bg-[#10241a] border border-[#275c3f] px-[11px] py-1.5 rounded-lg font-bold hover:border-[#7ee0a8] hover:text-[#d6ffe6]";

function Card({ item, checked, onToggle }: { item: Circle; checked: boolean; onToggle: () => void }) {
  // bg/border는 상태별로 하나만 출력 (bg-card + bg-done 동시 지정 시 우선순위가 불명확)
  const cardCls = [
    "rounded-[14px] border px-4 py-3.5 mb-3 transition-[border-color,opacity,background-color] duration-150",
    item.highlight ? "border-[#4a2f66]" : "border-line",
    checked ? "bg-done opacity-[0.72]" : item.highlight ? "bg-card-hl" : "bg-card",
  ].join(" ");

  return (
    <div className={cardCls}>
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-[3px] w-[18px] h-[18px] accent-accent flex-none"
        />
        <span className="flex flex-wrap items-center gap-2">
          {item.booth && (
            <span className="font-mono text-xs bg-[#0d0f22] border border-line text-accent2 px-2 py-0.5 rounded-md">
              {item.booth}
            </span>
          )}
          <span className={"font-bold text-base" + (checked ? " line-through" : "")}>{item.name}</span>
          {item.day && (
            <span className="text-[11px] text-muted border border-line px-[7px] py-px rounded-full">
              {item.day}
            </span>
          )}
          {item.highlight && (
            <span className="text-[11px] bg-accent text-white px-2 py-0.5 rounded-full font-bold">
              걸밴크 전문
            </span>
          )}
        </span>
      </label>
      <div className="text-muted text-[13px] mt-2 ml-7">{item.genre}</div>
      {item.note && <div className="text-[#ffd7a1] text-[12.5px] mt-1.5 ml-7 leading-[1.5]">{item.note}</div>}
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
  const [checks, toggle, setChecks] = useChecks();
  const doneCount = circles.filter((i) => checks[i.id]).length;

  return (
    <div className="max-w-[780px] mx-auto px-[18px] pt-7 pb-20">
      <header>
        <h1 className="text-[26px] font-bold mb-3.5 tracking-[-0.5px]">🎸 걸즈밴드크라이 @ 7월 서코</h1>
        <div className="bg-[linear-gradient(135deg,#221a3d,#16233f)] border border-line rounded-2xl px-[18px] py-4">
          <strong className="text-lg">{event.title}</strong>
          <span className="ml-2 text-xs text-muted border border-line px-2 py-0.5 rounded-full">
            {event.alias}
          </span>
          <div className="mt-2 text-muted text-sm">
            📅 {event.date} · 📍 {event.venue}
          </div>
          <a
            className="inline-block mt-2.5 text-accent2 no-underline text-sm font-semibold hover:underline"
            href={event.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            서울코믹월드 전체 부스배치도 ↗
          </a>
          <div className="mt-2.5 text-xs leading-[1.6] text-muted bg-[#0d0f22] border border-line rounded-[10px] px-[11px] py-[9px] [&_b]:text-[#7ee0a8]">
            ✅ 각 카드의 <b>📍 배치도 확인</b> 버튼 = 서울코믹월드 공식 부스배치도의 해당 부스로 바로 열립니다 (이번 서코 참가 증거).
            X/윗치폼 링크는 서클 연락처/판매 채널입니다.
          </div>
        </div>
        <div className="flex items-center gap-3 mt-[18px] mx-0.5 mb-1.5 text-sm text-muted">
          체크 {doneCount} / {circles.length}
          <button
            className="ml-auto bg-transparent border border-line text-muted rounded-full px-3 py-1 cursor-pointer text-xs hover:text-text hover:border-accent"
            onClick={() => setChecks({})}
          >
            초기화
          </button>
        </div>
      </header>

      <section>
        <h2 className="text-[15px] text-muted mt-[26px] mx-0.5 mb-3 font-bold">
          참가 서클 (서울코믹월드 배치도 기준 · 모두 양일)
        </h2>
        {circles.map((c) => (
          <Card key={c.id} item={c} checked={!!checks[c.id]} onToggle={() => toggle(c.id)} />
        ))}
      </section>

      <footer className="mt-9 text-muted text-xs leading-[1.6] border-t border-line pt-4">
        <p>
          출처: 서울코믹월드(comicw.net) 부스배치도 · 윗치폼(witchform.com) · X — 2026-07-01 기준.
          체크 상태는 이 브라우저에 저장됩니다.
        </p>
      </footer>
    </div>
  );
}
