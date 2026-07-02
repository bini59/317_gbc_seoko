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
};

export const event = {
  title: "코믹월드 SUMMER 2026",
  alias: "334회 · 7코 일산",
  date: "2026-07-18(토) ~ 07-19(일)",
  venue: "일산 킨텍스 제1전시장",
  mapUrl: "https://comicw.net/map/",
};

// 서울코믹월드 배치도 기준: 장르에 걸즈밴드크라이가 등록된 서클 (모두 양일)
export const circles: Circle[] = [
  {
    id: "cf62",
    booth: "CF62",
    name: "걸밴크는멈추지않아!",
    day: "양일",
    genre: "걸즈 밴드 크라이 (전문)",
    highlight: true,
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
    links: [
      { label: "X (@recma5)", url: "https://x.com/recma5" },
      { label: "Instagram (@cma.day)", url: "https://instagram.com/cma.day" },
    ],
  },
];

// 윗치폼에서 추가로 확인된 걸밴크 관련 통판 (배치도 서클 외)
export const witchformExtra: Circle[] = [
  {
    id: "wf-saekji",
    name: "감성적인초롱꽃361 · 라온색지",
    genre: "걸밴크 포함 다수 팬덤 색지 10장 주문폼 (서코)",
    links: [
      { label: "윗치폼 주문폼", url: "https://witchform.com/payform/?uuid=YEQCXSDCLP" },
    ],
  },
  {
    id: "wf-cd",
    name: "정상작동센터_CD (참고)",
    genre: "걸밴크(토게나시토게아리) 공식 CD 상시 통판 · 서코 특정 아님",
    links: [
      { label: "윗치폼 통판폼", url: "https://witchform.com/deposit_form.php?idx=1019818" },
    ],
  },
];
