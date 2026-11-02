// Design Ref: DESIGN §1.2 — /contests/[id] 공모전 상세
// 단계 변경·수정은 PLAN 8번, 보관·복구는 9번.
import { ArrowLeft, ExternalLink, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import FlashNotice from "@/components/flash-notice";
import StageBadge from "@/components/stage-badge";
import SubmitButton from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CONTEST_STAGES } from "@/lib/constants";
import { getContest, type Contest } from "@/lib/contests";
import { formatDate, formatDateTime, orEmpty } from "@/lib/format";
import { archiveContest, changeContestStage, restoreContest } from "../actions";

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

async function ContestDetail({
  params,
  searchParams,
}: {
  params: PageProps<"/contests/[id]">["params"];
  searchParams: PageProps<"/contests/[id]">["searchParams"];
}) {
  const { id } = await params;
  const query = await searchParams;
  const contestId = /^\d+$/.test(id) ? Number(id) : NaN;
  if (!Number.isSafeInteger(contestId) || contestId < 1) notFound();

  let contest: Contest | null;
  try {
    contest = await getContest(contestId);
  } catch {
    return (
      <p className="rounded-2xl bg-destructive/10 px-5 py-4 text-sm font-semibold text-destructive">
        데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
      </p>
    );
  }
  if (!contest) notFound();

  const archived = Boolean(contest.archived_at);
  // 공고에서 등록한 항목의 원문 링크 (http(s) 주소만 링크로 연결한다)
  const sourceUrl = contest.source_url;
  const safeLink = sourceUrl && /^https?:\/\//.test(sourceUrl) ? sourceUrl : null;

  return (
    <div className="flex flex-col gap-4">
      {query.notice === "updated" ? <FlashNotice message="수정 내용을 저장했어요." /> : null}

      {/* 맨 위: 이름과 현재 단계 */}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[26px] leading-9 font-bold tracking-[-0.03em] break-words">{contest.name}</h1>
              <p className="mt-1 text-[15px] text-muted-foreground">
                {contest.organizer ?? "주최 기관 미입력"}
              </p>
            </div>
            <StageBadge stage={contest.stage} className="mt-1.5" />
          </div>

          {archived ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted px-4 py-3">
              <p className="text-sm text-secondary-foreground">
                보관한 공모전이에요. 목록에서는 숨겨져 있어요.
                <span className="block text-muted-foreground">
                  {formatDateTime(contest.archived_at as string)}에 보관
                </span>
              </p>
              <form action={restoreContest.bind(null, contest.id)}>
                <SubmitButton size="sm" pendingLabel="복구하는 중">
                  복구하기
                </SubmitButton>
              </form>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* 단계 바꾸기: 누르면 바로 바뀌고 이 화면에 머문다 */}
      <Card size="sm">
        <CardContent>
          <h2 className="mb-3 text-[15px] font-bold">진행 단계</h2>
          <form
            action={changeContestStage.bind(null, contest.id)}
            className="grid grid-cols-2 gap-1 rounded-2xl bg-surface p-1 sm:grid-cols-4"
          >
            {CONTEST_STAGES.map((stage) => {
              const current = contest.stage === stage;
              return (
                <SubmitButton
                  key={stage}
                  name="stage"
                  value={stage}
                  variant="ghost"
                  disabled={current}
                  aria-pressed={current}
                  className={`h-11 rounded-xl text-[15px] disabled:opacity-100 ${
                    current ? "bg-background font-bold text-primary shadow-sm" : "font-semibold"
                  }`}
                >
                  {stage}
                </SubmitButton>
              );
            })}
          </form>
        </CardContent>
      </Card>

      {/* 자세한 정보 */}
      <Card size="sm">
        <CardContent>
          <h2 className="text-[15px] font-bold">자세한 정보</h2>
          <dl className="mt-1 divide-y divide-border">
            <Row label="결과" muted={!contest.result}>
              {orEmpty(contest.result)}
            </Row>
            <Row label="마감일" muted={!contest.date}>
              {formatDate(contest.date)}
            </Row>
            <Row label="메모" muted={!contest.note}>
              {orEmpty(contest.note)}
            </Row>
            {sourceUrl ? (
              <Row label="공고 원문">
                {safeLink ? (
                  <a
                    href={safeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    원문 보기 <ExternalLink className="size-4" aria-hidden />
                  </a>
                ) : (
                  sourceUrl
                )}
              </Row>
            ) : null}
            <Row label="등록 일시" muted>
              {formatDateTime(contest.created_at)}
            </Row>
            <Row label="수정 일시" muted>
              {formatDateTime(contest.updated_at)}
            </Row>
          </dl>
        </CardContent>
      </Card>

      {/* 행동: 자주 쓰는 "수정"을 앞에, 보관은 덜 눈에 띄게 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {!archived ? (
          <form action={archiveContest.bind(null, contest.id)}>
            <SubmitButton variant="outline" size="lg" pendingLabel="보관하는 중" className="w-full sm:w-auto">
              보관하기
            </SubmitButton>
          </form>
        ) : null}
        <Button asChild variant="tonal" size="lg">
          <Link href={`/contests/${contest.id}/edit`}>
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
      <Skeleton className="h-24 rounded-3xl" />
      <Skeleton className="h-64 rounded-3xl" />
    </div>
  );
}

export default function ContestDetailPage({ params, searchParams }: PageProps<"/contests/[id]">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 sm:py-12">
      <Link
        href="/contests"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> 공모전 목록
      </Link>
      <Suspense fallback={<DetailSkeleton />}>
        <ContestDetail params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
