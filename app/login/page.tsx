// 로그인 화면. 로그인하지 않은 모든 요청이 여기로 온다 (proxy.ts).
import { Suspense } from "react";
import PageHeader from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { safeNextPath } from "@/lib/session";
import LoginForm from "./login-form";

// 돌아갈 주소(next)는 주소 줄에서 읽으므로 Suspense 안에서 처리한다.
async function LoginBody({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { next } = await searchParams;
  return <LoginForm next={safeNextPath(typeof next === "string" ? next : undefined)} />;
}

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 py-12 sm:py-20">
      <PageHeader title="로그인" description="AI기획실 비밀번호를 입력해 주세요." />
      <Card>
        <CardContent>
          <Suspense fallback={<div className="h-40" aria-hidden />}>
            <LoginBody searchParams={props.searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
