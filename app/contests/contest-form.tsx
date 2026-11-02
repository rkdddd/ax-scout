"use client";

// Design Ref: DESIGN §1.2 — 공모전 입력 폼. 개인정보 금지 안내 문구를 반드시 함께 보여준다.
import { useActionState } from "react";
import { CONTEST_STAGES, DEFAULT_CONTEST_STAGE } from "@/lib/constants";
import { createContest, type ContestFormState } from "./actions";

const initialState: ContestFormState = { status: "idle" };

const inputClass =
  "w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-foreground focus:outline-none";

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={id} className="mt-1 text-sm text-red-600">
      {errors[0]}
    </p>
  );
}

export default function ContestForm() {
  const [state, formAction, pending] = useActionState(createContest, initialState);
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {/* 개인정보 금지 안내 (PRD §7) */}
      <p className="rounded-md bg-foreground/5 px-3 py-2 text-sm text-foreground/80">
        이름·연락처·주민번호 등 개인정보는 입력하지 마세요. 부서나 팀 단위까지만 적어 주세요.
      </p>

      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium">
          공모전 이름 <span className="text-red-600">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={values.name}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "name-error" : undefined}
          className={inputClass}
        />
        <FieldError id="name-error" errors={errors.name} />
      </div>

      <div>
        <label htmlFor="organizer" className="mb-1 block text-sm font-medium">
          주최 기관
        </label>
        <input
          id="organizer"
          name="organizer"
          type="text"
          defaultValue={values.organizer}
          aria-invalid={Boolean(errors.organizer)}
          aria-describedby={errors.organizer ? "organizer-error" : undefined}
          className={inputClass}
        />
        <FieldError id="organizer-error" errors={errors.organizer} />
      </div>

      <div>
        <label htmlFor="date" className="mb-1 block text-sm font-medium">
          마감일
        </label>
        <input
          id="date"
          name="date"
          type="date"
          defaultValue={values.date}
          aria-invalid={Boolean(errors.date)}
          aria-describedby={errors.date ? "date-error" : undefined}
          className={inputClass}
        />
        <FieldError id="date-error" errors={errors.date} />
      </div>

      <div>
        <label htmlFor="stage" className="mb-1 block text-sm font-medium">
          단계 <span className="text-red-600">*</span>
        </label>
        {/* key: 오류 뒤에도 고른 단계가 남도록, 값이 바뀌면 선택 상자를 새로 그린다 */}
        <select
          key={values.stage ?? "default"}
          id="stage"
          name="stage"
          defaultValue={values.stage ?? DEFAULT_CONTEST_STAGE}
          aria-invalid={Boolean(errors.stage)}
          aria-describedby={errors.stage ? "stage-error" : undefined}
          className={inputClass}
        >
          {CONTEST_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {stage}
            </option>
          ))}
        </select>
        <FieldError id="stage-error" errors={errors.stage} />
      </div>

      <div>
        <label htmlFor="result" className="mb-1 block text-sm font-medium">
          결과 (수상 여부 등)
        </label>
        <input
          id="result"
          name="result"
          type="text"
          defaultValue={values.result}
          aria-invalid={Boolean(errors.result)}
          aria-describedby={errors.result ? "result-error" : undefined}
          className={inputClass}
        />
        <FieldError id="result-error" errors={errors.result} />
      </div>

      <div>
        <label htmlFor="note" className="mb-1 block text-sm font-medium">
          메모
        </label>
        <textarea
          id="note"
          name="note"
          rows={4}
          defaultValue={values.note}
          aria-invalid={Boolean(errors.note)}
          aria-describedby={errors.note ? "note-error" : undefined}
          className={inputClass}
        />
        <FieldError id="note-error" errors={errors.note} />
      </div>

      <div aria-live="polite" className="min-h-6 text-sm">
        {state.status === "error" && state.message ? (
          <p className="text-red-600">{state.message}</p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-foreground px-5 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {pending ? "저장하는 중..." : "등록"}
      </button>
    </form>
  );
}
