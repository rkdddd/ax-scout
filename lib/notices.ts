// Design Ref: DESIGN §3.2-1·§3.2-2 — 공고와 수집 기록 조회. DB 접근은 서버 코드에서만 한다.
import "server-only";
import type { NoticeOrigin } from "@/lib/constants";
import { getSupabase } from "@/lib/supabase";

export type Notice = {
  id: number;
  source_url: string;
  organization: string;
  title: string;
  deadline: string | null;
  eligibility: string | null;
  origin: NoticeOrigin;
  source_name: string | null;
  collected_at: string;
  created_at: string;
  archived_at: string | null;
};

export type CollectionRun = {
  started_at: string;
  finished_at: string | null;
  status: "성공" | "일부 실패" | "실패";
  error_summary: string | null;
};

const COLUMNS =
  "id,source_url,organization,title,deadline,eligibility,origin,source_name,collected_at,created_at,archived_at";

type ListOptions = { origin?: NoticeOrigin; includeArchived?: boolean };

// 공고 전체(필터 적용). 정렬과 "마감 후 오래된 공고 숨김"은 lib/notice-order.ts가 맡는다.
export async function listNotices({ origin, includeArchived }: ListOptions) {
  let query = getSupabase().from("notices").select(COLUMNS).order("id", { ascending: false });
  if (origin) query = query.eq("origin", origin);
  if (!includeArchived) query = query.is("archived_at", null);

  const { data, error } = await query;
  if (error) {
    console.error("공고 목록 조회 실패:", error.code);
    throw new Error("공고 목록을 불러오지 못했습니다.");
  }
  return data as Notice[];
}

export async function getNotice(id: number) {
  const { data, error } = await getSupabase().from("notices").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) {
    console.error("공고 조회 실패:", error.code);
    throw new Error("공고를 불러오지 못했습니다.");
  }
  return data as Notice | null;
}

// 가장 최근 자동 수집 기록. 한 번도 돌지 않았으면 null.
export async function getLatestRun() {
  const { data, error } = await getSupabase()
    .from("collection_runs")
    .select("started_at,finished_at,status,error_summary")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("수집 기록 조회 실패:", error.code);
    throw new Error("수집 기록을 불러오지 못했습니다.");
  }
  return data as CollectionRun | null;
}

// 공고 링크로 이미 등록한 공모전을 찾는다 ("등록됨" 표시용). 링크 → { 공모전 번호, 보관 여부 }
export async function findContestsBySourceUrls(urls: string[]) {
  const found = new Map<string, { id: number; archived: boolean }>();
  if (urls.length === 0) return found;
  const { data, error } = await getSupabase()
    .from("contests")
    .select("id,source_url,archived_at")
    .in("source_url", urls);
  if (error) {
    console.error("등록된 공모전 조회 실패:", error.code);
    throw new Error("등록 여부를 확인하지 못했습니다.");
  }
  for (const row of data as { id: number; source_url: string; archived_at: string | null }[]) {
    found.set(row.source_url, { id: row.id, archived: Boolean(row.archived_at) });
  }
  return found;
}
