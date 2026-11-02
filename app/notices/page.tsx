// 공고 화면은 PLAN 17·18번에서 만든다. 그때까지는 안내 화면을 보여준다.
import { Hourglass } from "lucide-react";
import Link from "next/link";
import EmptyState from "@/components/empty-state";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function NoticesPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 sm:py-12">
      <PageHeader title="공고" description="공공기관 AI 공모전 공고를 한곳에서 확인해요." />
      <div className="rounded-3xl bg-card">
        <EmptyState
          icon={Hourglass}
          title="곧 만나볼 수 있어요"
          description="공고를 모아 보여주는 기능을 준비하고 있어요."
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
