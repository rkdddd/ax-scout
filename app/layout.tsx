import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import MainNav from "@/components/main-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AX SCOUT",
  description: "AI 기회 발굴 및 활동관리 플랫폼",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Design Ref: DESIGN §1.1 — 모든 화면 위쪽의 제목 + 메뉴 */}
        <header className="border-b border-foreground/10">
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight">
              AX SCOUT
            </Link>
            <MainNav />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
