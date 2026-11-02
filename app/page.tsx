// 대시보드(홈). 지금은 공모전 데이터로 "현황"과 "곧 마감되는 공모전"을 보여준다.
// 활동실적 집계와 기간 선택은 PLAN 12번에서 이어서 만든다.
import { CalendarClock, CircleCheck, Plus } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import EmptyState from "@/components/empty-state";
import PageHeader from "@/components/page-header";
import StageBadge from "@/components/stage-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CONTEST_STAGES } from "@/lib/constants";
import { countContestsByStage, listUpcomingContests } from "@/lib/contests";
import { formatDate, formatDday, todayInKorea } from "@/lib/format";

// 단계별 숫자 색 (단계 배지와 같은 색 계열)
const NUMBER_COLORS = {
  관심: "text-foreground",
  검토: "text-accent-foreground",
  "참가 진행": "text-warning",
  완료: "text-success",
} as const;

async function Dashboard() {
  await connection(); // 오늘 날짜를 쓰므로 요청 때마다 새로 계산한다
  const today = todayInKorea();

  let counts, upcoming;
  try {
    [counts, upcoming] = await Promise.all([countContestsByStage(), listUpcomingContests(today, 3)]);
  } catch {
    return (
      <div className="rounded-3xl bg-card">
        <EmptyState
          icon={CircleCheck}
          title="데이터를 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 공모전 현황: 숫자를 크게 */}
      <section className="rounded-3xl bg-card p-6" aria-labelledby="contest-status">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="contest-status" className="text-[17px] font-bold">
            공모전 현황
          </h2>
          <Link href="/contests" className="text-sm font-semibold text-primary hover:underline">
            전체 보기
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CONTEST_STAGES.map((stage) => (
            <li key={stage}>
              <Link
                href={`/contests?stage=${encodeURIComponent(stage)}`}
                data-press
                className="flex flex-col gap-1 rounded-2xl bg-surface px-4 py-4 hover:bg-[#e5e8eb]"
              >
                <span className="text-sm text-muted-foreground">{stage}</span>
                <span className={`text-[32px] leading-10 font-bold tracking-[-0.03em] ${NUMBER_COLORS[stage]}`}>
                  {counts[stage]}
                  <span className="ml-0.5 text-base font-semibold text-muted-foreground">건</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 오늘 확인할 정보: 곧 마감되는 공모전 */}
      <section className="rounded-3xl bg-card p-6" aria-labelledby="deadline-soon">
        <h2 id="deadline-soon" className="mb-2 text-[17px] font-bold">
          곧 마감돼요
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="마감이 다가오는 공모전이 없어요"
            description="마감일이 있는 공모전을 등록하면 여기에서 알려드려요."
          />
        ) : (
          <ul className="divide-y divide-border">
            {upcoming.map((contest) => (
              <li key={contest.id}>
                <Link
                  href={`/contests/${contest.id}`}
                  className="-mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-4 hover:bg-surface/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-semibold">{contest.name}</p>
                    <p className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
                      <StageBadge stage={contest.stage} />
                      마감 {formatDate(contest.date)}
                    </p>
                  </div>
                  <span className="shrink-0 text-[17px] font-bold text-primary">
                    {formatDday(contest.date as string, today)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="불러오는 중">
      <Skeleton className="h-48 rounded-3xl" />
      <Skeleton className="h-56 rounded-3xl" />
    </div>
  );
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 sm:py-12">
      <PageHeader
        title="오늘의 AX SCOUT"
        description="공모전 진행 상황과 마감 일정을 한눈에 확인해요."
        action={
          <Button asChild size="lg" className="max-sm:w-full">
            <Link href="/contests/new">
              <Plus aria-hidden /> 공모전 등록
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </main>
  );
}
