# 테스트 계획 (Test Plan)

## 1. 목적
구현된 페이지가 의도대로 동작하는지 검증하고, 페이지 안에 남아있는 **미구현/미완 기능을 보완**하면서
회귀 없이 품질을 끌어올린다. 사람 개입을 최소화한 자동 브라우저 루프로 진행.

## 2. 대상 환경
- 앱: Next.js (커스텀 빌드, `node_modules/next/dist/docs/` 가이드 우선) — http://localhost:3002
- DB: Drizzle + Postgres(Neon/로컬 자동전환). 세션 전략 `database`.
- 인증: Auth.js v5 (Google/Kakao/Naver/GitHub OAuth). **QA는 `scripts/qa-login.ts`로 세션 시드(우회).**
- 브라우저: Chrome (Playwright MCP 직접 제어)
- AI: `@ai-sdk/google` (페르소나 댓글, 큐레이터 답글, AI 작성 보조)

## 3. 테스트 역할(계정)
| 역할 | 시드 명령 | 기대 권한 |
|------|-----------|-----------|
| 비로그인 | (쿠키 없음) | 공개 페이지 열람만 |
| normal | `qa-login.ts normal` | 로그인 기능(댓글·북마크·팔로우·프로필 등) |
| approved | `qa-login.ts approved` | + 아티클 추가 / AI와 함께 쓰기 |
| admin | `qa-login.ts admin` (+ENV) | + 권한요청 승인/거절, 수동 아티클 추가(URL) |

## 4. 범위 (페이지 인벤토리)
공개/탐색: `/`(홈), `/article/[id]`, `/formula/[id]`, `/curriculum`, `/members`, `/profile/[id]`, `/search`, `/activities`, `/activities/[id]`, `/archive`
인증 필요/액션: `/account`, `/onboarding`, `/apply`, `/article/new`, `/archive/new`, `/activities/new`, `/profile/me`, `/chat`, `/chat/[id]`
API: `/api/articles*`, `/api/archive*`, `/api/posts`, `/api/members`, `/api/upload`, `/api/cron`, `/api/auth/*`

> 페이지별 세부 케이스는 [TEST_CASES.md](TEST_CASES.md). 루프를 돌며 채워 나간다.

## 5. 고위험 영역 (우선 검증)
최근 커밋·권한 분기 기준으로 가장 깨지기 쉬운 곳:
1. **아티클 추가 권한 승인제** — admin/approved/pending/rejected/none 분기, 요청→승인→추가 전체 흐름
2. **AI와 함께 써보기** — 권한 게이팅 + AI 초안 생성(`/api/archive/draft`) 실패/타임아웃 처리
3. **댓글/대댓글 + 페이지네이션** — 스레드 무결성, 페르소나/큐레이터 AI 답글, 한국어 잘림(maxOutputTokens)
4. **인증·세션 경계** — 비로그인 시 액션 차단/리다이렉트, 세션 만료
5. **업로드(`/api/upload`, Vercel Blob)** — 파일 타입/크기 검증
6. **온보딩 게이팅** — `onboarded=false` 유저 흐름

## 6. 각 케이스에서 관찰할 것
- 기능 정상 동작 여부(happy path)
- 경계/에러 입력(빈 값, 초장문, 권한 없음, 동시성)
- **브라우저 콘솔 에러 / 네트워크 4xx·5xx** (UI가 멀쩡해 보여도 잡아낸다)
- 접근성/레이아웃 깨짐(주요한 것만)
- 한국어 텍스트 잘림·인코딩

## 7. 결함 등급
- **P0** 크래시/데이터 손상/인증 우회 — 즉시 수정
- **P1** 핵심 기능 동작 불가 — 해당 회차 내 수정
- **P2** 부분 결함/잘못된 메시지 — 백로그
- **P3** 사소/미관 — 기록만

## 8. 합격 기준 (회차 종료 조건)
- 해당 회차 대상 케이스 모두 PASS(또는 결함이 BUGS.md에 등록+등급 부여)
- `npm run typecheck` / `npm run lint` 회귀 없음
- 수정한 기능은 동일 시나리오 재실행으로 재검증 완료

## 9. 코드 보완 규칙 (프로젝트 제약 준수)
- TypeScript only, **named export**, `console.log` 금지(기존 logger 사용 또는 생략)
- Next API는 학습된 지식이 아니라 `node_modules/next/dist/docs/` 가이드를 먼저 확인
- 작은 단위 수정 → 즉시 재검증. 한 회차에 광범위 리팩터 금지.
- 실데이터(Neon) 변경 주의: 파괴적 테스트는 QA 시드 유저/데이터로 한정.
