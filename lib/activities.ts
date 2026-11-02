// Design Ref: DESIGN §3.2 — 활동실적 조회. DB 접근은 서버 코드에서만 한다.
import "server-only";
import type { ActivityType } from "@/lib/constants";
import { getSupabase } from "@/lib/supabase";

export type Activity = {
  id: number;
  name: string;
  date: string; // 활동 날짜(YYYY-MM-DD)
  type: ActivityType;
  content: string | null;
  outcome: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

const COLUMNS = "id,name,date,type,content,outcome,archived_at,created_at,updated_at";

type ListOptions = {
  type?: ActivityType;
  includeArchived?: boolean;
};

// 활동 목록. 기본으로 보관된 항목은 빼고, 활동 날짜가 최근인 것이 위에 온다.
export async function listActivities({ type, includeArchived }: ListOptions) {
  let query = getSupabase()
    .from("activities")
    .select(COLUMNS)
    .order("date", { ascending: false })
    .order("id", { ascending: false });
  if (type) query = query.eq("type", type);
  if (!includeArchived) query = query.is("archived_at", null);

  const { data, error } = await query;
  if (error) {
    console.error("활동 목록 조회 실패:", error.code);
    throw new Error("활동 목록을 불러오지 못했습니다.");
  }
  return data as Activity[];
}

// 활동 한 건. 없으면 null.
export async function getActivity(id: number) {
  const { data, error } = await getSupabase()
    .from("activities")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("활동 조회 실패:", error.code);
    throw new Error("활동을 불러오지 못했습니다.");
  }
  return data as Activity | null;
}
