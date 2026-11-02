"use client";

// 저장이 끝났을 때 잠깐 보여주는 완료 알림. 3.5초 뒤 사라지고, 새로고침해도 다시 뜨지 않게 주소의 notice 값을 지운다.
import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function FlashNotice({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("notice")) {
      url.searchParams.delete("notice");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
    const timer = window.setTimeout(() => setVisible(false), 3500);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="mb-4 flex animate-in items-center gap-2 rounded-2xl bg-success-soft px-4 py-3 text-sm font-semibold text-success fade-in slide-in-from-top-2 duration-200"
    >
      <CheckCircle2 className="size-5" aria-hidden />
      {message}
    </div>
  );
}
