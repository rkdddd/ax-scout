// Design Ref: DESIGN §3.1 — 공모전 조회. DB 접근은 서버 코드에서만 한다.
import "server-only";
import type { ContestStage } from "@/lib/constants";
import { getSupabase } from "@/lib/supabase";

export type Contest = {
  id: number;
  name: string;
  organizer: string | null;
  date: string | null; // 마감일(YYYY-MM-DD)
  stage: ContestStage;
  result: string | null;
  note: string | null;
  source_url: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

const COLUMNS =
  "id,name,organizer,date,stage,result,note,source_url,archived_at,created_at,updated_at";

type ListOptions = {
  stage?: ContestStage;
  includeArchived?: boolean;
};

// 공모전 목록. 기본으로 보관된 항목은 빼고, 최근에 수정한 것이 위에 온다.
export async function listContests({ stage, includeArchived }: ListOptions) {
  let query = getSupabase()
    .from("contests")
    .select(COLUMNS)
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false });
  if (stage) query = query.eq("stage", stage);
  if (!includeArchived) query = query.is("archived_at", null);

  const { data, error } = await query;
  if (error) {
    console.error("공모전 목록 조회 실패:", error.code);
    throw new Error("공모전 목록을 불러오지 못했습니다.");
  }
  return data as Contest[];
}

// 단계별 공모전 개수 (보관된 항목은 제외). 없는 단계는 0으로 채운다.
export async function countContestsByStage(): Promise<Record<ContestStage, number>> {
  const { data, error } = await getSupabase()
    .from("contests")
    .select("stage")
    .is("archived_at", null);
  if (error) {
    console.error("단계별 개수 조회 실패:", error.code);
    throw new Error("공모전 현황을 불러오지 못했습니다.");
  }

  const counts: Record<ContestStage, number> = { 관심: 0, 검토: 0, "참가 진행": 0, 완료: 0 };
  for (const row of data as { stage: ContestStage }[]) counts[row.stage] += 1;
  return counts;
}

// 마감이 가까운 공모전. 오늘 이후에 마감되고 아직 끝나지 않은(완료가 아닌) 항목만, 가까운 순서로.
// today는 한국 날짜(YYYY-MM-DD)다.
export async function listUpcomingContests(today: string, limit: number) {
  const { data, error } = await getSupabase()
    .from("contests")
    .select(COLUMNS)
    .is("archived_at", null)
    .neq("stage", "완료")
    .gte("date", today)
    .order("date", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("마감 임박 공모전 조회 실패:", error.code);
    throw new Error("마감이 가까운 공모전을 불러오지 못했습니다.");
  }
  return data as Contest[];
}

// 공모전 한 건. 없으면 null.
export async function getContest(id: number) {
  const { data, error } = await getSupabase()
    .from("contests")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("공모전 조회 실패:", error.code);
    throw new Error("공모전을 불러오지 못했습니다.");
  }
  return data as Contest | null;
}
