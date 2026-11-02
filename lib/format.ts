// Design Ref: PRD §5 — 값이 없으면 "미입력"으로 보여주고 추측해서 채우지 않는다.

export const EMPTY_TEXT = "미입력";

// 비어 있거나 공백뿐이면 "미입력"을 돌려준다.
export function orEmpty(value: string | null | undefined): string {
  const text = value?.trim();
  return text ? text : EMPTY_TEXT;
}

// 날짜(YYYY-MM-DD)를 2026.12.31 모양으로 바꾼다. 없으면 "미입력".
export function formatDate(value: string | null | undefined): string {
  return value ? value.replaceAll("-", ".") : EMPTY_TEXT;
}

const dateTimeFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// 저장된 시각(UTC)을 한국 시간 2026.11.02 14:30 모양으로 바꾼다.
export function formatDateTime(iso: string): string {
  const parts = Object.fromEntries(
    dateTimeFormat.formatToParts(new Date(iso)).map((part) => [part.type, part.value]),
  );
  return `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
}
