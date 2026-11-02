-- AX SCOUT 테이블 정의 (DESIGN §3)
-- 여러 번 실행해도 안전하도록 작성했다 (이미 있으면 건너뜀).
-- 테이블: 공모전(contests), 활동실적(activities), 수집된 공고(notices), 수집 기록(collection_runs)

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
-- 수집된 공고 (DESIGN §3.2-1)
-- 링크로 등록한 공고, 기관 RSS, 검색 알림에서 모은 공고가 모두 여기에 저장된다.
-- ─────────────────────────────────────────────
create table if not exists public.notices (
  id           bigint generated always as identity primary key,
  source_url   text        not null check (length(btrim(source_url)) > 0),   -- 정규화한 원문 링크 (같은 공고 판별 기준)
  organization text        not null check (length(btrim(organization)) > 0), -- 출처 기관명 (모르면 사이트 주소로 채운다)
  title        text        not null check (length(btrim(title)) > 0),
  deadline     date,                                   -- 없으면 비움 → 화면에서 "원문 확인 필요"
  eligibility  text,                                   -- 없으면 비움 → 화면에서 "원문 확인 필요"
  origin       text        not null
               check (origin in ('직접 등록', '기관 RSS', '검색 알림')),
  source_name  text,                                   -- 예) 과기정통부 사업공고, Google 알림
  collected_at timestamptz not null default now(),     -- 마지막으로 확인(수집)한 시각
  created_at   timestamptz not null default now(),
  archived_at  timestamptz                             -- 숨긴 시각 (지우지 않고 숨기기만 한다)
);

-- 같은 공고가 두 번 저장되지 않게 한다
create unique index if not exists notices_source_url_key on public.notices (source_url);
create index if not exists notices_deadline_idx on public.notices (deadline);
create index if not exists notices_origin_idx on public.notices (origin);
create index if not exists notices_archived_idx on public.notices (archived_at);

-- ─────────────────────────────────────────────
-- 수집 기록 (DESIGN §3.2-2): 자동 수집이 돌 때마다 한 줄. 화면의 "마지막 수집 시각과 결과"가 이걸 쓴다.
-- ─────────────────────────────────────────────
create table if not exists public.collection_runs (
  id            bigint generated always as identity primary key,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  status        text        not null check (status in ('성공', '일부 실패', '실패')),
  source_counts jsonb       not null default '{}'::jsonb,  -- 원천별 읽은 건수·저장 건수
  error_summary text                                        -- 오류 요약 (키·주소의 인증 정보는 쓰지 않는다)
);

create index if not exists collection_runs_started_idx on public.collection_runs (started_at desc);

-- ─────────────────────────────────────────────
-- 보안 (DESIGN §4.2): 행 수준 보안(RLS)을 켜고 공개 정책은 만들지 않는다.
-- 서버 키(service_role / secret)로만 읽고 쓴다. 브라우저용 키(anon)는 접근할 수 없다.
-- ─────────────────────────────────────────────
alter table public.contests   enable row level security;
alter table public.activities enable row level security;
alter table public.notices         enable row level security;
alter table public.collection_runs enable row level security;

revoke all on table public.contests        from anon, authenticated;
revoke all on table public.activities      from anon, authenticated;
revoke all on table public.notices         from anon, authenticated;
revoke all on table public.collection_runs from anon, authenticated;
