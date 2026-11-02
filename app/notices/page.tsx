// Design Ref: DESIGN §1.5 — /notices 공고 목록
// Plan SC: PRD §5 — 공고마다 출처 기관명과 원문 링크, 마감일 없으면 "원문 확인 필요", 마감일 가까운 순,
//          마지막 자동 수집 시각과 결과, 검토로 등록, 숨기기(삭제 없음).
import {
  CalendarDays,
  CircleAlert,
  ExternalLink,
  FolderOpen,
  Inbox,
  Plus,
  SearchX,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import EmptyState from "@/components/empty-state";
import FlashNotice from "@/components/flash-notice";
import NoticeOriginBadge from "@/components/notice-origin-badge";
import PageHeader from "@/components/page-header";
import RefreshButton from "@/components/refresh-button";
import SubmitButton from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NOTICE_ORIGINS, type NoticeOrigin } from "@/lib/constants";
import { formatDate, formatDateTime, formatDday, todayInKorea } from "@/lib/format";
import { splitNotices } from "@/lib/notice-order";
import {
  findContestsBySourceUrls,
  getLatestRun,
  listNotices,
  type CollectionRun,
  type Notice,
} from "@/lib/notices";
import { hideNotice, registerNoticeAsContest, restoreNotice } from "./actions";

const FLASH_MESSAGES: Record<string, string> = {
  added: "공고를 등록했어요.",
  exists: "이미 등록된 공고예요.",
  restored: "숨겨 두었던 공고를 다시 보이게 했어요.",
};

// 화면을 읽어 오지 않고, 담당자가 직접 들어가 찾아볼 수 있게 연결만 해 두는 곳 (PRD §5)
const FIND_LINKS = [
  { group: "공모전 모음 사이트", name: "위비티", href: "https://www.wevity.com/" },
  { group: "공모전 모음 사이트", name: "씽유", href: "https://www.thinkyou.co.kr/" },
  { group: "공모전 모음 사이트", name: "캠퍼스픽", href: "https://www.campuspick.com/" },
  { group: "공모전 모음 사이트", name: "데이콘", href: "https://dacon.io/" },
  { group: "주요 주최처", name: "과학기술정보통신부", href: "https://www.msit.go.kr/" },
  { group: "주요 주최처", name: "행정안전부", href: "https://www.mois.go.kr/" },
  { group: "주요 주최처", name: "한국지능정보사회진흥원(NIA)", href: "https://www.nia.or.kr/" },
  { group: "주요 주최처", name: "공공데이터포털", href: "https://www.data.go.kr/" },
] as const;

function parseOrigin(value: string | string[] | undefined): NoticeOrigin | undefined {
  return NOTICE_ORIGINS.find((origin) => origin === value);
}

function buildHref(origin: NoticeOrigin | undefined, includeArchived: boolean) {
  const params = new URLSearchParams();
  if (origin) params.set("origin", origin);
  if (includeArchived) params.set("archived", "1");
  const query = params.toString();
  return query ? `/notices?${query}` : "/notices";
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      data-press
      aria-current={active ? "true" : undefined}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
        active ? "bg-foreground text-background" : "bg-card text-secondary-foreground hover:bg-[#e5e8eb]"
      }`}
    >
      {children}
    </Link>
  );
}

// 마지막 자동 수집이 언제였고 어땠는지 알려준다 (PRD §5). 실패한 날도 기록되어 있어야 사용자가 알 수 있다.
function RunStatus({ run }: { run: CollectionRun | null }) {
  if (!run) {
    return (
      <p className="flex items-center gap-2 rounded-2xl bg-card px-4 py-3 text-sm text-muted-foreground">
        <Inbox className="size-4 shrink-0" aria-hidden />
        자동 수집은 아직 시작 전이에요. 지금은 링크로 공고를 등록할 수 있어요.
      </p>
    );
  }
  const failed = run.status !== "성공";
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl px-4 py-3 text-sm ${
        failed ? "bg-warning-soft text-warning" : "bg-card text-muted-foreground"
      }`}
    >
      <p className="flex items-center gap-2">
        {failed ? <TriangleAlert className="size-4 shrink-0" aria-hidden /> : null}
        <span>
          마지막 자동 수집 <strong className={failed ? "" : "text-foreground"}>{formatDateTime(run.started_at)}</strong> ·{" "}
          {run.status}
          {failed ? " — 저장된 공고는 그대로 보여드려요." : ""}
        </span>
      </p>
      <RefreshButton />
    </div>
  );
}

