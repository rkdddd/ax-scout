-- AX SCOUT 테이블 정의 (DESIGN §3)
-- 여러 번 실행해도 안전하도록 작성했다 (이미 있으면 건너뜀).
-- 이번 파일: 공모전(contests), 활동실적(activities)
-- 다음 단계(PLAN 14번)에서 공고(notices), 수집 기록(collection_runs)을 이 파일에 추가한다.

-- ─────────────────────────────────────────────
-- 공통: 수정 일시 자동 기록 (DESIGN §3.1 — updated_at은 DB 트리거가 갱신)
-- ─────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────
-- 공모전 참가현황 (DESIGN §3.1)
-- 단계 값은 lib/constants.ts 의 CONTEST_STAGES 와 같아야 한다.
-- ─────────────────────────────────────────────
create table if not exists public.contests (
  id          bigint generated always as identity primary key,
  name        text        not null check (length(btrim(name)) > 0),
  organizer   text,
  date        date,                                   -- 마감일(참가 신청 기준일), 비면 "미입력"
  stage       text        not null default '관심'
              check (stage in ('관심', '검토', '참가 진행', '완료')),
  result      text,                                   -- 결과(수상 여부 등), 비면 "미입력"
  note        text,
  source_url  text        check (source_url is null or length(btrim(source_url)) > 0),
  archived_at timestamptz,                            -- 비어 있으면 보관 안 됨 (완전 삭제는 하지 않는다)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 같은 공고 링크로 공모전이 두 번 만들어지지 않게 한다 (빈 값은 여러 개 허용)
create unique index if not exists contests_source_url_key
  on public.contests (source_url) where source_url is not null;
create index if not exists contests_stage_idx on public.contests (stage);
create index if not exists contests_date_idx on public.contests (date);
create index if not exists contests_archived_idx on public.contests (archived_at);

drop trigger if exists contests_set_updated_at on public.contests;
create trigger contests_set_updated_at
  before update on public.contests
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- AI 활동실적 (DESIGN §3.2)
-- 유형 값은 lib/constants.ts 의 ACTIVITY_TYPES 와 같아야 한다.
-- ─────────────────────────────────────────────
create table if not exists public.activities (
  id          bigint generated always as identity primary key,
  name        text        not null check (length(btrim(name)) > 0),
  date        date        not null,                   -- 활동 날짜
  type        text        not null
              check (type in ('AI 사업', '교육', '거버넌스', '대외활동')),
  content     text,
  outcome     text,                                   -- 성과, 비면 "미입력"
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists activities_type_idx on public.activities (type);
create index if not exists activities_date_idx on public.activities (date);
create index if not exists activities_archived_idx on public.activities (archived_at);

drop trigger if exists activities_set_updated_at on public.activities;
create trigger activities_set_updated_at
  before update on public.activities
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- 보안 (DESIGN §4.2): 행 수준 보안(RLS)을 켜고 공개 정책은 만들지 않는다.
-- 서버 키(service_role / secret)로만 읽고 쓴다. 브라우저용 키(anon)는 접근할 수 없다.
-- ─────────────────────────────────────────────
alter table public.contests   enable row level security;
alter table public.activities enable row level security;

revoke all on table public.contests   from anon, authenticated;
revoke all on table public.activities from anon, authenticated;
