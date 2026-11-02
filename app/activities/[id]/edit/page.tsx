// Design Ref: DESIGN §1.2 — 활동실적 상세의 "수정". 등록 폼을 그대로 쓰되 현재 값을 미리 채운다.
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import PageHeader from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getActivity } from "@/lib/activities";
import { updateActivity } from "../../actions";
import ActivityForm from "../../activity-form";

async function EditActivity({ params }: { params: PageProps<"/activities/[id]/edit">["params"] }) {
  const { id } = await params;
  const activityId = /^\d+$/.test(id) ? Number(id) : NaN;
  if (!Number.isSafeInteger(activityId) || activityId < 1) notFound();

  let activity;
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

  return (
    <>
      <PageHeader title="활동 수정" description={activity.name} />
      <Card>
        <CardContent>
          <ActivityForm
            action={updateActivity.bind(null, activity.id)}
            initialValues={{
              name: activity.name,
              date: activity.date,
              type: activity.type,
              content: activity.content ?? "",
              outcome: activity.outcome ?? "",
            }}
            submitLabel="저장하기"
            cancelHref={`/activities/${activity.id}`}
          />
        </CardContent>
      </Card>
    </>
  );
}

export default function EditActivityPage({ params }: PageProps<"/activities/[id]/edit">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 sm:py-12">
      <Link
        href="/activities"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> 활동실적
      </Link>
      <Suspense fallback={<Skeleton className="h-96 rounded-3xl" aria-busy aria-label="불러오는 중" />}>
        <EditActivity params={params} />
      </Suspense>
    </main>
  );
}
