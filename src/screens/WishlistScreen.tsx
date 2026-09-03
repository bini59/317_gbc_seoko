import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import type { ApiEvent } from "../api";
import { circlesQuery } from "../lib/queries";
import { eventHash, circleHash } from "../lib/route";
import { loadCircleWishlistState } from "../lib/wishlist";
import type { Circle } from "../types";

export function WishlistScreen({ events, eventWishlist }: { events: ApiEvent[]; eventWishlist: string[] }) {
  const [query, setQuery] = useState("");
  const likedEvents = useMemo(() => events.filter((event) => eventWishlist.includes(event.slug)), [events, eventWishlist]);
  const circleQueries = useQueries({ queries: events.map((event) => circlesQuery(event.slug)) });
  const likedCircles = useMemo(() => events.flatMap((event, index) => {
    const data = circleQueries[index]?.data;
    if (!data) return [];
    const saved = loadCircleWishlistState(localStorage, event.slug).value;
    return [...data.circles, ...data.witchformExtra].filter((circle) => saved[circle.id]?.star).map((circle) => ({ event, circle }));
  }), [events, circleQueries]);
  const normalized = query.trim().toLocaleLowerCase();
  const filteredEvents = likedEvents.filter((event) => [event.title, event.alias, event.venue, event.date_label].some((value) => value?.toLocaleLowerCase().includes(normalized)));
  const filteredCircles = likedCircles.filter(({ event, circle }) => [event.title, circle.name, circle.booth, ...(circle.ips ?? [])].some((value) => value?.toLocaleLowerCase().includes(normalized)));
  const hasItems = likedEvents.length > 0 || likedCircles.length > 0;

  return (
    <div className="px-5 pt-7 pb-[calc(88px+env(safe-area-inset-bottom))] md:px-8 md:py-10">
      <h1 className="text-[26px] font-extrabold text-ink">찜목록</h1>
      <p className="mt-2 text-sm text-muted">찜한 행사와 서클을 한 곳에서 확인하세요.</p>
      <label className="mt-6 flex h-11 items-center gap-2.5 rounded-[14px] border border-line bg-card px-3.5">
        <span aria-hidden="true">⌕</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="찜목록 검색" placeholder="행사 · 서클 · 부스 검색" className="min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none" />
      </label>
      {!hasItems ? <div className="py-14 text-center text-sm text-faint">찜한 항목이 없어요</div> : null}
      {hasItems && filteredEvents.length === 0 && filteredCircles.length === 0 ? <div className="py-14 text-center text-sm text-faint">검색 결과가 없어요</div> : null}
      {filteredEvents.length > 0 ? <section className="mt-7"><h2 className="mb-2 text-xs font-extrabold tracking-[0.04em] text-faint">행사</h2><div className="flex flex-col gap-2">{filteredEvents.map((event) => <a key={event.slug} href={eventHash(event.slug)} className="rounded-[14px] border border-line bg-card px-4 py-3 no-underline hover:bg-chip"><div className="font-extrabold text-ink">{event.title}</div><div className="mt-1 text-xs font-semibold text-faint">{event.date_label ?? event.venue ?? ""}</div></a>)}</div></section> : null}
      {filteredCircles.length > 0 ? <section className="mt-7"><h2 className="mb-2 text-xs font-extrabold tracking-[0.04em] text-faint">서클</h2><div className="flex flex-col gap-2">{filteredCircles.map(({ event, circle }) => <a key={`${event.slug}-${circle.id}`} href={circleHash(event.slug, circle.id)} className="rounded-[14px] border border-line bg-card px-4 py-3 no-underline hover:bg-chip"><div className="font-extrabold text-ink">{circle.name}</div><div className="mt-1 text-xs font-semibold text-faint">{event.title}{circle.booth ? ` · ${circle.booth}` : ""}</div></a>)}</div></section> : null}
    </div>
  );
}
