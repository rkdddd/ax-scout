// Design Ref: DESIGN §1.4 — 없는 번호로 접속했을 때의 안내 화면
import Link from "next/link";

export default function ContestNotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 text-center">
      <h1 className="mb-2 text-xl font-bold">찾을 수 없는 항목입니다</h1>
      <p className="mb-6 text-sm text-foreground/70">
        주소가 잘못되었거나 없는 공모전입니다.
      </p>
      <Link href="/contests" className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">
        공모전 목록으로
      </Link>
    </main>
  );
}
