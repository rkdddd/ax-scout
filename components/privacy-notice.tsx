// 개인정보 입력 금지 안내 (PRD §7). 공모전·활동의 모든 등록·수정 폼에 반드시 함께 보여준다.
import { Info } from "lucide-react";

export default function PrivacyNotice() {
  return (
    <div className="flex gap-3 rounded-2xl bg-accent p-4 text-sm text-accent-foreground">
      <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
      <p>
        이름·연락처·주민번호 같은 개인정보는 적지 마세요.
        <br />
        부서나 팀 단위까지만 적어 주세요.
      </p>
    </div>
  );
}
