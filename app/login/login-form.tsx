"use client";

// 비밀번호 한 칸짜리 로그인 폼
import { useActionState } from "react";
import FormField from "@/components/form-field";
import SubmitButton from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import type { LoginState } from "./actions";
import { login } from "./actions";

const initialState: LoginState = { status: "idle" };

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormField
        id="password"
        label="비밀번호"
        required
        errors={state.status === "error" && state.message ? [state.message] : undefined}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          aria-invalid={state.status === "error"}
          aria-describedby={state.status === "error" ? "password-error" : undefined}
        />
      </FormField>
      <SubmitButton size="lg" pendingLabel="확인하는 중…">
        로그인
      </SubmitButton>
    </form>
  );
}
