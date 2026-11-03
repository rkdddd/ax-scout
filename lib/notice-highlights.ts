// 대시보드용 공고·관심 공모전 요약. 기간 선택과 상관없이 항상 "오늘" 기준이다.
import "server-only";
import type { Contest } from "@/lib/contests";
import { NOTICE_COLUMNS, type Notice } from "@/lib/notices";
import { getSupabase } from "@/lib/supabase";

// 오늘(YYYY-MM-DD)에서 days일 뒤 날짜
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const NEW_NOTICE_DAYS = 7;
export const CLOSING_NOTICE_DAYS = 14;

export type Highlights = {
  newNotices: Notice[]; // 최근 7일 안에 모은 공고 (마감이 지난 공고는 제외)
  newNoticeCount: number;
  closingNotices: Notice[]; // 오늘부터 14일 안에 마감되는 공고
  interestContests: Contest[]; // 단계가 "관심"인 공모전
  interestCount: number;
};

export async function getHighlights(today: string): Promise<Highlights> {
  const sb = getSupabase();
  const since = new Date(Date.now() - NEW_NOTICE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // 수집 때마다 collected_at(마지막 확인 시각)은 바뀌므로, "새로 모은" 기준은 처음 저장한 시각(created_at)이다.
  // 마감이 지난 공고는 "새 공고"에서 빼야 하므로, 마감일이 없거나 오늘 이후인 것만 가져온다.
  const newQuery = sb
    .from("notices")
    .select(NOTICE_COLUMNS, { count: "exact" })
    .is("archived_at", null)
    .gte("created_at", since)
    .or(`deadline.is.null,deadline.gte.${today}`)
    .order("created_at", { ascending: false })
    .limit(3);

  const closingQuery = sb
    .from("notices")
    .select(NOTICE_COLUMNS)
    .is("archived_at", null)
    .gte("deadline", today)
    .lte("deadline", addDays(today, CLOSING_NOTICE_DAYS))
    .order("deadline", { ascending: true })
    .limit(3);

  const interestQuery = sb
    .from("contests")
    .select("id,name,organizer,date,stage,result,note,source_url,archived_at,created_at,updated_at", { count: "exact" })
    .is("archived_at", null)
    .eq("stage", "관심")
    .order("updated_at", { ascending: false })
    .limit(3);

  const [newRes, closingRes, interestRes] = await Promise.all([
    newQuery,
    closingQuery,
    interestQuery,
  ]);
  for (const res of [newRes, closingRes, interestRes]) {
    if (res.error) {
      console.error("대시보드 요약 조회 실패:", res.error.code);
      throw new Error("대시보드 요약을 불러오지 못했습니다.");
    }
  }

  return {
    newNotices: (newRes.data ?? []) as Notice[],
    newNoticeCount: newRes.count ?? 0,
    closingNotices: (closingRes.data ?? []) as Notice[],
    interestContests: (interestRes.data ?? []) as Contest[],
    interestCount: interestRes.count ?? 0,
  };
}
