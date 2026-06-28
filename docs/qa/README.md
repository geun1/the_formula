# QA — the_formula

자동 브라우저 QA + 루프 엔지니어링 작업 공간. Claude Code(VSCode)가 **Playwright MCP로 실제 크롬을 직접 운전**하며
`탐색 → 버그/미구현 식별 → 코드 보완 → 재검증` 루프를 돌린다.

## 문서 구성

| 문서 | 역할 |
|------|------|
| [QA_SUMMARY.md](QA_SUMMARY.md) | **★ 종합 정리** (QA 방법·시나리오·전체 수정/커밋 한눈에) |
| [QA_REPORT.md](QA_REPORT.md) | 초기 자동 루프 보고서 (요약·결과·권고) |
| [CHROME_SCENARIOS.md](CHROME_SCENARIOS.md) | **클로드인크롬 시나리오 + 실행 결과** (기능·페이지별 단계 + 최신 PASS/FAIL) |
| [USER_SCENARIOS.md](USER_SCENARIOS.md) | **사용자 여정(E2E)** 시나리오 (페르소나·목표 기반 통합 흐름) |
| [TEST_PLAN.md](TEST_PLAN.md) | 범위·환경·역할·리스크·합격 기준 (전략) |
| [TEST_CASES.md](TEST_CASES.md) | 페이지/기능별 테스트 케이스 (살아있는 시트) |
| [BUGS.md](BUGS.md) | 발견 결함 트래커 |
| [UNIMPLEMENTED.md](UNIMPLEMENTED.md) | 구현된 페이지 내 미구현/미완 기능 백로그 |
| [LOOP_LOG.md](LOOP_LOG.md) | 루프 반복 기록 (회차별 무엇을 테스트·수정·검증했는지) |

## 사전 준비 (1회)

1. **Playwright MCP 연결** — 루트 `.mcp.json` 에 `playwright` 서버 등록됨.
   세션을 재연결하면 `browser_navigate`, `browser_click`, `browser_snapshot` 등의 도구가 로드된다.
   (프로젝트 스코프 MCP는 최초 1회 승인 필요.)
2. **Dev 서버** — `npm run dev` → http://localhost:3002
3. **QA 로그인** — OAuth 없이 권한 단계별 세션을 시드:
   ```bash
   node --env-file=.env.local --import tsx scripts/qa-login.ts <role>
   # role = normal | approved | admin
   ```
   출력된 `cookieName`/`cookieValue` 를 Playwright 컨텍스트에 쿠키로 주입하면 즉시 로그인 상태.
   - `admin` 은 출력된 `userId` 를 `.env.local` 의 `ADMIN_USER_IDS` 에 추가하고 dev 서버 재기동해야 권한 적용.

## 루프 방식 (요약)

1. **계획** — 이번 회차에 검증할 페이지/기능 1~2개 선택 (TEST_CASES 우선순위 기준)
2. **테스트** — Playwright로 시나리오 실행, 콘솔/네트워크 에러까지 관찰, 스크린샷 증거 확보
3. **기록** — 결함 → BUGS.md, 미구현 → UNIMPLEMENTED.md
4. **보완** — 코드 수정 (작은 단위, named export·TS only·logger 규칙 준수)
5. **재검증** — 같은 시나리오 재실행 + `typecheck`/`lint` 회귀 확인
6. **로그** — LOOP_LOG.md 에 회차 결과 기록 → 1로

상세 규칙은 [TEST_PLAN.md](TEST_PLAN.md) 참고.
