// Design Ref: DESIGN §1.3 — 대시보드(홈). 공모전 현황과 활동 현황을 따로 보여주고, 같은 기간 선택을 따른다.
// Plan SC: PRD §5 — 집계는 등록된 데이터만 쓰고, 없으면 0. 기간 기준은 공모전=마감일, 활동=활동 날짜.
import { CalendarClock, CircleAlert, Plus } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import EmptyState from "@/components/empty-state";
import PageHeader from "@/components/page-header";
import StageBadge from "@/components/stage-badge";
import TypeBadge from "@/components/type-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { countActivitiesByType } from "@/lib/activities";
import { ACTIVITY_TYPES, CONTEST_STAGES } from "@/lib/constants";
import { countContestsByStage, countUndatedContests, listUpcomingContests } from "@/lib/contests";
import { listRecentItems } from "@/lib/dashboard";
import { formatDate, formatDateTime, formatDday, todayInKorea } from "@/lib/format";
import { PERIODS, PERIOD_LABELS, formatRange, getRange, parsePeriod, type Period } from "@/lib/period";

const DEFAULT_PERIOD: Period = "month";

// 단계별 숫자 색 (단계 배지와 같은 색 계열)
const STAGE_NUMBER_COLORS = {
  관심: "text-foreground",
  검토: "text-accent-foreground",
  "참가 진행": "text-warning",
  완료: "text-success",
} as const;

// 숫자 카드에서 목록으로 갈 때 같은 기간 조건을 함께 넘긴다 ("전체"는 조건 없음).
function listHref(base: string, filterKey: string, filterValue: string, period: Period) {
  const params = new URLSearchParams({ [filterKey]: filterValue });
  if (period !== "all") params.set("period", period);
  return `${base}?${params.toString()}`;
}

// 기간 선택: 이번 주 / 이번 달 / 전체
function PeriodTabs({ current }: { current: Period }) {
  return (
    <nav aria-label="기간 선택" className="mb-4 flex w-full gap-1 rounded-2xl bg-card p-1 sm:w-fit">
      {PERIODS.map((period) => (
        <Link
          key={period}
          href={period === DEFAULT_PERIOD ? "/" : `/?period=${period}`}
          data-press
          aria-current={current === period ? "true" : undefined}
          className={`flex-1 rounded-xl px-5 py-2 text-center text-[15px] font-semibold sm:flex-none ${
            current === period
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:bg-surface hover:text-foreground"
          }`}
        >
          {PERIOD_LABELS[period]}
        </Link>
      ))}
    </nav>
  );
}

// 숫자 한 칸 (이름 + 큰 숫자). 누르면 같은 조건의 목록으로 간다.
function StatTile({
  href,
  label,
  count,
  numberClass,
}: {
  href: string;
  label: string;
  count: number;
  numberClass: string;
}) {
  return (
    <li>
      <Link
        href={href}
        data-press
        className="flex flex-col gap-1 rounded-2xl bg-surface px-4 py-4 hover:bg-[#e5e8eb]"
        aria-label={`${label} ${count}건 보기`}
      >
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`text-[32px] leading-10 font-bold tracking-[-0.03em] ${numberClass}`}>
          {count}
          <span className="ml-0.5 text-base font-semibold text-muted-foreground">건</span>
        </span>
      </Link>
    </li>
  );
}

function sum(counts: Record<string, number>) {
  return Object.values(counts).reduce((total, value) => total + value, 0);
}

