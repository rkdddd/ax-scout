// 공고가 어디서 왔는지 보여준다. 검색 알림에서 온 공고는 사람이 확인해야 하므로 "후보"로 표시한다.
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import type { NoticeOrigin } from "@/lib/constants";

const ORIGIN_STYLES: Record<NoticeOrigin, { label: string; className: string }> = {
  "직접 등록": { label: "직접 등록", className: "bg-muted text-secondary-foreground" },
  "기관 RSS": { label: "기관 RSS", className: "bg-accent text-accent-foreground" },
  "검색 알림": { label: "후보", className: "bg-warning-soft text-warning" },
};

export default function NoticeOriginBadge({ origin, className }: { origin: NoticeOrigin; className?: string }) {
  const style = ORIGIN_STYLES[origin];
  return <Badge className={cn(style.className, className)}>{style.label}</Badge>;
}
