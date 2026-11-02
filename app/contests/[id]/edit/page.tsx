// Design Ref: DESIGN §1.2 — 공모전 상세의 "수정". 등록 폼을 그대로 쓰되 현재 값을 미리 채운다.
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import PageHeader from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getContest } from "@/lib/contests";
import { updateContest } from "../../actions";
import ContestForm from "../../contest-form";

async function EditContest({ params }: { params: PageProps<"/contests/[id]/edit">["params"] }) {
  const { id } = await params;
  const contestId = /^\d+$/.test(id) ? Number(id) : NaN;
  if (!Number.isSafeInteger(contestId) || contestId < 1) notFound();

  let contest;
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

  return (
    <>
      <PageHeader title="공모전 수정" description={contest.name} />
      <Card>
        <CardContent>
          <ContestForm
            action={updateContest.bind(null, contest.id)}
            initialValues={{
              name: contest.name,
              organizer: contest.organizer ?? "",
              date: contest.date ?? "",
              stage: contest.stage,
              result: contest.result ?? "",
              note: contest.note ?? "",
            }}
            submitLabel="저장하기"
            cancelHref={`/contests/${contest.id}`}
          />
        </CardContent>
      </Card>
    </>
  );
}

export default function EditContestPage({ params }: PageProps<"/contests/[id]/edit">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 sm:py-12">
      <Link
        href="/contests"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> 공모전 목록
      </Link>
      <Suspense fallback={<Skeleton className="h-96 rounded-3xl" aria-busy aria-label="불러오는 중" />}>
        <EditContest params={params} />
      </Suspense>
    </main>
  );
}
