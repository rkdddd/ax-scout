// Design Ref: DESIGN §1.5 — /notices/new 링크로 공고 등록
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import LinkForm from "../link-form";

export default function NewNoticePage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 sm:py-12">
      <Link
        href="/notices"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> 공고
      </Link>
      <PageHeader title="링크로 공고 등록" description="찾은 공모전 공고의 주소를 붙여넣어 등록해요." />
      <Card>
        <CardContent>
          <LinkForm />
        </CardContent>
      </Card>
    </main>
  );
}
