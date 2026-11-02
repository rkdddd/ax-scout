import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import { Suspense } from "react";
import MainNav from "@/components/main-nav";
import "./globals.css";

// Pretendard (가변 글꼴). 프로젝트에 설치된 파일을 그대로 쓰므로 외부 서버가 필요 없다.
const pretendard = localFont({
  src: "../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-sans",
  display: "swap",
  weight: "45 920",
});

export const metadata: Metadata = {
  title: "AX SCOUT",
  description: "AI 기회 발굴 및 활동관리 플랫폼",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        {/* Design Ref: DESIGN §1.1 — 모든 화면 위쪽의 제목 + 메뉴 */}
        <header className="sticky top-0 z-20 bg-background/85 backdrop-blur">
          {/* 좁은 화면에서는 로고 아래 줄에 메뉴 4개를 모두 펼쳐 보여준다 */}
          <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-2 sm:h-14 sm:py-0">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 text-[17px] font-extrabold tracking-[-0.03em]"
            >
              <span className="size-2.5 rounded-full bg-primary" aria-hidden />
              AX SCOUT
            </Link>
            {/* 주소가 바뀌는 화면(/contests/[id] 등)에서 현재 주소를 읽으려면 Suspense가 필요하다 */}
            <Suspense fallback={<div className="h-9" aria-hidden />}>
              <MainNav />
            </Suspense>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
