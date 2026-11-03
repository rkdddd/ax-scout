// 서버 동작(저장·보관 등) 맨 앞에서 로그인 여부를 한 번 더 확인한다.
// proxy.ts가 1차로 막지만, 데이터를 바꾸는 코드 가까이에서도 확인해 둔다.
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export async function requireSession(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!verifySessionToken(token)) redirect("/login");
}
