// 화면 맨 위의 제목 영역. 제목은 크게, 설명은 짧게, 가장 중요한 행동은 오른쪽에 둔다.
import type { ReactNode } from "react";

export default function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] leading-9 font-bold tracking-[-0.03em]">{title}</h1>
        {description ? (
          <p className="mt-1 text-[15px] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