async function Dashboard({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const query = await searchParams;
  await connection(); // 오늘 날짜를 쓰므로 요청 때마다 새로 계산한다
  const period = parsePeriod(query.period) ?? DEFAULT_PERIOD;
  const today = todayInKorea();
  const range = getRange(period, today);

  let contestCounts, activityCounts, undated, upcoming, recent;
  try {
    [contestCounts, activityCounts, undated, upcoming, recent] = await Promise.all([
      countContestsByStage(range),
      countActivitiesByType(range),
      countUndatedContests(),
      listUpcomingContests(today, 3),
      listRecentItems(5),
    ]);
  } catch {
    return (
      <div className="rounded-3xl bg-card">
        <EmptyState
          icon={CircleAlert}
          title="데이터를 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          action={
            <Button asChild variant="tonal">
              <Link href={period === DEFAULT_PERIOD ? "/" : `/?period=${period}`}>다시 불러오기</Link>
            </Button>
          }
        />
      </div>
    );
  }

  // 기간을 고르면 마감일이 없는 공모전은 집계에서 빠지므로 몇 건인지 알려 준다.
  const showUndatedNote = period !== "all" && undated > 0;

  return (
    <>
      <PeriodTabs current={period} />
      <p className="mb-4 -mt-1 text-sm text-muted-foreground">
        {range ? `${formatRange(range)} 기준` : "등록된 전체 기간 기준"}
      </p>

      <div className="flex flex-col gap-4">
        {/* 공모전 현황 (단계별, 마감일 기준) */}
        <section className="rounded-3xl bg-card p-6" aria-labelledby="contest-status">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <div>
              <h2 id="contest-status" className="text-[17px] font-bold">
                공모전 현황
              </h2>
              <p className="text-sm text-muted-foreground">마감일 기준 · 총 {sum(contestCounts)}건</p>
            </div>
            <Link href="/contests" className="shrink-0 text-sm font-semibold text-primary hover:underline">
              전체 보기
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CONTEST_STAGES.map((stage) => (
              <StatTile
                key={stage}
                href={listHref("/contests", "stage", stage, period)}
                label={stage}
                count={contestCounts[stage]}
                numberClass={STAGE_NUMBER_COLORS[stage]}
              />
            ))}
          </ul>
          {showUndatedNote ? (
            <p className="mt-4 rounded-2xl bg-surface px-4 py-3 text-sm text-muted-foreground">
              마감일을 적지 않은 공모전 <strong className="text-foreground">{undated}건</strong>은 이 기간에
              포함되지 않았어요.{" "}
              <Link href="/?period=all" className="font-semibold text-primary hover:underline">
                전체 기간 보기
              </Link>
            </p>
          ) : null}
        </section>

        {/* 활동 현황 (유형별, 활동 날짜 기준) */}
        <section className="rounded-3xl bg-card p-6" aria-labelledby="activity-status">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <div>
              <h2 id="activity-status" className="text-[17px] font-bold">
                활동 현황
              </h2>
              <p className="text-sm text-muted-foreground">활동 날짜 기준 · 총 {sum(activityCounts)}건</p>
            </div>
            <Link href="/activities" className="shrink-0 text-sm font-semibold text-primary hover:underline">
              전체 보기
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ACTIVITY_TYPES.map((type) => (
              <StatTile
                key={type}
                href={listHref("/activities", "type", type, period)}
                label={type}
                count={activityCounts[type]}
                numberClass="text-foreground"
              />
            ))}
          </ul>
        </section>

        {/* 오늘 확인할 정보: 곧 마감되는 공모전 (기간 선택과 상관없이 항상 오늘 기준) */}
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

        {/* 최근 수정한 항목 (보관된 항목은 제외) */}
        <section className="rounded-3xl bg-card p-6" aria-labelledby="recent-items">
          <h2 id="recent-items" className="mb-2 text-[17px] font-bold">
            최근 수정한 항목
          </h2>
          {recent.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="아직 등록한 항목이 없어요"
              description="공모전이나 활동을 등록하면 여기에 최근 수정한 순서로 보여요."
            />
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <Link
                    href={item.kind === "contest" ? `/contests/${item.id}` : `/activities/${item.id}`}
                    className="-mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-3.5 hover:bg-surface/60"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="shrink-0 rounded-md bg-surface px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                        {item.kind === "contest" ? "공모전" : "활동"}
                      </span>
                      <p className="truncate text-[15px] font-semibold">{item.name}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {item.kind === "contest" ? <StageBadge stage={item.label} /> : <TypeBadge type={item.label} />}
                      <span className="hidden text-sm text-muted-foreground sm:inline">
                        {formatDateTime(item.updated_at)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="불러오는 중">
      <Skeleton className="h-12 w-72 rounded-2xl" />
      <Skeleton className="h-48 rounded-3xl" />
      <Skeleton className="h-48 rounded-3xl" />
      <Skeleton className="h-56 rounded-3xl" />
    </div>
  );
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 sm:py-12">
      <PageHeader
        title="오늘의 AX SCOUT"
        description="공모전 진행 상황과 활동 기록을 한눈에 확인해요."
        action={
          <div className="flex w-full gap-2 sm:w-auto">
            <Button asChild variant="tonal" size="lg" className="flex-1 sm:flex-none">
              <Link href="/activities/new">
                <Plus aria-hidden /> 활동 등록
              </Link>
            </Button>
            <Button asChild size="lg" className="flex-1 sm:flex-none">
              <Link href="/contests/new">
                <Plus aria-hidden /> 공모전 등록
              </Link>
            </Button>
          </div>
        }
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
