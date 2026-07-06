// 코믹월드 SUMMER 2026 (334회 / "7코 일산")
// 기간: 2026-07-18(토) ~ 2026-07-19(일) / 장소: 일산 킨텍스 제1전시장
// 출처: 서울코믹월드 부스배치도(comicw.net), 윗치폼, X
// 걸즈밴드크라이(걸밴크) 참가 서클 및 통판 정리

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
  /** 이번 서코 참가를 공지한 X 트윗 (og 태그 캡처) */
  tweetInfo?: TweetInfo;
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
    genre: "걸즈밴드크라이 / 뱅드림 / 봇치더록 / 블루아카이브 / 케이온 등 밴드물",
    genres: ["뱅드림", "봇치더록", "블루아카이브", "케이온"],
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
    links: [{ label: "X (@bueongba)", url: "https://x.com/bueongba" }],
    tweetInfo: {
      url: "https://x.com/bueongba/status/2072965697450471506",
      ogTitle: "サムダ (@bueongba) on X",
      ogDescription:
        "이번에 7月 한국에서 진행하는 `서울 코믹월드`에 참여하게 되었습니다! CA17-18 부스에서 24p의 mygo!!!!!와 Ave Mujica의 일러스트를 담았으니 많은 관심 부탁드릴게요!",
      ogImage: "https://pbs.twimg.com/media/HMSnUENbsAA7R2j.jpg:large",
      ogSiteName: "X (formerly Twitter)",
    },
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
      { label: "윗치폼 통판폼", url: "https://witchform.com/payform/?uuid=OSDSEMSCQZ" },
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
  {
    id: "keon-bocchikita",
    booth: "CN13·CN14",
    name: "봇치기타하나주세요",
    day: "양일",
    genre: "케이온 전문 서클",
    genres: ["케이온"],
    highlight: true,
    badge: "케이온 전문",
    boothUrl: "https://comicw.net/map/334/CN13",
    note: "배치도상 트위터 미등록 — 부스 위치로 확인",
    links: [],
  },
  {
    id: "keon-sos",
    booth: "CH08",
    name: "방과 후 SOS단",
    day: "양일",
    genre: "케이온 / 스즈미야 하루히의 우울",
    genres: ["케이온"],
    boothUrl: "https://comicw.net/map/334/CH08",
    note: "X 계정명 'Allsm(7서코양일CH_08)'로 이번 서코 부스 확인됨",
    links: [
      { label: "X (@foryou712358)", url: "https://x.com/foryou712358" },
      { label: "코믹인포", url: "https://comicw.net/g/1988" },
    ],
    tweetInfo: {
      url: "https://x.com/foryou712358/status/2061354843575619751",
      ogTitle: "Allsm(7서코양일CH_08) (@foryou712358) on X",
      ogImage:
        "https://pbs.twimg.com/profile_images/1767938041283489792/cmedJ8gc_200x200.jpg",
      ogSiteName: "X (formerly Twitter)",
    },
  },
  {
    id: "keon-leesangmyang",
    booth: "CH09",
    name: "이생먕",
    day: "양일",
    genre: "다장르 종합(좀비고/프리즘스톤/캐릭캐릭체인지 등) · 케이온 포함",
    genres: ["케이온", "종합 리셀"],
    boothUrl: "https://comicw.net/map/334/CH09",
    note: "다장르 종합 서클 — 케이온 굿즈는 일부. X 계정(@LEESANGMYANG)은 운영 종료 상태",
    links: [],
  },
  {
    id: "keon-jakjeonbonbu",
    booth: "CI29",
    name: "작전본부",
    day: "양일",
    genre: "다장르 종합(나루토/니케/블루아카이브 등) · 케이온 포함",
    genres: ["케이온", "종합 리셀"],
    boothUrl: "https://comicw.net/map/334/CI29",
    note: "다장르 종합 서클 — 케이온 굿즈는 일부",
    links: [{ label: "Instagram (@sejong_jakbon)", url: "https://instagram.com/sejong_jakbon" }],
  },
  {
    id: "br-mangobox",
    booth: "BD27·BD28",
    name: "망고 박스",
    day: "양일",
    genre: "봇치더록 전문 서클",
    genres: ["봇치더록"],
    highlight: true,
    badge: "봇치더록 전문",
    boothUrl: "https://comicw.net/map/334/BD27",
    links: [
      { label: "X (@wkdguswhd553)", url: "https://x.com/wkdguswhd553" },
      { label: "코믹월드 샵", url: "https://comicw.net/g/?it_id=1152" },
    ],
  },
  {
    id: "br-hamustarry",
    booth: "BE72",
    name: "HAMUSTARRY",
    day: "토요일",
    genre: "봇치더록 전문 서클",
    genres: ["봇치더록"],
    highlight: true,
    badge: "봇치더록 전문",
    boothUrl: "https://comicw.net/map/334/BE72",
    note: "토요일만 등록(배치도 기준)",
    links: [
      { label: "X (@nmhmu)", url: "https://x.com/nmhmu" },
      { label: "코믹월드 샵", url: "https://comicw.net/g/?it_id=1678" },
    ],
  },
  {
    id: "br-okjikikuri",
    booth: "CM69",
    name: "오직키쿠리",
    day: "양일",
    genre: "봇치더록 전문 서클",
    genres: ["봇치더록"],
    highlight: true,
    badge: "봇치더록 전문",
    boothUrl: "https://comicw.net/map/334/CM69",
    links: [
      { label: "X (@geuleonsal27052)", url: "https://x.com/geuleonsal27052" },
      { label: "코믹월드 샵", url: "https://comicw.net/g/?it_id=1453" },
    ],
  },
  {
    id: "br-rollingstones",
    booth: "BM27·BM28",
    name: "구르는돌들",
    day: "양일",
    genre: "봇치더록 전문 서클",
    genres: ["봇치더록"],
    highlight: true,
    badge: "봇치더록 전문",
    boothUrl: "https://comicw.net/map/334/BM27",
    note: "X 계정(@rollingbocchii) 타이틀/해시태그 '#봇치더록'로 전문 서클 확인",
    links: [{ label: "X (@rollingbocchii)", url: "https://x.com/rollingbocchii" }],
  },
  {
    id: "br-assagaori",
    booth: "CO11",
    name: "아싸가오리",
    day: "토요일",
    genre: "봇치더록 전문 서클",
    genres: ["봇치더록"],
    highlight: true,
    badge: "봇치더록 전문",
    boothUrl: "https://comicw.net/map/334/CO11",
    note: "토요일만 등록(배치도 기준)",
    links: [
      { label: "X (@kogooma_farm)", url: "https://x.com/kogooma_farm" },
      { label: "Instagram (@kogoomafarm)", url: "https://instagram.com/kogoomafarm" },
    ],
  },
  {
    id: "br-bocchitherock",
    booth: "BA83",
    name: "봇치더록",
    day: "양일",
    genre: "봇치더록 전문 서클",
    genres: ["봇치더록"],
    highlight: true,
    badge: "봇치더록 전문",
    boothUrl: "https://comicw.net/map/334/BA83",
    note: "부스명 자체가 IP명 — 트위터/인스타 미등록, 배치도로 확인",
    links: [],
  },
  {
    id: "br-nunnun",
    booth: "CJ85·CJ86",
    name: "눈눈",
    day: "양일",
    genre: "봇치더록 / 1차 창작물",
    genres: ["봇치더록"],
    highlight: true,
    badge: "봇치더록 전문",
    boothUrl: "https://comicw.net/map/334/CJ85",
    links: [{ label: "Instagram (@nun___nun___)", url: "https://www.instagram.com/nun___nun___/" }],
  },
  {
    id: "br-chiyahoya",
    booth: "BE35·BE36",
    name: "치야호야",
    day: "양일",
    genre: "봇치더록 / 블루아카이브",
    genres: ["봇치더록", "블루아카이브"],
    boothUrl: "https://comicw.net/map/334/BE35",
    links: [{ label: "X (@smkt_tsnc)", url: "https://x.com/smkt_tsnc" }],
  },
  {
    id: "br-hikizu",
    booth: "CL05",
    name: "히키즈",
    day: "양일",
    genre: "봇치더록 / 장송의프리렌 / 프로젝트세카이",
    genres: ["봇치더록", "장송의프리렌", "프로젝트세카이"],
    boothUrl: "https://comicw.net/map/334/CL05",
    links: [{ label: "X (@QUICHE_E)", url: "https://x.com/QUICHE_E" }],
    tweetInfo: {
      url: "https://x.com/QUICHE_E/status/2066571431002145227",
      ogTitle: "우냐냥🔌 (@QUICHE_E) on X",
      ogDescription: "7월 서코 신굿즈 쪼끔씩 그리는중~",
      ogImage: "https://pbs.twimg.com/media/HK3vt63aIAEe0W4.png:large",
      ogSiteName: "X (formerly Twitter)",
    },
  },
  {
    id: "br-chawonband",
    booth: "BL56·BL57",
    name: "차원밴드",
    day: "양일",
    genre: "봇치더록 / 보컬로이드",
    genres: ["봇치더록", "보컬로이드"],
    boothUrl: "https://comicw.net/map/334/BL56",
    links: [
      { label: "X (@whisket3_)", url: "https://x.com/whisket3_" },
      { label: "윗치폼 통판폼", url: "https://witchform.com/payform/?uuid=CRRISXKJCY" },
    ],
  },
  {
    id: "br-koraileditor",
    booth: "CH16",
    name: "코라일편",
    day: "양일",
    genre: "보컬로이드 / 봇치더록 / 붕괴스타레일 / 원신",
    genres: ["봇치더록", "보컬로이드", "붕괴스타레일", "원신"],
    boothUrl: "https://comicw.net/map/334/CH16",
    links: [
      { label: "X (@co_ra_33)", url: "https://x.com/co_ra_33" },
      { label: "Instagram (@se_yeon33)", url: "https://instagram.com/se_yeon33" },
    ],
  },
  {
    id: "br-yeogieyo",
    booth: "CO15",
    name: "여기에요 주인님",
    day: "토요일",
    genre: "봇치더록 / 리제로",
    genres: ["봇치더록", "리제로"],
    boothUrl: "https://comicw.net/map/334/CO15",
    note: "토요일만 등록(배치도 기준)",
    links: [{ label: "코믹월드 샵", url: "https://comicw.net/g/?it_id=834" }],
  },
  {
    id: "br-bocchizerg",
    booth: "CJ44",
    name: "봇치는 저그였다",
    day: "양일",
    genre: "봇치더록 / 스타크래프트",
    genres: ["봇치더록", "스타크래프트"],
    boothUrl: "https://comicw.net/map/334/CJ44",
    note: "봇치더록 x 스타크래프트 크로스오버 동인 콘셉트 부스",
    links: [
      { label: "X (@Raybolt_HERO)", url: "https://x.com/Raybolt_HERO" },
      { label: "코믹인포", url: "https://comicw.net/g/987" },
    ],
    tweetInfo: {
      url: "https://x.com/Raybolt_HERO/status/2068961195844051111",
      ogTitle: "RAYBOLT_HERO (@Raybolt_HERO) on X",
      ogImage: "https://pbs.twimg.com/media/HLZtPnSbQAACDHh.jpg:large",
      ogSiteName: "X (formerly Twitter)",
    },
  },
  {
    id: "br-amugeona",
    booth: "CM82",
    name: "아무거나다그렸음",
    day: "양일",
    genre: "봇치더록 / 섀도우버스 월즈비욘드",
    genres: ["봇치더록", "섀도우버스"],
    boothUrl: "https://comicw.net/map/334/CM82",
    links: [
      { label: "X (@sa0k0o)", url: "https://x.com/sa0k0o" },
      { label: "Instagram (@sa0ko0)", url: "https://instagram.com/sa0ko0" },
    ],
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
