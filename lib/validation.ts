// Design Ref: DESIGN §4 — 입력 검증은 서버에서 Zod로 한다. 화면 쪽 검사만 믿지 않는다.
// Plan SC: PLAN 6·10번 — 필수값 검증.
import { z } from "zod";
import { ACTIVITY_TYPES, CONTEST_STAGES } from "@/lib/constants";

// 비워 둘 수 있는 글자 칸. 앞뒤 공백을 지우고, 비었으면 null(= 화면에서 "미입력")로 저장한다.
// topic은 조사까지 붙인 칸 이름이다 (예: "주최 기관은", "결과는").
function optionalText(max: number, topic: string) {
  return z
    .string()
    .trim()
    .max(max, `${topic} ${max}자 이하로 적어 주세요.`)
    .transform((value) => (value === "" ? null : value));
}

// YYYY-MM-DD 모양이면서 실제로 있는 날짜인지 본다 (2026-02-31, 2026-13-01 같은 값은 거른다).
function isRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  // 없는 날짜는 Invalid Date가 되어 toISOString()이 오류를 던지므로 먼저 걸러야 한다.
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

const DATE_ERROR = "날짜를 올바르게 입력해 주세요.";

// 비워 둘 수 있는 날짜 칸
const optionalDate = z
  .string()
  .trim()
  .refine((value) => value === "" || isRealDate(value), DATE_ERROR)
  .transform((value) => (value === "" ? null : value));

// 꼭 있어야 하는 이름 칸 (칸 이름이 모두 "이름"으로 끝나서 조사는 "을/은"으로 고정)
function requiredName(label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label}을 입력해 주세요.`)
    .max(200, `${label}은 200자 이하로 적어 주세요.`);
}

// 공모전 등록·수정 폼 (DESIGN §3.1)
export const contestSchema = z.object({
  name: requiredName("공모전 이름"),
  organizer: optionalText(200, "주최 기관은"),
  date: optionalDate,
  stage: z.enum(CONTEST_STAGES, { error: "단계를 선택해 주세요." }),
  result: optionalText(500, "결과는"),
  note: optionalText(2000, "메모는"),
});

// 활동실적 등록·수정 폼 (DESIGN §3.2)
export const activitySchema = z.object({
  name: requiredName("활동 이름"),
  date: z
    .string()
    .trim()
    .min(1, "활동 날짜를 입력해 주세요.")
    .refine(isRealDate, DATE_ERROR),
  type: z.enum(ACTIVITY_TYPES, { error: "유형을 선택해 주세요." }),
  content: optionalText(2000, "내용은"),
  outcome: optionalText(500, "성과는"),
});

// 링크로 공고 등록 폼 (DESIGN §1.5). 제목·기관·마감일은 비워도 된다 (제목은 페이지에서 가져온다).
export const noticeLinkSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "공고 주소를 입력해 주세요.")
    .max(2000, "주소가 너무 길어요."),
  title: optionalText(300, "제목은"),
  organization: optionalText(200, "기관 이름은"),
  deadline: optionalDate,
});

export type ContestInput = z.infer<typeof contestSchema>;
export type ActivityInput = z.infer<typeof activitySchema>;

// 검증 실패를 칸별 오류 문구 목록으로 바꾼다.
export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  return z.flattenError(error).fieldErrors as Record<string, string[]>;
}
