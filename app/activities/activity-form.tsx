"use client";

// Design Ref: DESIGN §1.2 — 활동실적 입력 폼. 개인정보 금지 안내 문구를 반드시 함께 보여준다.
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import FormField from "@/components/form-field";
import PrivacyNotice from "@/components/privacy-notice";
import SubmitButton from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ACTIVITY_TYPES } from "@/lib/constants";
import type { ActivityFormState } from "./actions";

const initialState: ActivityFormState = { status: "idle" };

type ActivityFormProps = {
  // 등록·수정 중 어느 쪽이든 같은 폼을 쓴다. 저장 동작은 바깥에서 넘겨 받는다.
  action: (prevState: ActivityFormState, formData: FormData) => Promise<ActivityFormState>;
  // 수정할 때 칸에 미리 채워 둘 값
  initialValues?: Record<string, string>;
  submitLabel: string;
  cancelHref: string;
};

export default function ActivityForm({
  action,
  initialValues,
  submitLabel,
  cancelHref,
}: ActivityFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? initialValues ?? {};
  const describe = (name: string) => (errors[name] ? `${name}-error` : undefined);

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <PrivacyNotice />

      {/* 저장이 끝나면 맨 위에서 알려준다 */}
      <div aria-live="polite">
        {state.status === "success" && state.message ? (
          <p className="flex items-center gap-2 rounded-2xl bg-success-soft px-4 py-3 text-sm font-semibold text-success">
            <CheckCircle2 className="size-5 shrink-0" aria-hidden />
            {state.message}
          </p>
        ) : null}
      </div>

      <FormField id="name" label="활동 이름" required errors={errors.name}>
        <Input
          id="name"
          name="name"
          type="text"
          required
          placeholder="예) 사내 생성형 AI 교육"
          defaultValue={values.name}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={describe("name")}
        />
      </FormField>

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField id="date" label="활동 날짜" required errors={errors.date}>
          <Input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={values.date}
            aria-invalid={Boolean(errors.date)}
            aria-describedby={describe("date")}
          />
        </FormField>

        <FormField id="type" label="유형" required errors={errors.type}>
          {/* key: 오류 뒤에도 고른 유형이 남도록, 값이 바뀌면 선택 상자를 새로 그린다 */}
          <NativeSelect
            key={values.type ?? "default"}
            id="type"
            name="type"
            defaultValue={values.type ?? ""}
            aria-invalid={Boolean(errors.type)}
            aria-describedby={describe("type")}
          >
            <option value="" disabled>
              유형을 선택해 주세요
            </option>
            {ACTIVITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      </div>

      <FormField id="content" label="내용" hint="어떤 활동이었는지 간단히 적어요." errors={errors.content}>
        <Textarea
          id="content"
          name="content"
          rows={4}
          defaultValue={values.content}
          aria-invalid={Boolean(errors.content)}
          aria-describedby={describe("content")}
        />
      </FormField>

      <FormField id="outcome" label="성과" hint="참석 인원, 결과물 등 남길 만한 성과를 적어요." errors={errors.outcome}>
        <Input
          id="outcome"
          name="outcome"
          type="text"
          defaultValue={values.outcome}
          aria-invalid={Boolean(errors.outcome)}
          aria-describedby={describe("outcome")}
        />
      </FormField>

      <div aria-live="polite">
        {state.status === "error" && state.message ? (
          <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
            {state.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        <Button asChild variant="ghost" size="lg">
          <Link href={cancelHref}>돌아가기</Link>
        </Button>
        <SubmitButton size="lg" pendingLabel="저장하는 중" className="sm:min-w-40">
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
