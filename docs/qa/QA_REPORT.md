# QA 보고서 — the_formula

| 항목 | 내용 |
|------|------|
| 대상 | the_formula (Next.js + Drizzle/Postgres + Auth.js v5 + AI SDK) |
| 일자 | 2026-06-27 |
| 방식 | Claude Code가 Playwright MCP로 Chrome을 직접 운전하는 자동 브라우저 QA 루프 (R0~R5) |
| 환경 | dev http://localhost:3002 · 로컬 Postgres · OAuth는 `scripts/qa-login.ts`로 세션 시드(우회) |
| 범위 | 구현된 18개 페이지 + 핵심 API · 권한 단계별(비로그인/normal/approved/admin) |
| 게이트 | typecheck **0 에러** (수정 후) |

---

## 1. 요약 (Executive Summary)

자동 브라우저 루프로 **테스트 → 결함/미구현 식별 → 코드 보완 → 재검증**을 5회차 수행했다.
**결함 4건(P1 1건 포함)을 수정·재검증 완료**했고, 코드가 아닌 환경/제품 결정이 필요한 항목 5건을 분리 기록했다.
핵심 고위험 영역(댓글·대댓글, 권한 승인 흐름)은 전부 정상 동작을 확인했다.

가장 중요한 발견은 **BUG-003 (P1)**: 커밋되지 않은 `db/index.ts`의 로컬/Neon 듀얼 드라이버 전환이
`db`를 두 드라이버의 유니온 타입으로 만들어 `.returning()` 호출 14곳의 타입을 깨뜨렸고,
그 상태로는 `next build`가 실패했다. 런타임 동작은 유지한 채 타입만 단일화해 해결했다.

---

## 2. 수정 완료 결함 (Fixed · 재검증 완료)

| ID | 등급 | 영역 | 증상 | 수정 | 재검증 |
|----|------|------|------|------|--------|
| BUG-003 | **P1** | 빌드/타입 | 워킹트리 typecheck 14개 실패 → `next build` 차단 | `db/index.ts` 듀얼드라이버 유니온 → `NodePgDatabase` 단일 타입 고정(런타임 전환 유지) | typecheck 0 에러 (git stash 대조: HEAD 0 / 워킹트리 14) |
| BUG-005 | P2 | 아카이브 AI 초안 | 502 시 SDK 영문 에러 + 환경변수명을 사용자 화면에 노출(정보 누출) | `draft/route.ts` catch에서 `e.message` 노출 제거 → 일반 한국어 메시지 | 재실행 시 깨끗한 메시지만 노출 |
| BUG-001 | P2 | 푸터 안내 링크 | `/terms` `/privacy` `/notice` `/contact` 4개 모두 404 | `PlaceholderPage` 컴포넌트 + 4개 라우트 생성(법적 문구는 준비중 상태) | 4개 모두 200·렌더 OK |
| BUG-002 | P3 | 전역 레이아웃 | Next 경고: `<html>`에 `data-scroll-behavior` 누락 | `layout.tsx`에 속성 추가 | 콘솔 경고 사라짐 |

---

## 3. 정상 확인 (PASS)

| 영역 | 케이스 | 결과 |
|------|--------|------|
| 아티클 | 상세 렌더(A-1), 댓글 작성(A-2), 대댓글 스레드 중첩(A-3) | ✅ 카운트·중첩·즉시 노출 정상, 콘솔 0 에러 |
| **권한 승인 흐름** | 요청→pending(P-1), admin 대기목록(P-2), 승인(P-3), approved 추가폼 획득 | ✅ 전 구간 정상 (최고위험 영역) |
| 권한 분기(A-6) | none / pending / approved / admin 각 상태 UI | ✅ 4개 상태 모두 정확 |
| 아카이브 | 목록·포뮬러 상세 렌더(R-1), AI 탭 게이팅(R-2) | ✅ approved 권한 전파 확인 |
| 프로필 | 편집 저장 영속성(M-3) | ✅ 새로고침 후 유지 |
| 검색 | 빈결과 처리(S-1) | ✅ 친절한 빈 상태 |
| 전 페이지 | 18개 페이지 렌더·콘솔 스윕(X-2) | ✅ 콘솔 0 에러 |

