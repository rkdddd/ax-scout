"use server";

// Design Ref: DESIGN §2.1 — 폼 입력 → 서버 동작이 받음 → 검증 → Supabase 저장 → 화면 갱신.
// 로그인이 없는 대신 서버에서 입력값을 모두 다시 검증한다.
import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";
import { contestSchema, toFieldErrors } from "@/lib/validation";

export type ContestFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  // 오류가 났을 때 입력했던 값을 그대로 다시 보여주기 위해 돌려준다.
  values?: Record<string, string>;
};

const FIELDS = ["name", "organizer", "date", "stage", "result", "note"] as const;

export async function createContest(
  _prevState: ContestFormState,
  formData: FormData,
): Promise<ContestFormState> {
  const values: Record<string, string> = {};
  for (const field of FIELDS) {
    values[field] = String(formData.get(field) ?? "");
  }

  const parsed = contestSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      message: "입력한 내용을 확인해 주세요.",
      fieldErrors: toFieldErrors(parsed.error),
      values,
    };
  }

  const { error } = await getSupabase().from("contests").insert(parsed.data);
  if (error) {
    // 오류 코드만 서버 로그에 남긴다 (키·주소 같은 값은 남기지 않는다).
    console.error("공모전 저장 실패:", error.code);
    return {
      status: "error",
      message: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      values,
    };
  }

  revalidatePath("/contests");
  return { status: "success", message: "공모전을 등록했습니다." };
}
