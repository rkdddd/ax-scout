// Design Ref: DESIGN §1.4 — 없는 번호로 접속했을 때의 안내 화면
import { FileQuestion } from "lucide-react";
import Link from "next/link";
import EmptyState from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function ContestNotFound() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12">
      <div className="rounded-3xl bg-card">
        <EmptyState
          icon={FileQuestion}
          title="찾을 수 없는 항목입니다"
          description="주소가 잘못되었거나 없는 공모전이에요."
          action={
            <Button asChild>
              <Link href="/contests">공모전 목록으로</Link>
            </Button>
          }
        />
      </div>
    </main>
  );
}