---

## 4. 미해결 / 결정 필요 (Open)

| ID | 등급 | 영역 | 내용 | 필요 조치 |
|----|------|------|------|-----------|
| ENV-1 | — | AI 전반 | `GOOGLE_GENERATIVE_AI_API_KEY` 미설정 → AI 초안/큐레이터/페르소나 전부 502 | **환경 설정**(키 추가) 후 AI 기능 재검증 가능 |
| BUG-006 | P3 | API 다수 | `e.message` 누출 패턴이 posts/articles/archive/members 등 ~10개 라우트에 만연(관습) | 시스템적 에러 응답 정책 결정 |
| BUG-004 | P2 | 빌드/린트 | 기존 lint 에러 4건(toast.tsx 불변성, queries.ts prefer-const/unused) — 본 QA 변경 아님 | 별도 정리 |
| UX-1 | P3 | 아카이브 카드 | 카드 전체 `cursor:pointer`지만 실제 링크는 제목만 → 빈 영역 클릭 시 비이동 | 카드 전체 링크화 검토 |
| COPY-1 | P3 | 로그인/지원 | "카카오·네이버·구글" 안내 vs 실제 네이버만 OAuth 설정됨 | 키 추가 또는 카피 조정 |

---

## 5. 미실행 / 보류 (다음 루프 대상)

- A-4 댓글 페이지네이션 — 현 데이터 최다 4개로 임계 미도달(시딩 필요)
- A-5 AI 큐레이터/페르소나 답글 한국어 잘림 — ENV-1(AI 키) 해결 후 검증
- A-7 URL로 아티클 추가 — 외부 fetch + AI 생성이라 보류
- R-4 아카이브 발행 · M-4 팔로우 · V-2 활동 생성 · P-4 거절→재요청

---

## 6. 변경/생성 산출물

**소스 수정 (3)**
- `src/db/index.ts` — db 단일 타입 고정 (BUG-003)
- `src/app/layout.tsx` — scroll-behavior 속성 (BUG-002)
- `src/app/api/archive/draft/route.ts` — 에러 메시지 누출 제거 (BUG-005)

**신규 소스 (6)**
- `src/components/placeholder-page.tsx` + `src/app/{terms,privacy,notice,contact}/page.tsx` (BUG-001)

**QA 인프라**
- `scripts/qa-login.ts` — OAuth 우회 세션 시드(normal/approved/admin)
- `.mcp.json` — Playwright(Chrome) MCP 연결
- `docs/qa/` — README · TEST_PLAN · TEST_CASES · BUGS · UNIMPLEMENTED · LOOP_LOG · QA_REPORT(본 문서)
- `.gitignore` — `.playwright-mcp/`, `.env.local.qabak` 제외 추가

---

## 7. 환경 변경 메모 (원복 검토)

- `.env.local`의 `ADMIN_USER_IDS`에 QA admin 유저 id 추가됨 (백업: `.env.local.qabak`). **운영 배포 전 원복 권장.**
- 로컬 DB에 QA 유저(normal/approved/admin)·테스트 댓글·권한요청 데이터 존재 (로컬이라 무해).

---

## 8. 권고 (다음 단계)

1. **BUG-003 코드리뷰** — 당신의 WIP `db/index.ts` 수정 의도 확인.
2. **AI 키 설정(ENV-1)** → AI 초안/큐레이터/페르소나 + A-5(한국어 잘림) 재검증.
3. **에러 응답 정책(BUG-006)** 결정 후 일괄 적용 여부 판단.
4. 남은 보류 케이스(아카이브 발행/팔로우/활동 생성/거절-재요청/페이지네이션) 루프 계속.

> 상세 회차 기록은 [LOOP_LOG.md](LOOP_LOG.md), 결함 원장은 [BUGS.md](BUGS.md), 케이스 시트는 [TEST_CASES.md](TEST_CASES.md) 참고.
