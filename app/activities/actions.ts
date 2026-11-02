"use server";

// Design Ref: DESIGN §2.1·§2.2 — 폼 입력 → 서버 동작이 받음 → 검증 → Supabase 저장 → 화면 갱신.
// 로그인이 없는 대신 서버에서 입력값을 모두 다시 검증한다.
// updated_at(수정 일시)은 DB 트리거가 저장할 때마다 자동으로 갱신한다. 항목은 지우지 않고 보관만 한다.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { activitySchema, toFieldErrors } from "@/lib/validation";

export type ActivityFormState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  // 오류가 났을 때 입력했던 값을 그대로 다시 보여주기 위해 돌려준다.
  values?: Record<string, string>;
};

const FIELDS = ["name", "date", "type", "content", "outcome"] as const;

const SAVE_FAILED = "저장하지 못했어요. 잠시 후 다시 시도해 주세요.";
const NOT_FOUND = "찾을 수 없는 항목이에요.";

// 폼에서 받은 값을 검증한다. 실패하면 화면에 돌려줄 상태를, 성공하면 저장할 값을 준다.
function validateForm(formData: FormData) {
  const values: Record<string, string> = {};
  for (const field of FIELDS) {
    values[field] = String(formData.get(field) ?? "");
  }

  const parsed = activitySchema.safeParse(values);
  if (!parsed.success) {
    const state: ActivityFormState = {
      status: "error",
      message: "입력한 내용을 확인해 주세요.",
      fieldErrors: toFieldErrors(parsed.error),
      values,
    };
    return { state };
  }
  return { data: parsed.data, values };
}

// 번호가 양의 정수인지 확인한다 (주소·폼에서 받은 값은 믿지 않는다).
function isValidId(id: number) {
  return Number.isSafeInteger(id) && id >= 1;
}

export async function createActivity(
  _prevState: ActivityFormState,
  formData: FormData,
): Promise<ActivityFormState> {
  const result = validateForm(formData);
  if (result.state) return result.state;

  const { error } = await getSupabase().from("activities").insert(result.data);
  if (error) {
    // 오류 코드만 서버 로그에 남긴다 (키·주소 같은 값은 남기지 않는다).
    console.error("활동실적 저장 실패:", error.code);
    return { status: "error", message: SAVE_FAILED, values: result.values };
  }

  // 저장이 끝나면 목록으로 이동한다 (redirect는 오류처럼 던져지므로 try 밖에서 부른다).
  revalidatePath("/activities");
  redirect("/activities?notice=created"); // notice: 화면에 "등록했어요" 알림을 잠깐 띄운다
}

// 활동 수정. id는 화면에서 bind로 미리 넘겨 받는다.
export async function updateActivity(
  id: number,
  _prevState: ActivityFormState,
  formData: FormData,
): Promise<ActivityFormState> {
  const result = validateForm(formData);
  if (result.state) return result.state;
  if (!isValidId(id)) {
    return { status: "error", message: NOT_FOUND, values: result.values };
  }

  const { data, error } = await getSupabase()
    .from("activities")
    .update(result.data)
    .eq("id", id)
    .select("id");
  if (error) {
    console.error("활동실적 수정 실패:", error.code);
    return { status: "error", message: SAVE_FAILED, values: result.values };
  }
  if (!data?.length) {
    return { status: "error", message: NOT_FOUND, values: result.values };
  }

  revalidatePath("/activities");
  revalidatePath(`/activities/${id}`);
  redirect(`/activities/${id}?notice=updated`);
}

// 보관·복구 (DESIGN §2.2). 항목은 지우지 않고 archived_at 만 넣거나 비운다.
// 보관·복구도 항목을 바꾸는 일이라 수정 일시(updated_at)가 함께 갱신된다.
async function setArchived(id: number, archived: boolean): Promise<void> {
  if (!isValidId(id)) return;

  const { error } = await getSupabase()
    .from("activities")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) {
    console.error(archived ? "활동 보관 실패:" : "활동 복구 실패:", error.code);
    throw new Error(archived ? "보관하지 못했습니다." : "복구하지 못했습니다.");
  }

  revalidatePath("/activities");
  revalidatePath(`/activities/${id}`);
}

export async function archiveActivity(id: number): Promise<void> {
  await setArchived(id, true);
}

export async function restoreActivity(id: number): Promise<void> {
  await setArchived(id, false);
}
