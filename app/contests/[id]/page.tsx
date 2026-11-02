// Design Ref: DESIGN §1.2 — /contests/[id] 공모전 상세
// 단계 변경·수정은 PLAN 8번, 보관·복구는 9번.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CONTEST_STAGES } from "@/lib/constants";
import { getContest, type Contest } from "@/lib/contests";
import { formatDate, formatDateTime, orEmpty } from "@/lib/format";
import { archiveContest, changeContestStage, restoreContest } from "../actions";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-foreground/10 py-3 sm:grid-cols-[8rem_1fr]">
      <dt className="text-sm text-foreground/60">{label}</dt>
      <dd className="whitespace-pre-wrap break-words">{children}</dd>
    </div>
  );
}

async function ContestDetail({ params }: { params: PageProps<"/contests/[id]">["params"] }) {
  const { id } = await params;
  const contestId = /^\d+$/.test(id) ? Number(id) : NaN;
  if (!Number.isSafeInteger(contestId) || contestId < 1) notFound();

  let contest: Contest | null;
  try {
    contest = await getContest(contestId);
  } catch {
    return (
      <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
        데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </p>
    );
  }
  if (!contest) notFound();

  // 공고에서 등록한 항목의 원문 링크 (http(s) 주소만 링크로 연결한다)
  const sourceUrl = contest.source_url;
  const safeLink = sourceUrl && /^https?:\/\//.test(sourceUrl) ? sourceUrl : null;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{contest.name}</h1>
        {contest.archived_at ? (
          <span className="rounded bg-foreground/10 px-2 py-0.5 text-sm">
            보관됨 ({formatDateTime(contest.archived_at)})
          </span>
        ) : null}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* 단계 버튼: 누르면 단계만 바뀌고 이 화면에 머문다 (현재 단계는 눌러도 변화 없음) */}
        <form action={changeContestStage.bind(null, contest.id)} className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-foreground/60">단계 변경</span>
          {CONTEST_STAGES.map((stage) => (
            <button
              key={stage}
              type="submit"
              name="stage"
              value={stage}
              disabled={contest.stage === stage}
              aria-pressed={contest.stage === stage}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                contest.stage === stage
                  ? "border-foreground bg-foreground text-background"
                  : "border-foreground/20 hover:bg-foreground/10"
              }`}
            >
              {stage}
            </button>
          ))}
        </form>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href={`/contests/${contest.id}/edit`}
            className="rounded-md border border-foreground/30 px-4 py-1.5 text-sm font-medium hover:bg-foreground/10"
          >
            수정
          </Link>
          {/* 삭제는 없다. 보관하면 목록에서 숨겨지고, 언제든 복구할 수 있다. */}
          <form
            action={
              contest.archived_at
                ? restoreContest.bind(null, contest.id)
                : archiveContest.bind(null, contest.id)
            }
          >
            <button
              type="submit"
              className="rounded-md border border-foreground/30 px-4 py-1.5 text-sm font-medium hover:bg-foreground/10"
            >
              {contest.archived_at ? "복구" : "보관"}
            </button>
          </form>
        </div>
      </div>

      <dl>
        <Row label="단계">{contest.stage}</Row>
        <Row label="결과">{orEmpty(contest.result)}</Row>
        <Row label="마감일">{formatDate(contest.date)}</Row>
        <Row label="주최 기관">{orEmpty(contest.organizer)}</Row>
        <Row label="메모">{orEmpty(contest.note)}</Row>
        {sourceUrl ? (
          <Row label="공고 원문">
            {safeLink ? (
              <a href={safeLink} target="_blank" rel="noopener noreferrer" className="underline">
                {safeLink}
              </a>
            ) : (
              sourceUrl
            )}
          </Row>
        ) : null}
        <Row label="등록 일시">{formatDateTime(contest.created_at)}</Row>
        <Row label="수정 일시">{formatDateTime(contest.updated_at)}</Row>
      </dl>
    </>
  );
}

export default function ContestDetailPage({ params }: PageProps<"/contests/[id]">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Link href="/contests" className="mb-4 inline-block text-sm text-foreground/70 hover:underline">
        ← 공모전 목록
      </Link>
      <Suspense fallback={<p className="text-sm text-foreground/60">불러오는 중...</p>}>
        <ContestDetail params={params} />
      </Suspense>
    </main>
  );
}
