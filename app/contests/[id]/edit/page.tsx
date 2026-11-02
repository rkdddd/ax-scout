// Design Ref: DESIGN §1.2 — 공모전 상세의 "수정". 등록 폼을 그대로 쓰되 현재 값을 미리 채운다.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
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
      <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
        데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </p>
    );
  }
  if (!contest) notFound();

  return (
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
      submitLabel="저장"
      cancelHref={`/contests/${contest.id}`}
    />
  );
}

export default function EditContestPage({ params }: PageProps<"/contests/[id]/edit">) {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
      <Link href="/contests" className="mb-4 inline-block text-sm text-foreground/70 hover:underline">
        ← 공모전 목록
      </Link>
      <h1 className="mb-6 text-2xl font-bold">공모전 수정</h1>
      <Suspense fallback={<p className="text-sm text-foreground/60">불러오는 중...</p>}>
        <EditContest params={params} />
      </Suspense>
    </main>
  );
}
