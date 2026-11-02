// Design Ref: DESIGN §1.3·§2.3 — 대시보드 기간 선택(이번 주 / 이번 달 / 전체)과 날짜 범위 계산.
// 모든 날짜는 한국 날짜(YYYY-MM-DD) 기준이다. 서버 시각대와 상관없이 같은 결과가 나오게 UTC 날짜 계산만 쓴다.

export const PERIODS = ["week", "month", "all"] as const;
export type Period = (typeof PERIODS)[number];

export const PERIOD_LABELS: Record<Period, string> = {
  week: "이번 주",
  month: "이번 달",
  all: "전체",
};

export type DateRange = { from: string; to: string };

export function parsePeriod(value: string | string[] | undefined): Period | undefined {
  return PERIODS.find((period) => period === value);
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

// 기간의 처음과 끝 날짜. "전체"는 범위가 없으므로 null.
// 이번 주는 월요일부터 일요일까지다.
export function getRange(period: Period, today: string): DateRange | null {
  if (period === "all") return null;

  const base = new Date(`${today}T00:00:00Z`);
  if (period === "week") {
    const sinceMonday = (base.getUTCDay() + 6) % 7; // 월요일이면 0
    const monday = new Date(base);
    monday.setUTCDate(base.getUTCDate() - sinceMonday);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    return { from: toDateString(monday), to: toDateString(sunday) };
  }

  const first = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1));
  const last = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0));
  return { from: toDateString(first), to: toDateString(last) };
}

// 화면에 보여줄 범위 문구. 예) "2026.11.01 ~ 2026.11.30"
export function formatRange(range: DateRange) {
  return `${range.from.replaceAll("-", ".")} ~ ${range.to.replaceAll("-", ".")}`;
}
