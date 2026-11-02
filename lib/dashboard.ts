// Design Ref: DESIGN §1.3 — 대시보드의 "최근 수정한 항목". 공모전과 활동을 합쳐 최근 수정순으로 보여준다.
import "server-only";
import type { ActivityType, ContestStage } from "@/lib/constants";
import { getSupabase } from "@/lib/supabase";

export type RecentItem =
  | { kind: "contest"; id: number; name: string; label: ContestStage; updated_at: string }
  | { kind: "activity"; id: number; name: string; label: ActivityType; updated_at: string };

// 보관되지 않은 공모전·활동 중 최근에 수정한 순서로 limit개.
export async function listRecentItems(limit: number): Promise<RecentItem[]> {
  const supabase = getSupabase();
  const [contests, activities] = await Promise.all([
    supabase
      .from("contests")
      .select("id,name,stage,updated_at")
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(limit),
    supabase
      .from("activities")
      .select("id,name,type,updated_at")
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(limit),
  ]);
  if (contests.error || activities.error) {
    console.error("최근 수정 항목 조회 실패:", contests.error?.code, activities.error?.code);
    throw new Error("최근 수정한 항목을 불러오지 못했습니다.");
  }

  const items: RecentItem[] = [
    ...(contests.data as { id: number; name: string; stage: ContestStage; updated_at: string }[]).map(
      (row) => ({ kind: "contest" as const, id: row.id, name: row.name, label: row.stage, updated_at: row.updated_at }),
    ),
    ...(activities.data as { id: number; name: string; type: ActivityType; updated_at: string }[]).map(
      (row) => ({ kind: "activity" as const, id: row.id, name: row.name, label: row.type, updated_at: row.updated_at }),
    ),
  ];
  return items.sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, limit);
}
