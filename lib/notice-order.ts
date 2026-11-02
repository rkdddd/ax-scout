// Design Ref: DESIGN §1.5 — 공고 목록의 정렬과 숨김 규칙 (PRD §5 공고 수집 규칙).
//  ① 마감 전 공고: 마감일이 가까운 순
//  ② 마감일 없는 공고: 처음 저장한 순서가 최근인 것부터
//  ③ 마감이 지난 공고: 접어서 맨 아래 (마감 후 30일이 지나면 목록에서 숨긴다)
//  마감일 없이 처음 저장한 지 60일이 지난 공고도 목록에서 숨긴다. (지우는 것이 아니라 보여주지 않을 뿐이다)
// 서버 전용 모듈을 가져오지 않는 순수 함수라서 따로 시험할 수 있다.

export const HIDE_AFTER_DEADLINE_DAYS = 30;
export const HIDE_UNDATED_AFTER_DAYS = 60;

type Orderable = { id: number; deadline: string | null; created_at: string };

const DAY_MS = 86_400_000;

// YYYY-MM-DD 두 날짜 사이의 날수 (later - earlier)
function daysBetween(earlier: string, later: string) {
  return Math.round((new Date(`${later}T00:00:00Z`).getTime() - new Date(`${earlier}T00:00:00Z`).getTime()) / DAY_MS);
}

// 저장 시각(UTC)을 한국 날짜(YYYY-MM-DD)로 바꾼다.
function koreaDate(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(iso));
}

export function splitNotices<T extends Orderable>(notices: T[], today: string) {
  const upcoming: T[] = [];
  const undated: T[] = [];
  const closed: T[] = [];

  for (const notice of notices) {
    if (notice.deadline) {
      if (notice.deadline >= today) upcoming.push(notice); // 마감일 당일까지는 아직 마감 전
      else if (daysBetween(notice.deadline, today) <= HIDE_AFTER_DEADLINE_DAYS) closed.push(notice);
      // 마감 후 30일을 넘긴 공고는 어느 쪽에도 넣지 않는다 (숨김)
    } else if (daysBetween(koreaDate(notice.created_at), today) <= HIDE_UNDATED_AFTER_DAYS) {
      undated.push(notice);
    }
  }

  upcoming.sort((a, b) => a.deadline!.localeCompare(b.deadline!) || b.id - a.id);
  undated.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
  closed.sort((a, b) => b.deadline!.localeCompare(a.deadline!) || b.id - a.id);
  return { upcoming, undated, closed };
}
