// Design Ref: DESIGN §1.2·§1.4 — /activities 활동실적 목록 (날짜순 타임라인 + 유형별 필터)
// Plan SC: PRD §5 — 항목마다 이름·날짜·유형·결과(성과)를 표시하고, 값이 없으면 "미입력".
import { FolderOpen, Plus, SearchX, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import EmptyState from "@/components/empty-state";
import FlashNotice from "@/components/flash-notice";
import PageHeader from "@/components/page-header";
import TypeBadge, { TYPE_DOT_COLORS } from "@/components/type-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listActivities, type Activity } from "@/lib/activities";
import { ACTIVITY_TYPES, type ActivityType } from "@/lib/constants";
import { formatDateTime, orEmpty, todayInKorea } from "@/lib/format";
import { PERIOD_LABELS, formatRange, getRange, parsePeriod, type DateRange, type Period } from "@/lib/period";
import { restoreActivity } from "./actions";

function parseType(value: string | string[] | undefined): ActivityType | undefined {
  return ACTIVITY_TYPES.find((type) => type === value);
}

// 필터 링크 주소를 만든다 (유형, "보관 포함", 기간 상태를 함께 유지).
function buildHref(type: ActivityType | undefined, includeArchived: boolean, period?: Period) {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (includeArchived) params.set("archived", "1");
  if (period) params.set("period", period);
  const query = params.toString();
  return query ? `/activities?${query}` : "/activities";
}

// 필터 칩. 선택된 것은 진한 바탕으로 보여준다.
function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      data-press
      aria-current={active ? "true" : undefined}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
        active
          ? "bg-foreground text-background"
          : "bg-card text-secondary-foreground hover:bg-[#e5e8eb]"
      }`}
    >
      {children}
    </Link>
  );
}

// 활동 날짜(YYYY-MM-DD)의 월별로 묶는다. 목록이 이미 날짜 내림차순이라 순서는 그대로 유지된다.
function groupByMonth(activities: Activity[]) {
  const groups: { month: string; items: Activity[] }[] = [];
  for (const activity of activities) {
    const month = activity.date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.items.push(activity);
    else groups.push({ month, items: [activity] });
  }
  return groups;
}

function monthLabel(month: string) {
  const [year, mm] = month.split("-");
  return `${year}년 ${Number(mm)}월`;
}

function TimelineItem({ activity }: { activity: Activity }) {
  const archived = Boolean(activity.archived_at);
  return (
    <li className="relative pb-5 pl-6 last:pb-0">
      {/* 타임라인 점 */}
      <span
        aria-hidden
        className={`absolute top-2 -left-[5px] size-2.5 rounded-full ring-4 ring-card ${TYPE_DOT_COLORS[activity.type]} ${archived ? "opacity-40" : ""}`}
      />
      <div className="flex items-start gap-3">
        <Link
          href={`/activities/${activity.id}`}
          className="-mt-1 -ml-2 flex min-w-0 flex-1 flex-col gap-1.5 rounded-2xl px-2 py-1 transition-colors duration-150 hover:bg-surface/70"
        >
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-semibold">{activity.date.slice(5).replace("-", ".")}</span>
            <TypeBadge type={activity.type} />
            {archived ? (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                보관됨
              </span>
            ) : null}
          </p>
          <p className={`text-[17px] leading-snug font-semibold ${archived ? "text-muted-foreground" : ""}`}>
            {activity.name}
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
            <span>
              <span className="text-muted-foreground">성과 </span>
              <span className={activity.outcome ? "font-semibold" : "text-muted-foreground"}>
                {orEmpty(activity.outcome)}
              </span>
            </span>
            <span className="text-muted-foreground">수정 {formatDateTime(activity.updated_at)}</span>
          </p>
        </Link>
        {/* 보관된 항목에만 복구 버튼이 보인다 (DESIGN §1.4) */}
        {archived ? (
          <form action={restoreActivity.bind(null, activity.id)}>
            <Button type="submit" variant="tonal" size="sm">
              복구
            </Button>
          </form>
        ) : null}
      </div>
    </li>
  );
}

async function ActivityList({ searchParams }: { searchParams: PageProps<"/activities">["searchParams"] }) {
  const query = await searchParams;
  const type = parseType(query.type);
  const includeArchived = query.archived === "1";
  const notice = query.notice === "created" ? "활동을 등록했어요." : undefined;
  // 대시보드에서 넘어온 기간(이번 주/이번 달). 활동 날짜가 그 기간 안인 활동만 보여준다.
  const parsedPeriod = parsePeriod(query.period);
  const period = parsedPeriod === "week" || parsedPeriod === "month" ? parsedPeriod : undefined;
  let range: DateRange | null = null;
  if (period) {
    await connection(); // 오늘 날짜를 쓰므로 요청 때마다 새로 계산한다
    range = getRange(period, todayInKorea());
  }

  let activities: Activity[];
  try {
    activities = await listActivities({ type, includeArchived, range });
  } catch {
    return (
      <div className="rounded-3xl bg-card">
        <EmptyState
          icon={TriangleAlert}
          title="데이터를 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          action={
            <Button asChild variant="tonal">
              <Link href={buildHref(type, includeArchived, period)}>다시 불러오기</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const filtered = Boolean(type || includeArchived || period);
  const groups = groupByMonth(activities);

  return (
    <>
      {notice ? <FlashNotice message={notice} /> : null}

      {range && period ? (
        <p className="mb-3 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{PERIOD_LABELS[period]}</span>
          활동 날짜 {formatRange(range)} 기준
          <Link href={buildHref(type, includeArchived)} className="font-semibold text-primary hover:underline">
            기간 해제
          </Link>
        </p>
      ) : null}

      <div className="no-scrollbar -mx-5 mb-4 flex items-center gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0">
        <Chip href={buildHref(undefined, includeArchived, period)} active={!type}>
          전체
        </Chip>
        {ACTIVITY_TYPES.map((item) => (
          <Chip key={item} href={buildHref(item, includeArchived, period)} active={type === item}>
            {item}
          </Chip>
        ))}
        <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />
        <Chip href={buildHref(type, !includeArchived, period)} active={includeArchived}>
          보관 포함
        </Chip>
      </div>

      {activities.length === 0 ? (
        <div className="rounded-3xl bg-card">
          {filtered ? (
            <EmptyState
              icon={SearchX}
              title="조건에 맞는 활동이 없어요"
              description="필터를 바꾸거나 전체 보기로 돌아가 보세요."
              action={
                <Button asChild variant="secondary">
                  <Link href="/activities">전체 보기</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={FolderOpen}
              title="아직 기록한 활동이 없어요"
              description="AI 사업·교육·거버넌스·대외활동을 기록해 보세요."
              action={
                <Button asChild>
                  <Link href="/activities/new">
                    <Plus aria-hidden /> 첫 활동 기록하기
                  </Link>
                </Button>
              }
            />
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <section key={group.month} className="rounded-3xl bg-card p-6" aria-label={monthLabel(group.month)}>
              <h2 className="mb-4 text-[15px] font-bold">{monthLabel(group.month)}</h2>
              <ol className="ml-1 border-l border-border">
                {group.items.map((activity) => (
                  <TimelineItem key={activity.id} activity={activity} />
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

// 데이터가 오기 전에 보여주는 자리 표시
function ListSkeleton() {
  return (
    <div className="rounded-3xl bg-card p-6" aria-busy aria-label="불러오는 중">
      <Skeleton className="mb-5 h-5 w-24" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="mb-5 flex flex-col gap-2 last:mb-0">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export default function ActivitiesPage({ searchParams }: PageProps<"/activities">) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 sm:py-12">
      <PageHeader
        title="활동실적"
        description="AI 사업·교육·거버넌스·대외활동을 날짜순으로 기록해요."
        action={
          <Button asChild size="lg" className="max-sm:w-full">
            <Link href="/activities/new">
              <Plus aria-hidden /> 새 활동
            </Link>
          </Button>
        }
      />
      {/* DB를 읽는 부분은 요청 때마다 가져오므로 Suspense로 감싼다 */}
      <Suspense fallback={<ListSkeleton />}>
        <ActivityList searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
