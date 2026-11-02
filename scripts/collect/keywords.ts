// Design Ref: DESIGN §2.4 분류 규칙 — 제목만 보고 "AI 공모전·경진대회"인지 판단한다. AI가 판단하는 방식은 쓰지 않는다.
// 자동 수집분(기관 RSS·검색 알림)에만 적용한다. 사람이 링크로 직접 등록한 공고에는 적용하지 않는다.

// AI 관련 키워드. 영문 "AI"는 앞뒤가 영문자가 아닐 때만 인정한다 (KAIST, MAIN 같은 단어 안의 AI는 제외).
const AI_PATTERN = /(?<![A-Za-z])AI(?![A-Za-z])|인공지능|생성형|딥러닝|머신러닝|거대\s*언어\s*모델|(?<![A-Za-z])LLM(?![A-Za-z])/i;

// 공모전 유형 키워드
const CONTEST_PATTERN = /공모전|경진\s*대회|챌린지|해커톤|아이디어\s*공모|콘테스트|경연/;

// 결과 공고 (이미 끝난 대회의 수상작·선정 결과 발표)
const RESULT_PATTERN = /수상작|수상\s*결과|선정\s*결과|결과\s*(발표|공고)|합격자|입상자/;

// 연구과제 공모 (R&D 사업 등)는 대상이 아니다
const RESEARCH_PATTERN = /연구\s*과제|R\s*&\s*D|기술\s*개발|신규\s*과제/i;

export type Classification = { accepted: true } | { accepted: false; reason: string };

export function classifyTitle(title: string): Classification {
  if (!AI_PATTERN.test(title)) return { accepted: false, reason: "AI 키워드 없음" };
  if (!CONTEST_PATTERN.test(title)) return { accepted: false, reason: "공모전 키워드 없음" };
  if (RESULT_PATTERN.test(title)) return { accepted: false, reason: "결과 공고" };
  if (RESEARCH_PATTERN.test(title)) return { accepted: false, reason: "연구과제 공모" };
  return { accepted: true };
}
