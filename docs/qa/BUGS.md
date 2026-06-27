# 결함 트래커 (Bugs)

등급: P0 크래시/데이터손상/인증우회 · P1 핵심기능불가 · P2 부분결함 · P3 사소/미관
상태: OPEN · FIXING · FIXED(재검증 완료) · WONTFIX

| ID | 등급 | 상태 | 페이지/기능 | 증상 | 재현 | 원인/수정 | 재검증 |
|----|------|------|-------------|------|------|-----------|--------|
| BUG-001 | P2 | FIXED | 푸터 '안내' 링크 | `/terms` `/privacy` `/notice` `/contact` 4개 모두 404 | 푸터 안내 링크 클릭 | PlaceholderPage + 4 라우트 생성 | 4개 모두 200·렌더 OK |
| BUG-002 | P3 | FIXED | 전역 레이아웃 | Next 경고: `<html>`에 `data-scroll-behavior` 누락 | 콘솔 워닝 | layout.tsx `<html data-scroll-behavior="smooth">` | 콘솔 경고 사라짐 |
| BUG-003 | P1 | FIXED | 빌드/타입 | 워킹트리 typecheck 14개 실패 → `next build` 차단 | `npm run typecheck` | db/index.ts 듀얼드라이버 유니온 → `NodePgDatabase`로 단일타입 고정 | typecheck 0 에러 |
| BUG-004 | P2 | OPEN | 빌드/린트 | 기존 lint 에러(미수정): toast.tsx 불변성, queries.ts prefer-const/unused | `npm run lint` | 내 변경 아님(HEAD부터 존재) — 별도 처리 필요 | ⬜ |
| BUG-005 | P2 | FIXED | 아카이브 AI 초안 | 502 시 SDK 원본 영문 에러+환경변수명(`GOOGLE_GENERATIVE_AI_API_KEY`)을 사용자 화면에 노출 | /archive/new AI 탭 생성 클릭 | draft/route.ts catch에서 `e.message` 노출 제거 → 일반 한국어 메시지 | 재실행 시 깨끗한 메시지만 노출 |
| BUG-006 | P3 | OPEN | API 다수 | 동일 `e.message` 누출 패턴이 posts/articles/archive/members 등 ~10개 라우트에 존재(관습) | 코드리뷰 | 사용자 대면 아님(admin/ingest) — 시스템적 정책 결정 필요 | ⬜ |
| ENV-1 | — | OPEN | AI 전반 | `GOOGLE_GENERATIVE_AI_API_KEY` 미설정 → AI 초안/큐레이터/페르소나 전부 동작불가(502) | env 점검 | **환경 설정 필요**(코드 아님) — 키 넣으면 AI 기능 검증 가능 | ⬜ |

---

## 상세 기록

<!--
회차에서 결함을 찾을 때마다 아래 형식으로 추가:

### BUG-001 · [P?] 제목
- **페이지/기능**:
- **역할/전제**:
- **재현 절차**: 1) ... 2) ...
- **기대 / 실제**:
- **증거**: 스크린샷 경로, 콘솔/네트워크 로그
- **원인**: (코드 위치 file:line)
- **수정**: (커밋/diff 요약)
- **재검증**: (동일 시나리오 재실행 결과)
-->
