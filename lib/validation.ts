// Design Ref: DESIGN §4 — 입력 검증은 서버에서 Zod로 한다. 화면 쪽 검사만 믿지 않는다.
// Plan SC: PLAN 6번 — 필수값 검증.
import { z } from "zod";
import { CONTEST_STAGES } from "@/lib/constants";

// 비워 둘 수 있는 글자 칸. 앞뒤 공백을 지우고, 비었으면 null(= 화면에서 "미입력")로 저장한다.
function optionalText(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max, `${label}은(는) ${max}자 이하로 적어 주세요.`)
    .transform((value) => (value === "" ? null : value));
}

// 비워 둘 수 있는 날짜 칸 (YYYY-MM-DD). 2월 31일 같은 없는 날짜는 거른다.
const optionalDate = z
  .string()
  .trim()
  .refine(
    (value) =>
      value === "" ||
      (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
        new Date(`${value}T00:00:00Z`).toISOString().startsWith(value)),
    "날짜를 올바르게 입력해 주세요.",
  )
  .transform((value) => (value === "" ? null : value));

// 공모전 등록·수정 폼 (DESIGN §3.1)
export const contestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "공모전 이름을 입력해 주세요.")
    .max(200, "공모전 이름은 200자 이하로 적어 주세요."),
  organizer: optionalText(200, "주최 기관"),
  date: optionalDate,
  stage: z.enum(CONTEST_STAGES, { error: "단계를 선택해 주세요." }),
  result: optionalText(500, "결과"),
  note: optionalText(2000, "메모"),
});

export type ContestInput = z.infer<typeof contestSchema>;

// 검증 실패를 칸별 오류 문구 목록으로 바꾼다.
export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  return z.flattenError(error).fieldErrors as Record<string, string[]>;
}
