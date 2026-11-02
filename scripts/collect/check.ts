// 분류 규칙과 피드 해석이 맞는지 정답표로 확인한다. 실행: npm run collect:check
// 네트워크와 DB를 쓰지 않는다. 하나라도 어긋나면 종료 코드 1로 끝난다.
import { classifyTitle } from "./keywords";
import { parseFeedText } from "./feed";
import type { Source } from "./sources";

// 저장돼야 하는 제목 (AI 키워드 + 공모전 키워드, 결과·연구과제 아님)
const SHOULD_ACCEPT = [
  "2026 공공기관 AI 아이디어 공모전 개최",
  "제14회 범정부 공공데이터·AI 활용 창업경진대회",
  "전국민 AI 경진대회 참가자 모집",
  "2026 공공부문 생성형 AI 활용 우수사례 공모전",
  "AI 해커톤 2026 참가팀 모집 안내",
  "공공기관 AI 혁신 챌린지 과제 접수",
  "인공지능 서비스 아이디어 경진대회 접수 안내",
  "AI공모전 개최 안내",
  "행정안전부 AI·데이터 활용 공모전",
  "2026년 LLM 활용 해커톤 참가 신청",
  "지자체 인공지능 활용 정책 아이디어 공모전",
  "[공고] 생성형 AI 활용 콘테스트 개최",
];

// 제외돼야 하는 제목과 이유
const SHOULD_REJECT: [string, string][] = [
  ["2026 공공기관 아이디어 공모전 개최", "AI 키워드 없음"],
  ["KAIST 캠퍼스 사진 공모전", "AI 키워드 없음"],
  ["MAIN 디자인 공모전 안내", "AI 키워드 없음"],
  ["AI 기술 세미나 개최 안내", "공모전 키워드 없음"],
  ["인공지능 산업 발전 전략 발표", "공모전 키워드 없음"],
  ["2026 AI 아이디어 공모전 수상작 발표", "결과 공고"],
  ["AI 경진대회 선정결과 공고", "결과 공고"],
  ["제3회 AI 해커톤 결과 발표", "결과 공고"],
  ["AI 챌린지 합격자 안내", "결과 공고"],
  ["인공지능 연구과제 공모", "공모전 키워드 없음"], // "공모"만 있고 공모전·경진대회 같은 말이 없어서
  ["2027년 AI 핵심 기술개발 사업 경진대회형 과제 공모", "연구과제 공모"],
  ["AI R&D 신규과제 챌린지 공모", "연구과제 공모"],
  ["2026년도 공공기관 고객만족도 조사 주간사업자 선정 결과 공고", "AI 키워드 없음"],
  ["연구실 안전 콘텐츠 우수사례 공모전 수상작 공고", "AI 키워드 없음"],
];

// 구글 알림이 보내 주는 모양의 샘플 피드 (Atom). 제목에 태그가 섞이고 링크는 구글 전달 주소다.
const ALERT_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Google 알림 - 공공기관 AI 공모전</title>
  <id>tag:google.com,2005:reader/user/00000/state/com.google/alerts/1</id>
  <updated>2026-11-02T00:00:00Z</updated>
  <entry>
    <id>tag:google.com,2013:googlealerts/feed:111</id>
    <title type="html">2026 공공기관 &lt;b&gt;AI&lt;/b&gt; 아이디어 &lt;b&gt;공모전&lt;/b&gt; 개최 &amp;amp; 접수</title>
    <link href="https://www.google.com/url?rct=j&amp;sa=t&amp;url=https://www.example.go.kr/notice/123/?utm_source=alert&amp;ct=ga&amp;cd=abc&amp;usg=xyz"/>
    <published>2026-11-01T00:00:00Z</published>
    <content type="html">...</content>
  </entry>
  <entry>
    <id>tag:google.com,2013:googlealerts/feed:222</id>
    <title type="html">링크가 없는 항목</title>
    <published>2026-11-01T00:00:00Z</published>
  </entry>
</feed>`;

const RSS_SAMPLE = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0"><channel><title>사업공고</title>
  <item><title><![CDATA[2026 생성형 AI 활용 공모전 공고]]></title><link><![CDATA[https://www.msit.go.kr/bbs/view.do?sCode=user&bbsSeqNo=100&nttSeqNo=1]]></link><pubDate><![CDATA[2026.11.02]]></pubDate></item>
  <item><title><![CDATA[javascript 링크 항목]]></title><link><![CDATA[javascript:alert(1)]]></link></item>
</channel></rss>`;

async function main() {
  let failures = 0;
  const fail = (message: string) => {
    failures += 1;
    console.log("실패", message);
  };

  for (const title of SHOULD_ACCEPT) {
    const result = classifyTitle(title);
    if (!result.accepted) fail(`저장돼야 하는데 제외됨(${result.reason}): ${title}`);
  }
  for (const [title, reason] of SHOULD_REJECT) {
    const result = classifyTitle(title);
    if (result.accepted) fail(`제외돼야 하는데 저장됨: ${title}`);
    else if (result.reason !== reason) fail(`제외 이유가 다름(${result.reason}, 기대 ${reason}): ${title}`);
  }
  console.log(`분류: 저장 ${SHOULD_ACCEPT.length}건 · 제외 ${SHOULD_REJECT.length}건 확인`);

  const alertSource: Source = { name: "Google 알림 시험", origin: "검색 알림", organization: null, url: "https://example.invalid/feed" };
  const alertItems = await parseFeedText(ALERT_SAMPLE, alertSource);
  if (alertItems.length !== 1) fail(`구글 알림: 항목 수가 ${alertItems.length}건 (기대 1건: 링크 없는 항목은 건너뜀)`);
  else {
    const [item] = alertItems;
    if (item.title !== "2026 공공기관 AI 아이디어 공모전 개최 & 접수") fail(`구글 알림: 제목 정리가 다름 → ${item.title}`);
    if (item.url !== "https://www.example.go.kr/notice/123") fail(`구글 알림: 링크를 못 풀었거나 정규화가 다름 → ${item.url}`);
    if (item.organization !== "www.example.go.kr") fail(`구글 알림: 기관(사이트 주소) → ${item.organization}`);
  }

  const rssSource: Source = { name: "RSS 시험", origin: "기관 RSS", organization: "과학기술정보통신부", url: "https://example.invalid/rss" };
  const rssItems = await parseFeedText(RSS_SAMPLE, rssSource);
  if (rssItems.length !== 1) fail(`RSS: 항목 수가 ${rssItems.length}건 (기대 1건: javascript 링크는 건너뜀)`);
  else if (rssItems[0].organization !== "과학기술정보통신부" || !classifyTitle(rssItems[0].title).accepted) fail("RSS: 기관명 또는 분류가 다름");
  console.log(`피드 해석: 구글 알림 ${alertItems.length}건 · RSS ${rssItems.length}건 확인`);

  console.log(failures === 0 ? "\n모두 통과" : `\n${failures}건 실패`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
