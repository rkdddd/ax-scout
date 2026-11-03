// 데이터를 바꾼 뒤 모든 화면(대시보드·공모전·활동·공고)의 저장된 화면을 한꺼번에 새로 불러오게 한다.
// 화면마다 따로 지정하면 빠뜨리기 쉬워서(예: 대시보드 숫자가 안 바뀜) 전체를 한 번에 갱신한다.
import "server-only";
import { revalidatePath } from "next/cache";

export function refreshAllViews(): void {
  revalidatePath("/", "layout");
}
