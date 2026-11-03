"use client";

// 맨 위 메뉴 줄의 로그아웃 버튼. 로그인 화면에서는 보이지 않는다.
import { LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";

export default function LogoutButton() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <form action={logout} className="shrink-0">
      <button
        type="submit"
        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[15px] font-semibold text-muted-foreground hover:bg-surface/70 hover:text-foreground"
      >
        <LogOut className="size-4" aria-hidden />
        로그아웃
      </button>
    </form>
  );
}
