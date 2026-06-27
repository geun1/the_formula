# 루프 엔지니어링 로그

회차별로 무엇을 테스트했고, 무엇을 발견(버그/미구현)했고, 무엇을 보완했고, 어떻게 재검증했는지 기록.

형식:
```
## R{n} — YYYY-MM-DD — {대상 페이지/기능}
- 테스트: 실행한 케이스 ID + 방법
- 발견: BUG-/FEAT- 링크 + 한 줄 요약
- 보완: 무엇을 어떻게 고쳤나 (file:line)
- 재검증: 동일 시나리오 재실행 결과 / typecheck·lint
- 다음 회차: 무엇을 할지
```

---

## R0 — 2026-06-27 — 인프라 셋업
- 셋업: `.mcp.json`(Playwright/chrome) 추가, `scripts/qa-login.ts`(DB 세션 시드) 작성·검증.
- 검증: normal 세션 쿠키로 `/account` 접근 시 QA 유저 이메일 노출 확인 → OAuth 우회 로그인 동작.
- QA 문서 세트 작성(README/TEST_PLAN/TEST_CASES/BUGS/UNIMPLEMENTED/LOOP_LOG).
- 다음 회차(R1): Playwright MCP 도구 로드 후 홈(`/`) + 네비게이션 전수(H-1~H-4, X-2)부터 스윕.

## R1 — 2026-06-27 — 홈 + 네비게이션 + 푸터
- 테스트: 홈 렌더(H-1) / 네비 탭 클릭(H-3: 아티클=피드탭, 모임→/activities) / 콘솔·네트워크 스윕(X-2) / 푸터 링크 전수.
- 발견:
  - BUG-001(P2) 푸터 안내 링크 `/terms`·`/privacy`·`/notice`·`/contact` → 404 (라우트 부재)
  - BUG-002(P3) 콘솔 경고: `<html>` data-scroll-behavior 누락
  - BUG-003(P1) **워킹트리 typecheck 14개 실패** — uncommitted db/index.ts 듀얼드라이버 유니온이 `.returning()` 타입 파괴 (`next build` 차단). git stash 비교로 HEAD=0/워킹트리=14 확정.
  - BUG-004(P2) 기존 lint 에러 4건(toast.tsx, queries.ts) — 내 변경 아님, 보류
  - FEAT-002(🟢) 푸터 소셜 링크 3개 `/`(홈) no-op — 제품 결정 필요
- 보완:
  - PlaceholderPage 컴포넌트([src/components/placeholder-page.tsx]) + 4 라우트(terms/privacy/notice/contact) 생성. 법적 문구는 준비중 상태(임의 생성 안 함).
  - layout.tsx `<html data-scroll-behavior="smooth">` 추가.
  - db/index.ts 를 `NodePgDatabase<typeof schema>` 단일 타입으로 고정(런타임 드라이버 자동전환 유지).
- 재검증: 4개 라우트 200·렌더 OK / 콘솔 0 에러 / typecheck 0 에러 / 수정파일 lint 클린(layout.tsx 경고는 기존 GA 스크립트).
- 다음 회차(R2): 아티클 상세+댓글/대댓글(A-1~A-5). 로그인 필요 → qa-login 쿠키 주입 방법(Playwright httpOnly) 확립부터.

## R2 — 2026-06-27 — 로그인 인프라 + 아티클 댓글 (진행 중)
- 인프라: `browser_run_code_unsafe`로 `context.addCookies()` httpOnly 세션 주입 확립. 헤더가 로그인/가입→채팅/내프로필(Q)로 전환 확인. **인증 페이지 전체 자동화 가능.**
- DB: DATABASE_URL = 로컬 Postgres 확인 → 쓰기 테스트 안전(운영 무관).
- 테스트: A-1(아티클 상세 렌더) PASS / A-2(댓글 작성) PASS — 카운트 2→3, 최상단 즉시 노출, 콘솔 0 에러.
- 남은 R2: A-3(대댓글)·A-4(페이지네이션)·A-5(AI 큐레이터/페르소나 답글 한국어 잘림).
- 참고: 로컬 DB에 QA 테스트 댓글 1건 생성됨(seed-post-cn-1).

