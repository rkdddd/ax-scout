"use client";

// "새로고침": 자동 수집을 실행하는 게 아니라, 이미 저장된 최신 목록을 다시 불러온다 (PRD §5).
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export default function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={pending}
      aria-busy={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      <RefreshCw className={pending ? "animate-spin" : ""} aria-hidden />
      {pending ? "불러오는 중" : "새로고침"}
    </Button>
  );
}
