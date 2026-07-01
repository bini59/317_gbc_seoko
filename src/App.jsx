import { useEffect, useMemo, useState } from "react";
import { event, circles, witchformExtra } from "./data.js";

const STORAGE_KEY = "gbc-seoko-2026-07-checks";

function useChecks() {
  const [checks, setChecks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checks));
  }, [checks]);
  const toggle = (id) => setChecks((c) => ({ ...c, [id]: !c[id] }));
  return [checks, toggle, setChecks];
}

function Card({ item, checked, onToggle }) {
  return (
    <div className={"card" + (checked ? " done" : "") + (item.highlight ? " hl" : "")}>
      <label className="card-head">
        <input type="checkbox" checked={!!checked} onChange={onToggle} />
        <span className="card-title">
          {item.booth && <span className="booth">{item.booth}</span>}
          <span className="name">{item.name}</span>
          {item.day && <span className="day">{item.day}</span>}
          {item.highlight && <span className="badge">걸밴크 전문</span>}
        </span>
      </label>
      <div className="genre">{item.genre}</div>
      {item.note && <div className="note">{item.note}</div>}
      <div className="links">
        {item.links.map((l) => (
          <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer">
            {l.label} ↗
          </a>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [checks, toggle, setChecks] = useChecks();
  const allItems = useMemo(() => [...circles, ...witchformExtra], []);
  const doneCount = allItems.filter((i) => checks[i.id]).length;

  return (
    <div className="wrap">
      <header>
        <h1>🎸 걸즈밴드크라이 @ 7월 서코</h1>
        <div className="event">
          <strong>{event.title}</strong>
          <span className="alias">{event.alias}</span>
          <div className="meta">
            📅 {event.date} · 📍 {event.venue}
          </div>
          <a className="map" href={event.mapUrl} target="_blank" rel="noopener noreferrer">
            서울코믹월드 부스배치도 ↗
          </a>
        </div>
        <div className="progress">
          체크 {doneCount} / {allItems.length}
          <button className="reset" onClick={() => setChecks({})}>
            초기화
          </button>
        </div>
      </header>

      <section>
        <h2>참가 서클 (서울코믹월드 배치도 기준 · 모두 양일)</h2>
        {circles.map((c) => (
          <Card key={c.id} item={c} checked={checks[c.id]} onToggle={() => toggle(c.id)} />
        ))}
      </section>

      <section>
        <h2>윗치폼 추가 통판</h2>
        {witchformExtra.map((c) => (
          <Card key={c.id} item={c} checked={checks[c.id]} onToggle={() => toggle(c.id)} />
        ))}
      </section>

      <footer>
        <p>
          출처: 서울코믹월드(comicw.net) 부스배치도 · 윗치폼(witchform.com) · X — 2026-07-01 기준.
          체크 상태는 이 브라우저에 저장됩니다.
        </p>
      </footer>
    </div>
  );
}
