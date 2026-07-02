// 코믹월드 SUMMER 2026 (334회 / "7코 일산")
// 기간: 2026-07-18(토) ~ 2026-07-19(일) / 장소: 일산 킨텍스 제1전시장
// 출처: 서울코믹월드 부스배치도(comicw.net), 윗치폼, X
// 밴드물 참가 서클 정리 — 탭1: 걸즈밴드크라이(걸밴크), 탭2: 뱅드림(BanG Dream!)

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
  badge?: string;
  note?: string;
  boothUrl?: string;
};

export type Tab = {
  id: string;
  label: string;
  subtitle: string;
  items: Circle[];
};

export const event = {
  title: "코믹월드 SUMMER 2026",
  alias: "334회 · 7코 일산",
  date: "2026-07-18(토) ~ 07-19(일)",
  venue: "일산 킨텍스 제1전시장",
  mapUrl: "https://comicw.net/map/",
};

// ── 탭 1: 걸즈밴드크라이 (걸밴크) — 배치도 장르 기준, 모두 양일
export const gbcCircles: Circle[] = [
  {
    id: "cf62",
    booth: "CF62",
    name: "걸밴크는멈추지않아!",
    day: "양일",
    genre: "걸즈 밴드 크라이 (전문)",
    highlight: true,
    badge: "걸밴크 전문",
    boothUrl: "https://comicw.net/map/334/CF62",
    links: [
      { label: "코믹월드 부스컷/샵", url: "https://comicw.net/g/?it_id=1026" },
    ],
  },
  {
    id: "be01",
    booth: "BE01·BE02",
    name: "자고싶은 새벽반 (윗치폼: 달세개)",
    day: "양일",
    genre: "걸즈밴드크라이 / 블루아카이브 / 원신",
    boothUrl: "https://comicw.net/map/334/BE01",
    note: "윗치폼 통판폼에 걸밴크 굿즈(니나·모모카·스바루·토모·루파 마그넷/핀버튼, 걸밴크 회전 아크릴스탠드 등) 판매 · 판매기간 6/21~7/24",
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
    boothUrl: "https://comicw.net/map/334/CL25",
    links: [
      { label: "X (@_dshsh007)", url: "https://x.com/_dshsh007" },
    ],
  },
  {
    id: "ch15",
    booth: "CH15",
    name: "카키나라세",
    day: "양일",
    genre: "걸즈밴드크라이 / 초가구야공주 / 봇치더록",
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
    boothUrl: "https://comicw.net/map/334/CH42",
    links: [
      { label: "X (@seohaengma)", url: "https://x.com/seohaengma" },
    ],
  },
  {
    id: "bh01",
    booth: "BH01·BH02",
    name: "악기상점",
    day: "양일",
    genre: "걸즈밴드크라이 / 뱅드림 / 봇치더록 / 블루아카이브 등 밴드물 다수",
    boothUrl: "https://comicw.net/map/334/BH01",
    note: "뱅드림 탭에도 동일 서클(밴드물 종합)",
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
    boothUrl: "https://comicw.net/map/334/BH60",
    note: "뱅드림 탭에도 동일 서클",
    links: [
      { label: "X (@recma5)", url: "https://x.com/recma5" },
      { label: "Instagram (@cma.day)", url: "https://instagram.com/cma.day" },
    ],
  },
];

// ── 탭 2: 뱅드림 (BanG Dream! / MyGO!!!!! / Ave Mujica 등) — 배치도 장르 기준, 모두 양일
export const bandoriCircles: Circle[] = [
  {
    id: "bd-buuuu",
    booth: "CA17·CA18",
    name: "buuuu",
    day: "양일",
    genre: "뱅드림 (전문)",
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
    genre: "뱅드림 (전문)",
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
    boothUrl: "https://comicw.net/map/334/CF10",
    links: [
      { label: "X (@kanachiaki)", url: "https://x.com/kanachiaki" },
    ],
  },
  {
    id: "bd-pastelgirls",
    booth: "CL64",
    name: "파스텔 걸즈",
    day: "양일",
    genre: "뱅드림 / 블루아카이브 / 원신",
    boothUrl: "https://comicw.net/map/334/CL64",
    note: "X 계정명 '花ゆい🌸HanaYui 7월서코 CL_64'로 이번 서코 부스 확인됨",
    links: [
      { label: "X (@hanayui132)", url: "https://x.com/hanayui132" },
      { label: "Instagram (@hanayui132)", url: "https://instagram.com/hanayui132" },
    ],
  },
  {
    id: "bd-akgi",
    booth: "BH01·BH02",
    name: "악기상점",
    day: "양일",
    genre: "뱅드림 / 마이고 / 아베무지카 / 걸즈밴드크라이 등 밴드물 다수",
    boothUrl: "https://comicw.net/map/334/BH01",
    note: "걸밴크 탭에도 동일 서클(밴드물 종합)",
    links: [
      { label: "X (@akgi_store)", url: "https://x.com/akgi_store" },
      { label: "Instagram (@akgi_store)", url: "https://instagram.com/akgi_store" },
    ],
  },
  {
    id: "bd-boom",
    booth: "BH60",
    name: "걸즈밴드붐은온다",
    day: "양일",
    genre: "뱅드림 / 걸즈밴드크라이 / 보컬로이드 / 봇치더록",
    boothUrl: "https://comicw.net/map/334/BH60",
    note: "걸밴크 탭에도 동일 서클",
    links: [
      { label: "X (@recma5)", url: "https://x.com/recma5" },
      { label: "Instagram (@cma.day)", url: "https://instagram.com/cma.day" },
    ],
  },
  {
    id: "bd-ttudduns",
    booth: "BA35·BA36",
    name: "뚜뚠",
    day: "양일",
    genre: "다장르 종합 리셀(33개 장르) · 뱅드림 포함",
    boothUrl: "https://comicw.net/map/334/BA35",
    note: "종합/부재고 리셀 부스 — 뱅드림 굿즈는 일부",
    links: [
      { label: "코믹월드 샵", url: "https://comicw.net/g/?it_id=1721" },
    ],
  },
  {
    id: "bd-adamspra",
    booth: "DA15·DA16",
    name: "아담스프라",
    day: "양일",
    genre: "고전 프라/피규어/문구 종합 · 뱅드림 포함",
    boothUrl: "https://comicw.net/map/334/DA15",
    note: "종합 리셀 부스 — 뱅드림 굿즈는 일부",
    links: [],
  },
];

export const tabs: Tab[] = [
  {
    id: "gbc",
    label: "걸밴크",
    subtitle: "걸즈밴드크라이 · 서울코믹월드 배치도 기준 (모두 양일)",
    items: gbcCircles,
  },
  {
    id: "bandori",
    label: "뱅드림",
    subtitle: "BanG Dream! 계열 · 서울코믹월드 배치도 기준 (모두 양일)",
    items: bandoriCircles,
  },
];
