// Design Ref: DESIGN §3 — 단계·유형 값을 한 곳에서 정의해 화면·서버·DB가 같이 쓴다.
// Plan SC: PLAN 2번 — 공모전 단계와 활동 유형을 코드 한 곳에 둔다.

// 공모전 참가현황의 단계 (진행 순서대로)
export const CONTEST_STAGES = ["관심", "검토", "참가 진행", "완료"] as const;
export type ContestStage = (typeof CONTEST_STAGES)[number];

// 공모전을 직접 등록할 때의 기본 단계 (DESIGN §3.1)
export const DEFAULT_CONTEST_STAGE: ContestStage = "관심";

// 공고에서 버튼으로 등록할 때의 단계 (DESIGN §2.5)
export const NOTICE_CONTEST_STAGE: ContestStage = "검토";

// AI 활동실적의 유형
export const ACTIVITY_TYPES = ["AI 사업", "교육", "거버넌스", "대외활동"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];