type Registered = { id: number; archived: boolean };

function NoticeRow({
  notice,
  today,
  registered,
  closed,
}: {
  notice: Notice;
  today: string;
  registered: Registered | undefined;
  closed?: boolean;
}) {
  const hidden = Boolean(notice.archived_at);
  const safeLink = /^https?:\/\//.test(notice.source_url) ? notice.source_url : null;

  return (
    <li className={`px-5 py-5 sm:px-6 ${hidden || closed ? "bg-surface/40" : ""}`}>
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span className="font-semibold text-secondary-foreground">{notice.organization}</span>
        <NoticeOriginBadge origin={notice.origin} />
        {hidden ? (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">숨김</span>
        ) : null}
      </div>

      <p className={`mt-1.5 text-[17px] leading-snug font-semibold ${hidden || closed ? "text-muted-foreground" : ""}`}>
        {notice.title}
      </p>

      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          {notice.deadline ? (
            <>
              <span>마감 {formatDate(notice.deadline)}</span>
              <strong className={closed ? "text-muted-foreground" : "text-primary"}>
                {closed ? "마감" : formatDday(notice.deadline, today)}
              </strong>
            </>
          ) : (
            <span className="text-muted-foreground">마감일 원문 확인 필요</span>
          )}
        </span>
        <span className="text-muted-foreground">
          참가자격 {notice.eligibility ? <span className="text-foreground">{notice.eligibility}</span> : "원문 확인 필요"}
        </span>
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {safeLink ? (
          <Button asChild variant="outline" size="sm">
            <a href={safeLink} target="_blank" rel="noopener noreferrer">
              원문 보기 <ExternalLink aria-hidden />
            </a>
          </Button>
        ) : null}

        {registered ? (
          <Button asChild variant="tonal" size="sm">
            <Link href={`/contests/${registered.id}`}>{registered.archived ? "보관됨 – 복구하러 가기" : "등록됨 · 보러 가기"}</Link>
          </Button>
        ) : (
          <form action={registerNoticeAsContest.bind(null, notice.id)}>
            <SubmitButton size="sm" pendingLabel="등록하는 중">
              검토로 등록
            </SubmitButton>
          </form>
        )}

        <form action={(hidden ? restoreNotice : hideNotice).bind(null, notice.id)} className="ml-auto">
          <SubmitButton variant="ghost" size="sm" pendingLabel={hidden ? "되살리는 중" : "숨기는 중"}>
            {hidden ? "되살리기" : "숨기기"}
          </SubmitButton>
        </form>
      </div>
    </li>
  );
}

