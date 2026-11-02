// Design Ref: DESIGN §1.2·§1.4 — /contests 공모전 목록
// Plan SC: PRD §5 — 항목마다 이름·날짜·단계·결과를 표시하고, 값이 없으면 "미입력". 상세는 클릭 1번.
import Link from "next/link";
import { Suspense } from "react";
import { CONTEST_STAGES, type ContestStage } from "@/lib/constants";
import { listContests, type Contest } from "@/lib/contests";
import { formatDate, formatDateTime, orEmpty } from "@/lib/format";

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

const pillClass = (active: boolean) =>
  `rounded-full border px-3 py-1 text-sm transition-colors ${
    active
      ? "border-foreground bg-foreground text-background"
      : "border-foreground/20 hover:bg-foreground/10"
  }`;

async function ContestList({ searchParams }: { searchParams: PageProps<"/contests">["searchParams"] }) {
  const query = await searchParams;
  const stage = parseStage(query.stage);
  const includeArchived = query.archived === "1";

  let contests: Contest[];
  try {
    contests = await listContests({ stage, includeArchived });
  } catch {
    return (
      <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
        데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </p>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href={buildHref(undefined, includeArchived)} className={pillClass(!stage)}>
          전체
        </Link>
        {CONTEST_STAGES.map((item) => (
          <Link
            key={item}
            href={buildHref(item, includeArchived)}
            className={pillClass(stage === item)}
          >
            {item}
          </Link>
        ))}
        <Link
          href={buildHref(stage, !includeArchived)}
          className={`ml-auto ${pillClass(includeArchived)}`}
          aria-pressed={includeArchived}
        >
          보관 포함
        </Link>
      </div>

      {contests.length === 0 ? (
        <p className="rounded-md bg-foreground/5 px-4 py-6 text-center text-sm">
          {stage || includeArchived
            ? "조건에 맞는 공모전이 없습니다."
            : "등록된 공모전이 없습니다. [새 공모전]으로 시작해 보세요."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-foreground/20 text-foreground/70">
              <tr>
                <th className="py-2 pr-3 font-medium">이름</th>
                <th className="py-2 pr-3 font-medium">마감일</th>
                <th className="py-2 pr-3 font-medium">단계</th>
                <th className="py-2 pr-3 font-medium">결과</th>
                <th className="py-2 font-medium">수정 일시</th>
              </tr>
            </thead>
            <tbody>
              {contests.map((contest) => (
                <tr
                  key={contest.id}
                  className={`border-b border-foreground/10 ${contest.archived_at ? "opacity-50" : ""}`}
                >
                  <td className="py-3 pr-3">
                    <Link href={`/contests/${contest.id}`} className="font-medium underline-offset-2 hover:underline">
                      {contest.name}
                    </Link>
                    {contest.archived_at ? (
                      <span className="ml-2 rounded bg-foreground/10 px-1.5 py-0.5 text-xs">보관됨</span>
                    ) : null}
                  </td>
                  <td className="py-3 pr-3">{formatDate(contest.date)}</td>
                  <td className="py-3 pr-3">{contest.stage}</td>
                  <td className="py-3 pr-3">{orEmpty(contest.result)}</td>
                  <td className="py-3">{formatDateTime(contest.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function ContestsPage({ searchParams }: PageProps<"/contests">) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">공모전</h1>
        <Link
          href="/contests/new"
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          새 공모전
        </Link>
      </div>
      {/* DB를 읽는 부분은 요청 때마다 가져오므로 Suspense로 감싼다 */}
      <Suspense fallback={<p className="text-sm text-foreground/60">불러오는 중...</p>}>
        <ContestList searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
