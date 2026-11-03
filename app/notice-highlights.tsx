// 대시보드 아래쪽: 새로 모은 공고 / 마감 임박 공고 / 관심 공모전. 기간 선택과 상관없이 항상 오늘 기준이다.
// 데이터가 적어도 비어 보이지 않도록, 없을 때는 다음에 할 일을 안내한다.
import { BellRing, CalendarClock, Plus, Sparkles, Star } from "lucide-react";
import Link from "next/link";
import EmptyState from "@/components/empty-state";
import NoticeOriginBadge from "@/components/notice-origin-badge";
import StageBadge from "@/components/stage-badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDday } from "@/lib/format";
import { CLOSING_NOTICE_DAYS, NEW_NOTICE_DAYS, getHighlights } from "@/lib/notice-highlights";
import type { Notice } from "@/lib/notices";

function NoticeRow({ notice, today, showDday }: { notice: Notice; today: string; showDday?: boolean }) {
  return (
    <li>
      <Link
        href="/notices"
        className="-mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-4 hover:bg-surface/60"
      >
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold">{notice.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <NoticeOriginBadge origin={notice.origin} />
            {notice.organization}
            <span>· {notice.deadline ? `마감 ${formatDate(notice.deadline)}` : "마감일 원문 확인 필요"}</span>
          </p>
        </div>
        {showDday && notice.deadline ? (
          <span className="shrink-0 text-[17px] font-bold text-primary">{formatDday(notice.deadline, today)}</span>
        ) : null}
      </Link>
    </li>
  );
}

export default async function NoticeHighlights({ today }: { today: string }) {
  let data;
  try {
    data = await getHighlights(today);
  } catch {
    return (
      <p className="rounded-2xl bg-destructive/10 px-5 py-4 text-sm font-semibold text-destructive">
        공고 요약을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
      </p>
    );
  }

  return (
    <>
      {/* 새로 모은 공고 */}
      <section className="rounded-3xl bg-card p-6" aria-labelledby="new-notices">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <div>
            <h2 id="new-notices" className="text-[17px] font-bold">
              새로 모은 공고
            </h2>
            <p className="text-sm text-muted-foreground">
              최근 {NEW_NOTICE_DAYS}일 · {data.newNoticeCount}건
            </p>
          </div>
          <Link href="/notices" className="shrink-0 text-sm font-semibold text-primary hover:underline">
            공고 전체 보기
          </Link>
        </div>
        {data.newNotices.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="최근 새로 모은 공고가 없어요"
            description="공고는 매일 아침 자동으로 모여요. 찾은 공고는 링크로 직접 등록할 수도 있어요."
            action={
              <Button asChild variant="tonal">
                <Link href="/notices/new">
                  <Plus aria-hidden /> 링크로 공고 등록
                </Link>
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {data.newNotices.map((notice) => (
              <NoticeRow key={notice.id} notice={notice} today={today} />
            ))}
          </ul>
        )}
      </section>

      {/* 마감 임박 공고 */}
      <section className="rounded-3xl bg-card p-6" aria-labelledby="closing-notices">
        <h2 id="closing-notices" className="text-[17px] font-bold">
          마감 임박 공고
        </h2>
        <p className="mb-2 text-sm text-muted-foreground">오늘부터 {CLOSING_NOTICE_DAYS}일 안에 마감</p>
        {data.closingNotices.length === 0 ? (
          <EmptyState
            icon={BellRing}
            title="곧 마감되는 공고가 없어요"
            description="마감일이 확인된 공고만 여기에 보여요. 마감일이 없는 공고는 원문에서 확인해 주세요."
          />
        ) : (
          <ul className="divide-y divide-border">
            {data.closingNotices.map((notice) => (
              <NoticeRow key={notice.id} notice={notice} today={today} showDday />
            ))}
          </ul>
        )}
      </section>

      {/* 관심 공모전 */}
      <section className="rounded-3xl bg-card p-6" aria-labelledby="interest-contests">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <div>
            <h2 id="interest-contests" className="text-[17px] font-bold">
              관심 공모전
            </h2>
            <p className="text-sm text-muted-foreground">관심 단계 · {data.interestCount}건</p>
          </div>
          <Link href="/contests?stage=관심" className="shrink-0 text-sm font-semibold text-primary hover:underline">
            전체 보기
          </Link>
        </div>
        {data.interestContests.length === 0 ? (
          <EmptyState
            icon={Star}
            title="관심 단계인 공모전이 없어요"
            description="공고에서 마음에 드는 것을 공모전으로 등록하거나, 공모전을 직접 등록해 보세요."
            action={
              <Button asChild variant="tonal">
                <Link href="/notices">공고 보러 가기</Link>
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {data.interestContests.map((contest) => (
              <li key={contest.id}>
                <Link
                  href={`/contests/${contest.id}`}
                  className="-mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-4 hover:bg-surface/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-semibold">{contest.name}</p>
                    <p className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
                      <StageBadge stage={contest.stage} />
                      <CalendarClock className="size-4 shrink-0" aria-hidden />
                      마감 {formatDate(contest.date)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
