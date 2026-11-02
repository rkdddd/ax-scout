// Design Ref: DESIGN §1.2 — /activities/new 활동실적 등록 화면
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createActivity } from "../actions";
import ActivityForm from "../activity-form";

export default function NewActivityPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 sm:py-12">
      <Link
        href="/activities"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> 활동실적
      </Link>
      <PageHeader title="새 활동 등록" description="사내외 AI 활동을 기록해 두세요." />
      <Card>
        <CardContent>
          <ActivityForm action={createActivity} submitLabel="등록하기" cancelHref="/activities" />
        </CardContent>
      </Card>
    </main>
  );
}
