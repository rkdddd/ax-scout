# AX SCOUT

**AI 기회 발굴 및 활동관리 플랫폼** — 흩어져 있는 AI 공모전 참가현황과 AI 활동실적을 한 화면에서 관리하고, 새 공모전 공고를 자동으로 모아 보여주는 웹 앱입니다.

## 해결하려는 문제

- 공모전 참가 여부와 결과, AI 관련 활동 실적이 엑셀·메신저에 흩어져 있어 주간 보고용으로 취합하는 데 시간이 많이 든다.
- 새 AI 공모전 공고를 사람이 매번 찾아다녀야 해서 마감을 놓치기 쉽다.

## 주요 기능

### 1. 참가현황·활동실적 통합관리 대시보드
- 공모전(관심 → 검토 → 참가 진행 → 완료)과 AI 활동(AI 사업·교육·거버넌스·대외활동)을 한 곳에 등록·수정.
- 기간(이번 주·이번 달 등)을 고르면 단계별·유형별 숫자와 마감 임박·최근 수정 항목을 한눈에 확인.
- 지우지 않고 **보관**하며, 언제든 복구할 수 있다. 값이 없으면 "미입력"으로 표시.

### 2. 공모전 공고 수집
- 공고 링크를 붙여넣어 등록 (원문 링크 기준으로 중복 방지).
- 과학기술정보통신부 공식 RSS를 매일 오전 6시(KST)에 GitHub Actions로 자동 수집하고, 제목의 키워드 규칙으로 "AI 공모전"만 분류.
- (선택) Google 알림 RSS 주소를 환경변수로 넣으면 검색 알림 후보도 수집.
- 약관이 자동 수집을 제한하는 사이트(위비티·씽유 등)의 화면은 읽지 않는다.

## 기술 스택

| 구분 | 사용 기술 |
|---|---|
| 프레임워크 | Next.js 16 (App Router), React 19, TypeScript |
| 화면 | Tailwind CSS 4, shadcn/ui, Pretendard, lucide-react |
| 데이터베이스 | Supabase (PostgreSQL, 행 수준 보안 켬 — 서버 키로만 접근) |
| 검증 | Zod 4 |
| 자동 수집 | GitHub Actions + `rss-parser` + `tsx` |
| 배포 | Vercel |

## 폴더 구조

```
app/          화면과 서버 동작 (대시보드, 공모전, 활동, 공고)
components/   공통 화면 부품
lib/          DB 읽기·쓰기, 입력 검증, 기간 계산, 안전한 링크 읽기
scripts/      공고 자동 수집 스크립트
supabase/     테이블 정의 (schema.sql)
docs/         디자인 시스템, 최종 점검 결과
PRD.md        제품 요구사항
PLAN.md       구현 계획과 진행 상황
DESIGN.md     설계 문서
```

## 직접 실행해 보기

1. 의존성 설치

   ```bash
   npm install
   ```

2. Supabase 프로젝트를 만들고 `supabase/schema.sql`을 SQL 편집기에서 실행.

3. 프로젝트 루트에 `.env` 파일을 만들고 값을 채우기 (이 파일은 git에 올라가지 않는다).

   ```
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   # 선택: 쉼표로 구분한 Google 알림 RSS 주소
   GOOGLE_ALERT_RSS_URLS=
   ```

4. 개발 서버 실행

   ```bash
   npm run dev
   ```

5. (선택) 공고 수집을 내 컴퓨터에서 한 번 돌려 보기

   ```bash
   npm run collect:local
   ```

## 보안과 주의사항

- 서버 키(`SUPABASE_SERVICE_ROLE_KEY`)는 서버 코드에서만 읽으며, 브라우저로 내려가는 `NEXT_PUBLIC_` 변수는 없다. 비밀 값은 저장소에 올리지 않는다.
- 링크로 공고를 등록할 때 내부·사설 주소로의 접근을 막는다 (SSRF 방어).
- **로그인 기능이 없다.** 배포 주소를 아는 사람은 누구나 보고 바꿀 수 있으므로 실제 개인정보는 넣지 말고 연습용(가짜) 데이터만 사용한다.
- 개인정보(이름·연락처 등)를 저장하는 열은 만들지 않았고, 입력 화면마다 안내 문구를 둔다.

## 문서

- [PRD.md](PRD.md) — 무엇을 왜 만드는가
- [PLAN.md](PLAN.md) — 작업 계획과 진행 상황
- [DESIGN.md](DESIGN.md) — 설계
- [docs/final-check.md](docs/final-check.md) — 최종 점검 결과
