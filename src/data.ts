// 코믹월드 SUMMER 2026 (334회 / "7코 일산")
// 기간: 2026-07-18(토) ~ 2026-07-19(일) / 장소: 일산 킨텍스 제1전시장
// 출처: 서울코믹월드 부스배치도(comicw.net), 윗치폼, X
// 걸즈밴드크라이(걸밴크) 참가 서클 및 통판 정리

export type LinkItem = {
  label: string;
  url: string;
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
};

export const event = {
  title: "코믹월드 SUMMER 2026",
  alias: "334회 · 7코 일산",
  date: "2026-07-18(토) ~ 07-19(일)",
  venue: "일산 킨텍스 제1전시장",
  mapUrl: "https://comicw.net/map/",
};

// 서울코믹월드 배치도 기준: 장르에 걸즈밴드크라이 또는 뱅드림이 등록된 서클 (모두 양일)
export const circles: Circle[] = [
  {
    id: "cf62",
    booth: "CF62",
    name: "걸밴크는멈추지않아!",
    day: "양일",
    genre: "걸즈밴드크라이 전문 서클",
    genres: [],
    highlight: true,
    boothUrl: "https://comicw.net/map/334/CF62",
    links: [{ label: "코믹월드 부스컷/샵", url: "https://comicw.net/g/?it_id=1026" }],
  },
  {
    id: "be01",
    booth: "BE01·BE02",
    name: "자고싶은 새벽반",
    day: "양일",
    genre: "걸즈밴드크라이 / 블루아카이브 / 원신",
    genres: ["블루아카이브", "원신"],
    boothUrl: "https://comicw.net/map/334/BE01",
    note: "윗치폼 통판폼에서 걸밴크 굿즈(니나·모모카·스바루 마그넷·핀버튼, 회전 아크릴스탠드 등) 판매 · 6/21~7/24",
    links: [
      { label: "X (@onetwomoon)", url: "https://x.com/onetwomoon" },
      { label: "윗치폼 통판폼", url: "https://witchform.com/deposit_form.php?idx=1039234" },
    ],
  },
  {
    id: "cl25",
    booth: "CL25",
    name: "백합은 돈이 된다",
    day: "양일",
    genre: "걸즈밴드크라이 + 봇치더록 / 초가구야공주 등 백합물",
    genres: ["봇치더록", "초가구야공주", "백합"],
    boothUrl: "https://comicw.net/map/334/CL25",
    links: [{ label: "X (@_dshsh007)", url: "https://x.com/_dshsh007" }],
  },
  {
    id: "ch15",
    booth: "CH15",
    name: "카키나라세",
    day: "양일",
    genre: "걸즈밴드크라이 / 초가구야공주 / 봇치더록",
    genres: ["초가구야공주", "봇치더록"],
    boothUrl: "https://comicw.net/map/334/CH15",
    links: [
      { label: "X (@daj8_b4)", url: "https://x.com/daj8_b4" },
      { label: "Instagram (@doj8p4)", url: "https://instagram.com/doj8p4" },
      { label: "코믹월드 샵", url: "https://comicw.net/g/?it_id=1475" },
    ],
  },
  {
    id: "ch42",
    booth: "CH42",
    name: "걸즈 뮤직 포에버",
    day: "양일",
    genre: "걸즈밴드크라이 / 보컬로이드 / 봇치더록",
    genres: ["보컬로이드", "봇치더록"],
    boothUrl: "https://comicw.net/map/334/CH42",
    links: [{ label: "X (@seohaengma)", url: "https://x.com/seohaengma" }],
  },
  {
    id: "bh01",
    booth: "BH01·BH02",
    name: "악기상점",
    day: "양일",
    genre: "걸즈밴드크라이 / 뱅드림 / 봇치더록 / 블루아카이브 등 밴드물",
    genres: ["뱅드림", "봇치더록", "블루아카이브"],
    boothUrl: "https://comicw.net/map/334/BH01",
    links: [
      { label: "X (@akgi_store)", url: "https://x.com/akgi_store" },
      { label: "Instagram (@akgi_store)", url: "https://instagram.com/akgi_store" },
    ],
  },
  {
    id: "bh60",
    booth: "BH60",
    name: "걸즈밴드붐은온다",
    day: "양일",
    genre: "걸즈밴드크라이 / 뱅드림 / 보컬로이드 / 봇치더록",
    genres: ["뱅드림", "보컬로이드", "봇치더록"],
    boothUrl: "https://comicw.net/map/334/BH60",
    links: [
      { label: "X (@recma5)", url: "https://x.com/recma5" },
      { label: "Instagram (@cma.day)", url: "https://instagram.com/cma.day" },
    ],
  },
  {
    id: "bd-buuuu",
    booth: "CA17·CA18",
    name: "buuuu",
    day: "양일",
    genre: "뱅드림 전문 서클",
    genres: ["뱅드림"],
    highlight: true,
    badge: "뱅드림 전문",
    boothUrl: "https://comicw.net/map/334/CA17",
    note: "배치도상 트위터 미등록 — 부스 위치로 확인",
    links: [],
  },
  {
    id: "bd-firefly",
    booth: "CA19",
    name: "반딧불이 정원",
    day: "양일",
    genre: "뱅드림 전문 서클",
    genres: ["뱅드림"],
    highlight: true,
    badge: "뱅드림 전문",
    boothUrl: "https://comicw.net/map/334/CA19",
    note: "X 계정명 'GoAnchor⚓️CA_19'로 이번 서코 부스 확인됨",
    links: [
      { label: "X (@GoAnchor)", url: "https://x.com/GoAnchor" },
      { label: "코믹월드 샵", url: "https://comicw.net/g/?it_id=1480" },
    ],
  },
  {
    id: "bd-sakanadrop",
    booth: "CF10",
    name: "sakanadrop",
    day: "양일",
    genre: "뱅드림 / 원신 / 프로젝트세카이 / 하츠네미쿠 / 카게프로",
    genres: ["뱅드림", "원신", "프로젝트세카이", "하츠네미쿠", "카게프로"],
    boothUrl: "https://comicw.net/map/334/CF10",
    links: [{ label: "X (@kanachiaki)", url: "https://x.com/kanachiaki" }],
  },
  {
    id: "bd-pastelgirls",
    booth: "CL64",
    name: "파스텔 걸즈",
    day: "양일",
    genre: "뱅드림 / 블루아카이브 / 원신",
    genres: ["뱅드림", "블루아카이브", "원신"],
    boothUrl: "https://comicw.net/map/334/CL64",
    note: "X 계정명 '花ゆい🌸HanaYui 7월서코 CL_64'로 이번 서코 부스 확인됨",
    links: [
      { label: "X (@hanayui132)", url: "https://x.com/hanayui132" },
      { label: "Instagram (@hanayui132)", url: "https://instagram.com/hanayui132" },
    ],
  },
  {
    id: "bd-ttudduns",
    booth: "BA35·BA36",
    name: "뚜뚠",
    day: "양일",
    genre: "다장르 종합 리셀(33개 장르) · 뱅드림 포함",
    genres: ["뱅드림", "종합 리셀"],
    boothUrl: "https://comicw.net/map/334/BA35",
    note: "종합/부재고 리셀 부스 — 뱅드림 굿즈는 일부",
    links: [{ label: "코믹월드 샵", url: "https://comicw.net/g/?it_id=1721" }],
  },
  {
    id: "bd-adamspra",
    booth: "DA15·DA16",
    name: "아담스프라",
    day: "양일",
    genre: "고전 프라/피규어/문구 종합 · 뱅드림 포함",
    genres: ["뱅드림", "종합 리셀"],
    boothUrl: "https://comicw.net/map/334/DA15",
    note: "종합 리셀 부스 — 뱅드림 굿즈는 일부",
    links: [],
  },
];

// 윗치폼에서 추가로 확인된 걸밴크 관련 통판 (배치도 서클 외)
export const witchformExtra: Circle[] = [
  {
    id: "wf-saekji",
    name: "감성적인초롱꽃361 · 라온색지",
    genre: "걸밴크 포함 다수 팬덤 색지 10장 주문폼 (서코)",
    genres: [],
    links: [{ label: "윗치폼 주문폼", url: "https://witchform.com/payform/?uuid=YEQCXSDCLP" }],
  },
  {
    id: "wf-cd",
    name: "정상작동센터_CD (참고)",
    genre: "걸밴크(토게나시토게아리) 공식 CD 상시 통판 · 서코 특정 아님",
    genres: [],
    links: [{ label: "윗치폼 통판폼", url: "https://witchform.com/deposit_form.php?idx=1019818" }],
  },
];
