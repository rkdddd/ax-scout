"use client";

// Design Ref: DESIGN §1.5 — 링크로 공고 등록 폼. 주소만 넣으면 제목은 서버가 페이지에서 가져온다.
import { Link2 } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import FormField from "@/components/form-field";
import SubmitButton from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LinkFormState } from "./actions";
import { addNoticeByLink } from "./actions";

const initialState: LinkFormState = { status: "idle" };

export default function LinkForm() {
  const [state, formAction] = useActionState(addNoticeByLink, initialState);
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};
  const describe = (name: string) => (errors[name] ? `${name}-error` : undefined);

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <div className="flex gap-3 rounded-2xl bg-accent p-4 text-sm text-accent-foreground">
        <Link2 className="mt-0.5 size-5 shrink-0" aria-hidden />
        <p>
          공고 페이지의 주소만 붙여넣으면 제목을 자동으로 채워 드려요.
          <br />
          마감일은 페이지에서 읽지 않으니, 알고 있다면 직접 적어 주세요.
        </p>
      </div>

      <FormField id="url" label="공고 주소" required errors={errors.url}>
        <Input
          id="url"
          name="url"
          type="url"
          inputMode="url"
          required
          placeholder="https://"
          defaultValue={values.url}
          aria-invalid={Boolean(errors.url)}
          aria-describedby={describe("url")}
        />
      </FormField>

      <FormField
        id="title"
        label="공고 제목"
        hint="비워 두면 페이지에서 가져와요. 못 가져오면 직접 적어야 해요."
        errors={errors.title}
      >
        <Input
          id="title"
          name="title"
          type="text"
          defaultValue={values.title}
          autoFocus={state.needTitle}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={describe("title")}
        />
      </FormField>

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField id="organization" label="주최 기관" hint="모르면 사이트 주소로 채워요." errors={errors.organization}>
          <Input
            id="organization"
            name="organization"
            type="text"
            defaultValue={values.organization}
            aria-invalid={Boolean(errors.organization)}
            aria-describedby={describe("organization")}
          />
        </FormField>
        <FormField id="deadline" label="마감일" errors={errors.deadline}>
          <Input
            id="deadline"
            name="deadline"
            type="date"
            defaultValue={values.deadline}
            aria-invalid={Boolean(errors.deadline)}
            aria-describedby={describe("deadline")}
          />
        </FormField>
      </div>

      <div aria-live="polite">
        {state.status === "error" && state.message ? (
          <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
            {state.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        <Button asChild variant="ghost" size="lg">
          <Link href="/notices">취소</Link>
        </Button>
        <SubmitButton size="lg" pendingLabel="주소를 확인하는 중" className="sm:min-w-40">
          공고 등록하기
        </SubmitButton>
      </div>
    </form>
  );
}
