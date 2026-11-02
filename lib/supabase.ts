// Design Ref: DESIGN §4.2 — DB 접근은 서버 코드에서만 한다. 브라우저 코드가 이 파일을 가져오면 빌드가 실패한다.
// Plan SC: PLAN 4번 — 서버에서 Supabase에 연결한다 (키는 서버에서만 사용).
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// 서버 전용 Supabase 연결을 돌려준다. 처음 부를 때 한 번만 만든다.
export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    // 값 자체는 오류 문구에 넣지 않는다.
    throw new Error(
      "Supabase 환경변수(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)가 .env에 없습니다.",
    );
  }

  // 로그인 기능이 없으므로 세션을 저장하거나 갱신하지 않는다.
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
