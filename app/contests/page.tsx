// Design Ref: DESIGN §1.2·§1.4 — /contests 공모전 목록
// Plan SC: PRD §5 — 항목마다 이름·날짜·단계·결과를 표시하고, 값이 없으면 "미입력". 상세는 클릭 1번.
import { CalendarDays, FolderOpen, Plus, SearchX, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import EmptyState from "@/components/empty-state";
import FlashNotice from "@/components/flash-notice";
import PageHeader from "@/components/page-header";
import StageBadge from "@/components/stage-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CONTEST_STAGES, type ContestStage } from "@/lib/constants";
import { listContests, type Contest } from "@/lib/contests";
import { formatDate, formatDateTime, orEmpty } from "@/lib/format";
import { restoreContest } from "./actions";

function parseStage(value: string | string[] | undefined): ContestStage | undefined {
  return CONTEST_STAGES.find((stage) => stage === value);
}

// 필터 링크 주소를 만든다 (단계와 "보관 포함" 상태를 함께 유지).
function buildHref(stage: ContestStage | undefined, includeArchived: boolean) {
  const params = new URLSearchParams();
  if (stage) params.set("stage", stage);
  if (includeArchived) params.set("archived", "1");
  const query = params.toString();
  return query ? `/contests?${query}` : "/contests";
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

function ContestRow({ contest }: { contest: Contest }) {
  const archived = Boolean(contest.archived_at);
  return (
    <li className="flex items-center gap-3 px-5 py-5 transition-colors duration-150 hover:bg-surface/60 sm:px-6">
      <Link href={`/contests/${contest.id}`} className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <p className={`text-[17px] leading-snug font-semibold ${archived ? "text-muted-foreground" : ""}`}>
            {contest.name}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            {archived ? (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                보관됨
              </span>
            ) : null}
            <StageBadge stage={contest.stage} />
          </div>
        </div>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarDays className="size-4 shrink-0" aria-hidden />
          마감 {formatDate(contest.date)}
          {contest.organizer ? <span>· {contest.organizer}</span> : null}
        </p>
        <p className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
          <span>
            <span className="text-muted-foreground">결과 </span>
            <span className={contest.result ? "font-semibold" : "text-muted-foreground"}>
              {orEmpty(contest.result)}
            </span>
          </span>
          <span className="text-muted-foreground">수정 {formatDateTime(contest.updated_at)}</span>
        </p>
      </Link>
      {/* 보관된 항목에만 복구 버튼이 보인다 (DESIGN §1.4) */}
      {archived ? (
        <form action={restoreContest.bind(null, contest.id)}>
          <Button type="submit" variant="tonal" size="sm">
            복구
          </Button>
        </form>
      ) : null}
    </li>
  );
}

async function ContestList({ searchParams }: { searchParams: PageProps<"/contests">["searchParams"] }) {
  const query = await searchParams;
  const stage = parseStage(query.stage);
  const includeArchived = query.archived === "1";
  const notice =
    query.notice === "created" ? "공모전을 등록했어요." : undefined;

  let contests: Contest[];
  try {
    contests = await listContests({ stage, includeArchived });
  } catch {
    return (
      <div className="rounded-3xl bg-card">
        <EmptyState
          icon={TriangleAlert}
          title="데이터를 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          action={
            <Button asChild variant="tonal">
              <Link href={buildHref(stage, includeArchived)}>다시 불러오기</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const filtered = Boolean(stage || includeArchived);

  return (
    <>
      {notice ? <FlashNotice message={notice} /> : null}

      <div className="no-scrollbar -mx-5 mb-4 flex items-center gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0">
        <Chip href={buildHref(undefined, includeArchived)} active={!stage}>
          전체
        </Chip>
        {CONTEST_STAGES.map((item) => (
          <Chip key={item} href={buildHref(item, includeArchived)} active={stage === item}>
            {item}
          </Chip>
        ))}
        <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />
        <Chip href={buildHref(stage, !includeArchived)} active={includeArchived}>
          보관 포함
        </Chip>
      </div>

      <div className="overflow-hidden rounded-3xl bg-card">
        {contests.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={SearchX}
              title="조건에 맞는 공모전이 없어요"
              description="필터를 바꾸거나 전체 보기로 돌아가 보세요."
              action={
                <Button asChild variant="secondary">
                  <Link href="/contests">전체 보기</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={FolderOpen}
              title="아직 등록한 공모전이 없어요"
              description="참가하려는 공모전을 등록하고 진행 상황을 기록해 보세요."
              action={
                <Button asChild>
                  <Link href="/contests/new">
                    <Plus aria-hidden /> 첫 공모전 등록하기
                  </Link>
                </Button>
              }
            />
          )
        ) : (
          <ul className="divide-y divide-border">
            {contests.map((contest) => (
              <ContestRow key={contest.id} contest={contest} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

// 데이터가 오기 전에 보여주는 자리 표시
function ListSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl bg-card" aria-busy aria-label="불러오는 중">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-3 border-b border-border px-6 py-5 last:border-0">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export default function ContestsPage({ searchParams }: PageProps<"/contests">) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 sm:py-12">
      <PageHeader
        title="공모전"
        description="참가 이력과 진행 상태를 한눈에 확인해요."
        action={
          <Button asChild size="lg" className="max-sm:w-full">
            <Link href="/contests/new">
              <Plus aria-hidden /> 새 공모전
            </Link>
          </Button>
        }
      />
      {/* DB를 읽는 부분은 요청 때마다 가져오므로 Suspense로 감싼다 */}
      <Suspense fallback={<ListSkeleton />}>
        <ContestList searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