async function NoticeList({ searchParams }: { searchParams: PageProps<"/notices">["searchParams"] }) {
  const query = await searchParams;
  await connection(); // 오늘 날짜로 마감 전·후를 나누므로 요청 때마다 새로 계산한다
  const origin = parseOrigin(query.origin);
  const includeArchived = query.archived === "1";
  const flash = typeof query.notice === "string" ? FLASH_MESSAGES[query.notice] : undefined;
  const today = todayInKorea();

  let notices: Notice[];
  let run: CollectionRun | null;
  let registered: Map<string, Registered>;
  try {
    [notices, run] = await Promise.all([listNotices({ origin, includeArchived }), getLatestRun()]);
    registered = await findContestsBySourceUrls(notices.map((notice) => notice.source_url));
  } catch {
    return (
      <div className="rounded-3xl bg-card">
        <EmptyState
          icon={CircleAlert}
          title="공고를 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          action={
            <Button asChild variant="tonal">
              <Link href={buildHref(origin, includeArchived)}>다시 불러오기</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const { upcoming, undated, closed } = splitNotices(notices, today);
  const open = [...upcoming, ...undated];
  const nothing = open.length === 0 && closed.length === 0;
  const filtered = Boolean(origin || includeArchived);

  return (
    <>
      {flash ? <FlashNotice message={flash} /> : null}
      <div className="mb-4">
        <RunStatus run={run} />
      </div>

      <div className="no-scrollbar -mx-5 mb-4 flex items-center gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0">
        <Chip href={buildHref(undefined, includeArchived)} active={!origin}>
          전체
        </Chip>
        {NOTICE_ORIGINS.map((item) => (
          <Chip key={item} href={buildHref(item, includeArchived)} active={origin === item}>
            {item === "검색 알림" ? "후보 (검색 알림)" : item}
          </Chip>
        ))}
        <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />
        <Chip href={buildHref(origin, !includeArchived)} active={includeArchived}>
          숨긴 공고 포함
        </Chip>
      </div>

      {nothing ? (
        <div className="rounded-3xl bg-card">
          {filtered ? (
            <EmptyState
              icon={SearchX}
              title="조건에 맞는 공고가 없어요"
              description="필터를 바꾸거나 전체 보기로 돌아가 보세요."
              action={
                <Button asChild variant="secondary">
                  <Link href="/notices">전체 보기</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={FolderOpen}
              title="수집된 공고가 없습니다"
              description="찾은 공고의 주소를 붙여넣어 등록하거나, 아래 '공고 찾아보기'에서 둘러보세요."
              action={
                <Button asChild>
                  <Link href="/notices/new">
                    <Plus aria-hidden /> 링크로 공고 등록
                  </Link>
                </Button>
              }
            />
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {open.length > 0 ? (
            <ul className="divide-y divide-border overflow-hidden rounded-3xl bg-card">
              {open.map((notice) => (
                <NoticeRow key={notice.id} notice={notice} today={today} registered={registered.get(notice.source_url)} />
              ))}
            </ul>
          ) : null}

          {closed.length > 0 ? (
            <details className="group overflow-hidden rounded-3xl bg-card">
              <summary className="cursor-pointer list-none px-5 py-4 text-[15px] font-semibold text-secondary-foreground hover:bg-surface/60 sm:px-6">
                마감된 공고 {closed.length}건 보기
              </summary>
              <ul className="divide-y divide-border border-t border-border">
                {closed.map((notice) => (
                  <NoticeRow
                    key={notice.id}
                    notice={notice}
                    today={today}
                    registered={registered.get(notice.source_url)}
                    closed
                  />
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      )}
    </>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="불러오는 중">
      <Skeleton className="h-12 rounded-2xl" />
      <div className="overflow-hidden rounded-3xl bg-card">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-3 border-b border-border px-6 py-5 last:border-0">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

// 공고 찾아보기: 화면을 읽어 오지 않고, 새 창으로 열어 담당자가 직접 찾게 한다.
function FindMore() {
  const groups = [...new Set(FIND_LINKS.map((link) => link.group))];
  return (
    <section className="mt-8 rounded-3xl bg-card p-6" aria-labelledby="find-more">
      <h2 id="find-more" className="text-[17px] font-bold">
        공고 찾아보기
      </h2>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">
        새 창에서 열려요. 마음에 드는 공고를 찾으면 위의 &lsquo;링크로 공고 등록&rsquo;으로 가져오세요.
      </p>
      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group}>
            <p className="mb-2 text-sm font-semibold text-secondary-foreground">{group}</p>
            <ul className="flex flex-wrap gap-2">
              {FIND_LINKS.filter((link) => link.group === group).map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-press
                    className="inline-flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-sm font-semibold hover:bg-[#e5e8eb]"
                  >
                    {link.name} <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function NoticesPage({ searchParams }: PageProps<"/notices">) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 sm:py-12">
      <PageHeader
        title="공고"
        description="공공기관이 참가할 만한 AI 공모전 공고를 한곳에서 확인해요."
        action={
          <Button asChild size="lg" className="max-sm:w-full">
            <Link href="/notices/new">
              <Plus aria-hidden /> 링크로 공고 등록
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <NoticeList searchParams={searchParams} />
      </Suspense>
      <FindMore />
    </main>
  );
}
