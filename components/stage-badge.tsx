// 공모전 단계를 색으로 구분해 보여준다 (관심 → 검토 → 참가 진행 → 완료).
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import type { ContestStage } from "@/lib/constants";

const STAGE_STYLES: Record<ContestStage, string> = {
  관심: "bg-muted text-secondary-foreground",
  검토: "bg-accent text-accent-foreground",
  "참가 진행": "bg-warning-soft text-warning",
  완료: "bg-success-soft text-success",
};

export default function StageBadge({
  stage,
  className,
}: {
  stage: ContestStage;
  className?: string;
}) {
  return <Badge className={cn(STAGE_STYLES[stage], className)}>{stage}</Badge>;
}