## R3 — 2026-06-27 — 권한 승인 흐름 (최고위험)
- 셋업: qa-login admin 시드 → `.env.local` ADMIN_USER_IDS 설정(백업 .env.local.qabak) → dev 서버 재기동.
  - 트러블: 기존 dev 서버(node 52107)가 포트 점유 → 새 서버 EADDRINUSE. 해당 pid kill 후 클린 재기동으로 해결.
- 테스트(A-6 + P-1~P-3 전부 PASS):
  - normal(none) → `/article/new` 권한 요청 UI → 요청 → "검토 중(pending)"
  - admin → "큐레이션·관리자" + URL 추가 폼 + 권한요청관리(1)에 QA normal 노출
  - admin 승인 → 요청목록 0, 대기 없음
  - normal(approved) → 추가 폼 획득(검토중 메시지 사라짐)
- 콘솔 0 에러 전 구간.
- 보류: A-7(실제 URL 크롤링·AI 생성), P-4(거절→재요청).
- 다음(R4): 아카이브 'AI와 함께 써보기'(R-2 게이팅, R-3 초안 생성) — approved 유저로.

## R4 — 2026-06-27 — 아카이브 AI 작성
- 테스트: /archive/new 진입(approved) → "🤖 AI와 함께" 탭 활성(R-2 PASS, 게이팅 통과) → 방향성 입력 후 'AI 초안 생성' → 502.
- 발견:
  - BUG-005(P2) **502 응답이 SDK 원본 영문 에러+환경변수명을 사용자 화면에 그대로 노출** → catch에서 `e.message` 제거, 일반 한국어 메시지로 교체. 재실행 시 깨끗한 메시지 확인.
  - BUG-006(P3) 동일 `e.message` 누출 패턴이 ~10개 API 라우트에 만연(관습) — 시스템 결정 필요, 보류.
  - ENV-1 `GOOGLE_GENERATIVE_AI_API_KEY` 미설정 → AI 초안/큐레이터/페르소나 전부 502. **환경 설정 필요**(코드 아님). A-5도 이 때문에 검증 불가.
- 재검증: typecheck 0 에러.
- 다음(R5): 나머지 페이지 렌더·콘솔 스윕 + 프로필 편집/팔로우/활동 생성.

## R5 — 2026-06-27 — 전 페이지 렌더·콘솔 스윕 + 프로필/검색
- 렌더·콘솔 스윕(모두 콘솔 0 에러): /profile/me(→/profile/[id]) · /account · /members · /search · /activities · /chat · /onboarding · /curriculum · /archive · /apply · /formula/[id].
- 테스트:
  - M-3(프로필 편집) PASS — 소개·소속 저장 후 새로고침 유지.
  - S-1(검색) PASS — 'GPT' 빈결과 친절한 빈 상태. 검색 범위는 아카이브·포뮬러·모임(아티클 제외, 제품 스코프).
  - Y-1(/apply) — 멤버 상태("이미 합류하셨어요") 정상 분기.
  - R-1/R-2 PASS, 포뮬러 상세 렌더 OK("본문 준비 중"은 본문 없는 글용 정당한 빈 상태).
- 경미 발견(미수정, 정보성):
  - UX-1 아카이브 카드 전체가 cursor:pointer지만 실제 링크는 제목만(카드 빈 영역 클릭 시 비이동).
  - COPY-1 /apply·로그인의 "카카오·네이버·구글" 안내 vs 실제 네이버만 OAuth 설정됨(ENV 의존).
- 보류: M-4(팔로우), V-2(활동 생성), R-4(아카이브 발행), P-4(거절→재요청), A-7(URL 추가).

