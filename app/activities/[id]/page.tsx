// Design Ref: DESIGN §1.2 — /activities/[id] 활동실적 상세 (전체 정보, 수정, 보관/복구)
import { ArrowLeft, CalendarDays, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import FlashNotice from "@/components/flash-notice";
import SubmitButton from "@/components/submit-button";
import TypeBadge from "@/components/type-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getActivity, type Activity } from "@/lib/activities";
import { formatDate, formatDateTime, orEmpty } from "@/lib/format";
import { archiveActivity, restoreActivity } from "../actions";

// 상세 정보의 한 줄 (왼쪽 이름표, 오른쪽 값)
function Row({ label, children, muted }: { label: string; children: React.ReactNode; muted?: boolean }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[7rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={`break-words whitespace-pre-wrap ${muted ? "text-muted-foreground" : "font-medium"}`}>
        {children}
      </dd>
    </div>
  );
}

async function ActivityDetail({
  params,
  searchParams,
}: {
  params: PageProps<"/activities/[id]">["params"];
  searchParams: PageProps<"/activities/[id]">["searchParams"];
}) {
  const { id } = await params;
  const query = await searchParams;
  const activityId = /^\d+$/.test(id) ? Number(id) : NaN;
  if (!Number.isSafeInteger(activityId) || activityId < 1) notFound();

  let activity: Activity | null;
  try {
    activity = await getActivity(activityId);
  } catch {
    return (
      <p className="rounded-2xl bg-destructive/10 px-5 py-4 text-sm font-semibold text-destructive">
        데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
      </p>
    );
  }
  if (!activity) notFound();

  const archived = Boolean(activity.archived_at);

  return (
    <div className="flex flex-col gap-4">
      {query.notice === "updated" ? <FlashNotice message="수정 내용을 저장했어요." /> : null}

      {/* 맨 위: 이름과 유형, 날짜 */}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[26px] leading-9 font-bold tracking-[-0.03em] break-words">{activity.name}</h1>
              <p className="mt-1 flex items-center gap-1.5 text-[15px] text-muted-foreground">
                <CalendarDays className="size-4" aria-hidden />
                {formatDate(activity.date)}
              </p>
            </div>
            <TypeBadge type={activity.type} className="mt-1.5" />
          </div>

          {archived ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted px-4 py-3">
              <p className="text-sm text-secondary-foreground">
                보관한 활동이에요. 목록에서는 숨겨져 있어요.
                <span className="block text-muted-foreground">
                  {formatDateTime(activity.archived_at as string)}에 보관
                </span>
              </p>
              <form action={restoreActivity.bind(null, activity.id)}>
                <SubmitButton size="sm" pendingLabel="복구하는 중">
                  복구하기
                </SubmitButton>
              </form>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* 자세한 정보 */}
      <Card size="sm">
        <CardContent>
          <h2 className="text-[15px] font-bold">자세한 정보</h2>
          <dl className="mt-1 divide-y divide-border">
            <Row label="성과" muted={!activity.outcome}>
              {orEmpty(activity.outcome)}
            </Row>
            <Row label="내용" muted={!activity.content}>
              {orEmpty(activity.content)}
            </Row>
            <Row label="등록 일시" muted>
              {formatDateTime(activity.created_at)}
            </Row>
            <Row label="수정 일시" muted>
              {formatDateTime(activity.updated_at)}
            </Row>
          </dl>
        </CardContent>
      </Card>

      {/* 행동: 자주 쓰는 "수정"을 앞에, 보관은 덜 눈에 띄게. 삭제는 없다 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {!archived ? (
          <form action={archiveActivity.bind(null, activity.id)}>
            <SubmitButton variant="outline" size="lg" pendingLabel="보관하는 중" className="w-full sm:w-auto">
              보관하기
            </SubmitButton>
          </form>
        ) : null}
        <Button asChild variant="tonal" size="lg">
          <Link href={`/activities/${activity.id}/edit`}>
            <Pencil aria-hidden /> 수정하기
          </Link>
        </Button>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="불러오는 중">
      <Skeleton className="h-32 rounded-3xl" />
      <Skeleton className="h-56 rounded-3xl" />
    </div>
  );
}

export default function ActivityDetailPage({ params, searchParams }: PageProps<"/activities/[id]">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 sm:py-12">
      <Link
        href="/activities"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> 활동실적
      </Link>
      <Suspense fallback={<DetailSkeleton />}>
        <ActivityDetail params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
