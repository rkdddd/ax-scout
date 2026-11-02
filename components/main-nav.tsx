"use client";

// Design Ref: DESIGN §1.1 — 모든 화면 위쪽의 메뉴. 현재 보고 있는 메뉴를 강조한다.
// 현재 주소를 읽으려면 클라이언트 컴포넌트가 필요해서 레이아웃과 분리했다.
import Link from "next/link";
import { usePathname } from "next/navigation";

const MENUS = [
  { href: "/", label: "대시보드" },
  { href: "/contests", label: "공모전" },
  { href: "/activities", label: "활동실적" },
  { href: "/notices", label: "공고" },
] as const;

export default function MainNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="주 메뉴">
      <ul className="flex items-center gap-1">
        {MENUS.map(({ href, label }) => {
          // 대시보드(/)는 정확히 같을 때만, 나머지는 하위 주소(/contests/1 등)도 포함한다.
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-foreground font-semibold text-background"
                    : "text-foreground/70 hover:bg-foreground/10 hover:text-foreground"
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