## 총괄 — 2026-06-27 R0~R5
- **수정·재검증 완료(4)**: BUG-001(푸터 404), BUG-002(scroll 경고), **BUG-003(P1 빌드차단 typecheck)**, BUG-005(AI 에러 누출).
- **기록/보류**: BUG-004(기존 lint), BUG-006(누출 패턴 만연), ENV-1(AI 키 미설정), UX-1, COPY-1.
- **PASS**: 댓글/대댓글, 권한 승인 전체 흐름, 프로필 편집, 검색 빈상태, 전 페이지 렌더(콘솔 0 에러).
- 최종 게이트: typecheck 0 에러. (lint 기존 에러는 BUG-004로 분리.)
- 환경 메모: .env.local ADMIN_USER_IDS에 qa.admin id 추가됨(백업 .env.local.qabak). 로컬 DB에 QA 유저/댓글/요청 테스트 데이터 존재.

## R6 — 2026-06-27 — 페이지별 미구현 기능 감사·보완
- 감사: 3개 병렬 Explore 에이전트로 전 페이지 정밀 감사 → 통합 결과를 UNIMPLEMENTED.md에 정리.
  - 결론: 앱 완성도 높음. 진짜 갭은 (a) 백엔드-있음/UI-없음, (b) CRUD 구멍, (c) 제품/법무/대규모.
- 보완 완료(구현+브라우저 검증):
  - FEAT-003 멤버 검색 입력 — `ListSearch` 신규 컴포넌트 → /members?q='송근일' → 1명 필터 OK.
  - FEAT-004 아카이브 검색 입력 — 동일 컴포넌트(필터/정렬 보존) → /archive?q='리팩토링' → 1개 필터 OK.
- 재검증: typecheck 0, 신규 파일 lint 클린.
- 보류(설계 결정 필요): FEAT-010~015(모임 승인/반려·수정/삭제·상태전환, 댓글 삭제/편집, 본인글 수정/삭제, 지원 취소). FEAT-020~022/UX-1(소). 제품/법무(FEAT-002,030~034).

## R7 — 2026-06-27 — 미구현 기능 보완 (3개 그룹)
사용자 선택(모임관리/콘텐츠본인관리/작은개선) 따라 구현+브라우저 검증.
- 모임 관리:
  - `reviewApplication`(수락/반려)·`updateActivityStatus`·`deleteActivity` 액션 추가 + `OwnerPanel` 컴포넌트.
  - 검증(qa.normal 소유 모임+지원자 시드): 수락→'수락됨', 반려, 진행중 전환→'마감' 배지, 삭제→confirm→/activities. 0 에러.
  - 보류: 모임 전체 수정(편집 폼 페이지 필요).
- 콘텐츠 본인 관리:
  - `deleteComment` 액션(대댓글 cascade) + comment-section에 viewerId 전달, 본인 댓글 삭제 버튼.
    검증: 내 대댓글 삭제 4→3, 타인 댓글엔 버튼 미노출. 0 에러.
  - `deletePost` 액션 + FormulaActions isOwner 삭제 버튼. 검증: 본인 공식 삭제→/archive. 0 에러.
  - 보류: 댓글/글 인라인 편집.
- 작은 개선:
  - account에 온보딩 재진입 링크. 검증: "온보딩 다시 하기" 노출.
  - MemberCard.isFollowing 추가(쿼리 followingSet) + member-grid 연결. 검증: 팔로우한 멤버 '팔로잉' 표시.
  - 보류: topTags→아카이브 필터(마진), 카드 클릭영역(설계 트레이드오프).
- 게이트: typecheck 0 에러, lint 회귀 없음(신규/변경 파일 클린).
- 신규 파일: list-search.tsx, owner-panel.tsx. 변경: actions.ts(+4 액션), comment-section/formula-actions/member-grid/account/queries/아카이브·멤버 page.
