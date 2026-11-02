// 활동실적 화면은 PLAN 10·11번에서 만든다. 그때까지는 안내 화면을 보여준다.
import { Hourglass } from "lucide-react";
import Link from "next/link";
import EmptyState from "@/components/empty-state";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function ActivitiesPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 sm:py-12">
      <PageHeader title="활동실적" description="AI 사업·교육·거버넌스·대외활동을 기록해요." />
      <div className="rounded-3xl bg-card">
        <EmptyState
          icon={Hourglass}
          title="곧 만나볼 수 있어요"
          description="활동실적 기록 기능을 준비하고 있어요."
          action={
            <Button asChild variant="tonal">
              <Link href="/contests">공모전 먼저 보기</Link>
            </Button>
          }
        />
      </div>
    </main>
  );
}
