// Design Ref: DESIGN §2.4 — 수집 원천 목록. 공식 RSS와 검색 알림 RSS만 쓴다.
// 이용약관이 자동 수집·가공을 제한하는 사이트(위비티 등)의 화면은 읽지 않는다.

export type Origin = "기관 RSS" | "검색 알림";

export type Source = {
  name: string; // 화면과 수집 기록에 보이는 이름 (주소·키는 넣지 않는다)
  origin: Origin;
  organization: string | null; // 출처 기관명. 모르면 null → 링크의 사이트 주소로 채운다
  url: string;
};

// 기관이 공식으로 제공하는 RSS (키 필요 없음)
const OFFICIAL_RSS: Source[] = [
  {
    name: "과기정통부 사업공고",
    origin: "기관 RSS",
    organization: "과학기술정보통신부",
    url: "https://www.msit.go.kr/user/rss/rss.do?bbsSeqNo=100",
  },
  {
    name: "과기정통부 공지사항",
    origin: "기관 RSS",
    organization: "과학기술정보통신부",
    url: "https://www.msit.go.kr/user/rss/rss.do?bbsSeqNo=96",
  },
];

// 검색 알림 RSS 주소는 비밀에 가까워서(주소에 개인 토큰이 들어 있다) 코드가 아니라 환경변수로 받는다.
// GOOGLE_ALERT_RSS_URLS="주소1,주소2" 처럼 쉼표로 구분한다. 없으면 이 원천은 건너뛴다.
export function loadSources(env: NodeJS.ProcessEnv): Source[] {
  const alerts = (env.GOOGLE_ALERT_RSS_URLS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map<Source>((url, index) => ({
      name: `Google 알림 ${index + 1}`,
      origin: "검색 알림",
      organization: null,
      url,
    }));
  return [...OFFICIAL_RSS, ...alerts];
}
