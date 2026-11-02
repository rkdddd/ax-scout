// 폼의 한 칸: 라벨 + 입력 칸 + 안내/오류 문구를 한 묶음으로 둔다.
import { Label } from "@/components/ui/label";

export default function FormField({
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
      {errors?.length ? (
        <p id={`${id}-error`} className="text-sm font-medium text-destructive">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}
