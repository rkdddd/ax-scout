// 로그인하지 않은 요청은 모두 로그인 화면으로 보낸다 (화면 + 서버 동작 모두).
// 서버 동작(Server Action)에서도 한 번 더 확인한다 → lib/session-guard.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/login") return NextResponse.next();
  if (verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  // 돌아올 곳은 주소 줄에만 남긴다 (비밀번호 등은 절대 넣지 않는다)
  if (pathname !== "/") url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  // 정적 파일(글꼴·이미지·아이콘)은 제외
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?)$).*)"],
};
