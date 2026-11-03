"use server";

// Design Ref: DESIGN §2.4·§2.5 — 링크로 공고 등록, 공고를 "검토" 단계 공모전으로 등록, 공고 숨기기·되살리기.
// 로그인이 없는 대신 서버에서 입력값을 모두 다시 검증하고, 공고 정보는 화면이 보낸 값이 아니라 DB에서 다시 읽어 쓴다.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session-guard";
import { NOTICE_CONTEST_STAGE } from "@/lib/constants";
import { normalizeLink } from "@/lib/link-normalize";
import { getNotice } from "@/lib/notices";
import { SafeFetchError, fetchPageInfo } from "@/lib/safe-fetch";
import { getSupabase } from "@/lib/supabase";
import { noticeLinkSchema, toFieldErrors } from "@/lib/validation";

export type LinkFormState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  // 오류가 났을 때 입력했던 값을 그대로 다시 보여주기 위해 돌려준다.
  values?: Record<string, string>;
  // 제목을 못 가져왔을 때 제목 칸을 강조하기 위한 표시
  needTitle?: boolean;
};

const FIELDS = ["url", "title", "organization", "deadline"] as const;
const UNIQUE_VIOLATION = "23505";

// 링크로 공고를 등록한다.
export async function addNoticeByLink(_prev: LinkFormState, formData: FormData): Promise<LinkFormState> {
  await requireSession();
  const values: Record<string, string> = {};
  for (const field of FIELDS) values[field] = String(formData.get(field) ?? "");

  const parsed = noticeLinkSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", message: "입력한 내용을 확인해 주세요.", fieldErrors: toFieldErrors(parsed.error), values };
  }
  const input = parsed.data;

  const link = normalizeLink(input.url);
  if (!link) {
    return {
      status: "error",
      message: "입력한 내용을 확인해 주세요.",
      fieldErrors: { url: ["http:// 또는 https:// 로 시작하는 주소를 입력해 주세요."] },
      values,
    };
  }

  const supabase = getSupabase();

  // 이미 있는 공고면 새로 만들지 않는다. 숨겨 둔 공고라면 다시 보이게 한다.
  const { data: existing, error: lookupError } = await supabase
    .from("notices")
    .select("id,archived_at")
    .eq("source_url", link)
    .maybeSingle();
  if (lookupError) {
    console.error("공고 중복 확인 실패:", lookupError.code);
    return { status: "error", message: "저장하지 못했어요. 잠시 후 다시 시도해 주세요.", values };
  }
  if (existing) {
    if (existing.archived_at) await supabase.from("notices").update({ archived_at: null }).eq("id", existing.id);
    revalidatePath("/notices");
    redirect(`/notices?notice=${existing.archived_at ? "restored" : "exists"}`);
  }

  // 제목이 비어 있으면 그 페이지에서 가져온다. 서버가 읽는 주소이므로 안전 읽기 도구만 쓴다.
  let title = input.title;
  let organization = input.organization;
  if (!title) {
    try {
      const info = await fetchPageInfo(link);
      title = info.title ?? null;
      organization = organization ?? info.siteName ?? null;
    } catch (error) {
      if (error instanceof SafeFetchError && error.code === "blocked") {
        return {
          status: "error",
          message: "입력한 내용을 확인해 주세요.",
          fieldErrors: { url: ["인터넷에 공개된 주소만 등록할 수 있어요."] },
          values,
        };
      }
      if (error instanceof SafeFetchError && error.code === "bad-url") {
        return {
          status: "error",
          message: "입력한 내용을 확인해 주세요.",
          fieldErrors: { url: [error.message] },
          values,
        };
      }
      // 연결 실패·시간 초과 등: 사용자가 제목을 직접 적게 안내한다.
    }
    if (!title) {
      return {
        status: "error",
        message: "페이지에서 제목을 가져오지 못했어요. 제목을 직접 입력해 주세요.",
        fieldErrors: { title: ["공고 제목을 입력해 주세요."] },
        values,
        needTitle: true,
      };
    }
  }

  const { error } = await supabase.from("notices").insert({
    source_url: link,
    organization: organization ?? new URL(link).hostname, // 기관을 모르면 사이트 주소로 채운다
    title,
    deadline: input.deadline,
    origin: "직접 등록",
  });
  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      revalidatePath("/notices");
      redirect("/notices?notice=exists");
    }
    console.error("공고 저장 실패:", error.code);
    return { status: "error", message: "저장하지 못했어요. 잠시 후 다시 시도해 주세요.", values };
  }

  revalidatePath("/notices");
  redirect("/notices?notice=added");
}

// 공고를 "검토" 단계의 공모전으로 등록한다. 같은 공고 링크로는 공모전이 두 번 만들어지지 않는다.
export async function registerNoticeAsContest(noticeId: number): Promise<void> {
  await requireSession();
  if (!Number.isSafeInteger(noticeId) || noticeId < 1) redirect("/notices");

  const notice = await getNotice(noticeId); // 화면에서 받은 값을 믿지 않고 DB에서 다시 읽는다
  if (!notice) redirect("/notices");

  const { data, error } = await getSupabase()
    .from("contests")
    .insert({
      name: notice.title.slice(0, 200),
      organizer: notice.organization.slice(0, 200),
      date: notice.deadline,
      stage: NOTICE_CONTEST_STAGE,
      source_url: notice.source_url,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      // 이미 이 공고로 등록한 공모전이 있다 → 새로 만들지 않고 기존 항목으로 안내한다.
      const { data: found } = await getSupabase().from("contests").select("id").eq("source_url", notice.source_url).maybeSingle();
      if (found) redirect(`/contests/${found.id}?notice=exists`);
    }
    console.error("공고 → 공모전 등록 실패:", error.code);
    throw new Error("공모전으로 등록하지 못했습니다.");
  }

  revalidatePath("/contests");
  revalidatePath("/notices");
  redirect(`/contests/${data.id}?notice=registered`);
}

// 공고 숨기기·되살리기 (지우지 않고 archived_at 만 넣거나 비운다)
async function setHidden(noticeId: number, hidden: boolean): Promise<void> {
  if (!Number.isSafeInteger(noticeId) || noticeId < 1) return;
  const { error } = await getSupabase()
    .from("notices")
    .update({ archived_at: hidden ? new Date().toISOString() : null })
    .eq("id", noticeId);
  if (error) {
    console.error(hidden ? "공고 숨기기 실패:" : "공고 되살리기 실패:", error.code);
    throw new Error(hidden ? "숨기지 못했습니다." : "되살리지 못했습니다.");
  }
  revalidatePath("/notices");
}

export async function hideNotice(noticeId: number): Promise<void> {
  await requireSession();
  await setHidden(noticeId, true);
}

export async function restoreNotice(noticeId: number): Promise<void> {
  await requireSession();
  await setHidden(noticeId, false);
}
