// Design Ref: DESIGN §1.2 — /contests/new 공모전 등록 화면
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/page-header";
import { createContest } from "../actions";
import ContestForm from "../contest-form";

export default function NewContestPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 sm:py-12">
      <PageHeader title="새 공모전 등록" description="참가하려는 공모전을 기록해 두세요." />
      <Card>
        <CardContent>
          <ContestForm action={createContest} submitLabel="등록하기" cancelHref="/contests" />
        </CardContent>
      </Card>
    </main>
  );
}
