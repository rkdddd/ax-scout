// 활동 유형을 색으로 구분해 보여준다 (AI 사업 / 교육 / 거버넌스 / 대외활동).
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import type { ActivityType } from "@/lib/constants";

const TYPE_STYLES: Record<ActivityType, string> = {
  "AI 사업": "bg-accent text-accent-foreground",
  교육: "bg-success-soft text-success",
  거버넌스: "bg-warning-soft text-warning",
  대외활동: "bg-[#f1ebff] text-[#6b3fd6]",
};

// 타임라인 점 색 (배지와 같은 계열)
export const TYPE_DOT_COLORS: Record<ActivityType, string> = {
  "AI 사업": "bg-primary",
  교육: "bg-success",
  거버넌스: "bg-[#f5a524]",
  대외활동: "bg-[#8b5cf6]",
};

export default function TypeBadge({ type, className }: { type: ActivityType; className?: string }) {
  return <Badge className={cn(TYPE_STYLES[type], className)}>{type}</Badge>;
}
