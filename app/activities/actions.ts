"use server";

// Design Ref: DESIGN §2.1 — 폼 입력 → 서버 동작이 받음 → 검증 → Supabase 저장.
// 로그인이 없는 대신 서버에서 입력값을 모두 다시 검증한다.
// updated_at(수정 일시)은 DB 트리거가 저장할 때마다 자동으로 갱신한다.
import { getSupabase } from "@/lib/supabase";
import { activitySchema, toFieldErrors } from "@/lib/validation";

export type ActivityFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  // 오류가 났을 때 입력했던 값을 그대로 다시 보여주기 위해 돌려준다.
  values?: Record<string, string>;
};

const FIELDS = ["name", "date", "type", "content", "outcome"] as const;

export async function createActivity(
  _prevState: ActivityFormState,
  formData: FormData,
): Promise<ActivityFormState> {
  const values: Record<string, string> = {};
  for (const field of FIELDS) {
    values[field] = String(formData.get(field) ?? "");
  }

  const parsed = activitySchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      message: "입력한 내용을 확인해 주세요.",
      fieldErrors: toFieldErrors(parsed.error),
      values,
    };
  }

  const { error } = await getSupabase().from("activities").insert(parsed.data);
  if (error) {
    // 오류 코드만 서버 로그에 남긴다 (키·주소 같은 값은 남기지 않는다).
    console.error("활동실적 저장 실패:", error.code);
    return {
      status: "error",
      message: "저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
      values,
    };
  }

  // 활동 목록은 PLAN 11번에서 만든다. 그때까지는 같은 화면에서 완료를 알리고 이어서 등록할 수 있게 한다.
  return { status: "success", message: "활동을 등록했어요. 이어서 다른 활동도 등록할 수 있어요." };
}
