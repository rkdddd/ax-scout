"use server";

// 로그인·로그아웃. 비밀번호는 서버에서만 확인하고, 틀려도 어디가 틀렸는지는 알려주지 않는다.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_DAYS, createSessionToken, passwordMatches, safeNextPath } from "@/lib/session";

export type LoginState = { status: "idle" | "error"; message?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? ""));

  if (!process.env.APP_PASSWORD || !process.env.SESSION_SECRET) {
    return { status: "error", message: "로그인 설정이 아직 끝나지 않았어요. 관리자에게 알려 주세요." };
  }

  if (!password || !passwordMatches(password)) {
    // 비밀번호를 연달아 넣어 보는 시도를 조금 늦춘다
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { status: "error", message: "비밀번호가 맞지 않아요." };
  }

  const token = createSessionToken();
  if (!token) return { status: "error", message: "로그인 설정이 아직 끝나지 않았어요. 관리자에게 알려 주세요." };

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  redirect(next);
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
