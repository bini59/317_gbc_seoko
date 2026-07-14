// 도메인 타입. 운영 데이터의 단일 원본은 D1이며(worker/app.ts), 클라이언트는
// api.ts를 통해서만 이 형태로 받는다. (정적 시드 데이터는 제거됨 — 이슈 #5)

export type LinkItem = {
  label: string;
  url: string;
};

/** X(트위터) 참가 공지 트윗 — og 태그 그대로 캡처해서 상세페이지 카드로 노출 */
export type TweetInfo = {
  url: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogSiteName?: string;
};

export type Circle = {
  id: string;
  name: string;
  genre: string;
  links: LinkItem[];
  booth?: string;
  day?: string;
  highlight?: boolean;
  note?: string;
  boothUrl?: string;
  /** 함께 파는 2차 팬덤 태그 (필터/칩 표시용). 걸밴크 서클은 걸밴크 태그 제외. */
  genres?: string[];
  /** highlight 배지 라벨 (기본: "걸밴크 전문") */
  badge?: string;
  /** 통판(unlisted) 여부 — 행사장 부스 없이 온라인 주문으로만 접근 */
  unlisted?: boolean;
  /** 이번 서코 참가를 공지한 X 트윗 (og 태그 캡처) */
  tweetInfo?: TweetInfo;
};
