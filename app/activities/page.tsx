// 활동실적 목록은 PLAN 11번에서 만든다. 그때까지는 등록 화면으로 가는 안내를 보여준다.
import { Plus, Hourglass } from "lucide-react";
import Link from "next/link";
import EmptyState from "@/components/empty-state";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function ActivitiesPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 sm:py-12">
      <PageHeader
        title="활동실적"
        description="AI 사업·교육·거버넌스·대외활동을 기록해요."
        action={
          <Button asChild size="lg" className="max-sm:w-full">
            <Link href="/activities/new">
              <Plus aria-hidden /> 새 활동
            </Link>
          </Button>
        }
      />
      <div className="rounded-3xl bg-card">
        <EmptyState
          icon={Hourglass}
          title="활동 목록은 곧 만나볼 수 있어요"
          description="지금은 활동을 등록해 둘 수 있어요."
        />
      </div>
    </main>
  );
}
