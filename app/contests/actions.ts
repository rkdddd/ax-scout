"use server";

// Design Ref: DESIGN §2.1 — 폼 입력 → 서버 동작이 받음 → 검증 → Supabase 저장 → 화면 갱신.
// 로그인이 없는 대신 서버에서 입력값을 모두 다시 검증한다.
// updated_at(수정 일시)은 DB 트리거가 저장할 때마다 자동으로 갱신한다.
import { redirect } from "next/navigation";
import { refreshAllViews } from "@/lib/refresh";
import { requireSession } from "@/lib/session-guard";
import { CONTEST_STAGES } from "@/lib/constants";
import { getSupabase } from "@/lib/supabase";
import { contestSchema, toFieldErrors } from "@/lib/validation";

export type ContestFormState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  // 오류가 났을 때 입력했던 값을 그대로 다시 보여주기 위해 돌려준다.
  values?: Record<string, string>;
};

const FIELDS = ["name", "organizer", "date", "stage", "result", "note"] as const;

const SAVE_FAILED = "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";

// 폼에서 받은 값을 검증한다. 실패하면 화면에 돌려줄 상태를, 성공하면 저장할 값을 준다.
function validateForm(formData: FormData) {
  const values: Record<string, string> = {};
  for (const field of FIELDS) {
    values[field] = String(formData.get(field) ?? "");
  }

  const parsed = contestSchema.safeParse(values);
  if (!parsed.success) {
    const state: ContestFormState = {
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

export async function createContest(
  _prevState: ContestFormState,
  formData: FormData,
): Promise<ContestFormState> {
  await requireSession();
  const result = validateForm(formData);
  if (result.state) return result.state;

  const { error } = await getSupabase().from("contests").insert(result.data);
  if (error) {
    // 오류 코드만 서버 로그에 남긴다 (키·주소 같은 값은 남기지 않는다).
    console.error("공모전 저장 실패:", error.code);
    return { status: "error", message: SAVE_FAILED, values: result.values };
  }

  // 저장이 끝나면 목록으로 이동한다 (redirect는 오류처럼 던져지므로 try 밖에서 부른다).
  refreshAllViews();
  redirect("/contests?notice=created"); // notice: 화면에 "등록했어요" 알림을 잠깐 띄운다
}

// 공모전 수정. id는 화면에서 bind로 미리 넘겨 받는다.
export async function updateContest(
  id: number,
  _prevState: ContestFormState,
  formData: FormData,
): Promise<ContestFormState> {
  await requireSession();
  const result = validateForm(formData);
  if (result.state) return result.state;
  if (!isValidId(id)) {
    return { status: "error", message: "찾을 수 없는 항목입니다.", values: result.values };
  }

  const { data, error } = await getSupabase()
    .from("contests")
    .update(result.data)
    .eq("id", id)
    .select("id");
  if (error) {
    console.error("공모전 수정 실패:", error.code);
    return { status: "error", message: SAVE_FAILED, values: result.values };
  }
  if (!data?.length) {
    return { status: "error", message: "찾을 수 없는 항목입니다.", values: result.values };
  }

  refreshAllViews();
  refreshAllViews();
  redirect(`/contests/${id}?notice=updated`);
}

// 보관·복구 (DESIGN §2.2). 항목은 지우지 않고 archived_at 만 넣거나 비운다.
// 보관·복구도 항목을 바꾸는 일이라 수정 일시(updated_at)가 함께 갱신된다.
async function setArchived(id: number, archived: boolean): Promise<void> {
  if (!isValidId(id)) return;

  const { error } = await getSupabase()
    .from("contests")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) {
    console.error(archived ? "보관 실패:" : "복구 실패:", error.code);
    throw new Error(archived ? "보관하지 못했습니다." : "복구하지 못했습니다.");
  }

  refreshAllViews();
  refreshAllViews();
}

export async function archiveContest(id: number): Promise<void> {
  await requireSession();
  await setArchived(id, true);
}

export async function restoreContest(id: number): Promise<void> {
  await requireSession();
  await setArchived(id, false);
}

// 상세 화면의 단계 버튼. 단계만 바꾸고 같은 화면에 머문다.
export async function changeContestStage(id: number, formData: FormData): Promise<void> {
  await requireSession();
  const stage = CONTEST_STAGES.find((item) => item === formData.get("stage"));
  if (!stage || !isValidId(id)) return; // 화면 버튼으로는 생기지 않는 값이면 무시한다.

  const { error } = await getSupabase().from("contests").update({ stage }).eq("id", id);
  if (error) {
    console.error("단계 변경 실패:", error.code);
    throw new Error("단계를 바꾸지 못했습니다.");
  }

  refreshAllViews();
  refreshAllViews();
}
