import type { TweetInfo } from "../types";

/* ---------- X 참가공지 트윗 카드 (og 태그 기반) ---------- */
export function TweetCard({ tweet }: { tweet: TweetInfo }) {
  return (
    <a
      href={tweet.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-2xl border border-line bg-card overflow-hidden no-underline hover:opacity-95 transition-opacity"
    >
      {tweet.ogImage && (
        <img
          src={tweet.ogImage}
          alt=""
          className="w-full max-h-[260px] object-cover bg-[#f0f1f4]"
          loading="lazy"
        />
      )}
      <div className="px-4 py-[13px]">
        <div className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="#17181c">
            <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.96 6.82H1.68l7.73-8.84L1.25 2.25h6.83l4.71 6.23zM17.08 19.77h1.83L7.08 4.13H5.12z" />
          </svg>
          <span className="text-[11px] font-extrabold tracking-[0.04em] text-faint uppercase">
            {tweet.ogSiteName ?? "X (Twitter)"}
          </span>
        </div>
        {tweet.ogTitle && (
          <div className="text-[13.5px] font-extrabold text-ink leading-[1.4] mt-1.5">
            {tweet.ogTitle}
          </div>
        )}
        {tweet.ogDescription && (
          <div className="text-[13px] text-[#5b6270] leading-[1.55] mt-1 whitespace-pre-line">
            {tweet.ogDescription}
          </div>
        )}
      </div>
    </a>
  );
}
