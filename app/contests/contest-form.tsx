"use client";

// Design Ref: DESIGN §1.2 — 공모전 입력 폼. 개인정보 금지 안내 문구를 반드시 함께 보여준다.
import { Info } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import SubmitButton from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { CONTEST_STAGES, DEFAULT_CONTEST_STAGE } from "@/lib/constants";
import type { ContestFormState } from "./actions";

const initialState: ContestFormState = { status: "idle" };

// 칸 아래에 붙는 오류 문구
function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={id} className="text-sm font-medium text-destructive">
      {errors[0]}
    </p>
  );
}

// 라벨 + 입력 칸 + 오류 문구를 한 묶음으로 둔다
function Field({
  id,
  label,
  required,
  hint,
  errors,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  errors?: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-primary">*</span> : null}
      </Label>
      {children}
      {hint && !errors?.length ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      <FieldError id={`${id}-error`} errors={errors} />
    </div>
  );
}

type ContestFormProps = {
  // 등록·수정 중 어느 쪽이든 같은 폼을 쓴다. 저장 동작은 바깥에서 넘겨 받는다.
  action: (prevState: ContestFormState, formData: FormData) => Promise<ContestFormState>;
  // 수정할 때 칸에 미리 채워 둘 값
  initialValues?: Record<string, string>;
  submitLabel: string;
  cancelHref: string;
};

export default function ContestForm({
  action,
  initialValues,
  submitLabel,
  cancelHref,
}: ContestFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? initialValues ?? {};
  const describe = (name: string) => (errors[name] ? `${name}-error` : undefined);

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {/* 개인정보 금지 안내 (PRD §7) */}
      <div className="flex gap-3 rounded-2xl bg-accent p-4 text-sm text-accent-foreground">
        <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
        <p>
          이름·연락처·주민번호 같은 개인정보는 적지 마세요.
          <br />
          부서나 팀 단위까지만 적어 주세요.
        </p>
      </div>

      <Field id="name" label="공모전 이름" required errors={errors.name}>
        <Input
          id="name"
          name="name"
          type="text"
          required
          placeholder="예) 공공 AI 아이디어 공모전"
          defaultValue={values.name}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={describe("name")}
        />
      </Field>

      <Field id="organizer" label="주최 기관" errors={errors.organizer}>
        <Input
          id="organizer"
          name="organizer"
          type="text"
          defaultValue={values.organizer}
          aria-invalid={Boolean(errors.organizer)}
          aria-describedby={describe("organizer")}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="date" label="마감일" errors={errors.date}>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={values.date}
            aria-invalid={Boolean(errors.date)}
            aria-describedby={describe("date")}
          />
        </Field>

        <Field id="stage" label="단계" required errors={errors.stage}>
          {/* key: 오류 뒤에도 고른 단계가 남도록, 값이 바뀌면 선택 상자를 새로 그린다 */}
          <NativeSelect
            key={values.stage ?? "default"}
            id="stage"
            name="stage"
            defaultValue={values.stage ?? DEFAULT_CONTEST_STAGE}
            aria-invalid={Boolean(errors.stage)}
            aria-describedby={describe("stage")}
          >
            {CONTEST_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <Field id="result" label="결과" hint="수상 여부 등을 적어요. 아직이라면 비워 두세요." errors={errors.result}>
        <Input
          id="result"
          name="result"
          type="text"
          defaultValue={values.result}
          aria-invalid={Boolean(errors.result)}
          aria-describedby={describe("result")}
        />
      </Field>

      <Field id="note" label="메모" errors={errors.note}>
        <Textarea
          id="note"
          name="note"
          rows={4}
          defaultValue={values.note}
          aria-invalid={Boolean(errors.note)}
          aria-describedby={describe("note")}
        />
      </Field>

      <div aria-live="polite">
        {state.status === "error" && state.message ? (
          <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
            {state.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        <Button asChild variant="ghost" size="lg">
          <Link href={cancelHref}>취소</Link>
        </Button>
        <SubmitButton size="lg" pendingLabel="저장하는 중" className="sm:min-w-40">
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
