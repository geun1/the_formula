# [제안] 프로필 외부링크 추가 (GitHub / 블로그 / 홈페이지)

> 제안자: 가희 · 2026-06-23 · 브랜치: `feat/profile-manner-temp`
> **팀 합의 필요 사유: 공유 DB 스키마 변경(마이그레이션) 포함**

## 1. 무엇을

멤버 프로필에 **GitHub / 블로그 / 홈페이지** 링크를 추가한다.
- 프로필 페이지에 링크 아이콘 줄 노출.
- 프로필 편집(계정)에서 직접 입력.

네트워킹이 핵심인 커뮤니티라, 멤버의 외부 활동(코드·글)으로 바로 이어주는 가치가 큼.

## 2. 변경 범위

| 레이어 | 파일 | 변경 |
|---|---|---|
| 스키마 | `src/db/schema.ts` | `users`에 칼럼 3개 추가 |
| 마이그레이션 | `drizzle/` | 신규 마이그레이션 1건 (additive) |
| 계약 타입 | `src/lib/contract.ts` | `User`에 필드 3개 |
| 조회 | `src/lib/queries.ts` | `getProfile` select 확장 |
| 편집 | `src/app/account/profile-form.tsx` + `actions.ts` | 입력 3칸 + URL 검증 |
| 렌더 | `src/app/profile/[id]/page.tsx` | 링크 줄 |

## 3. 스키마 변경 (★팀 리뷰 포인트)

```ts
// users 테이블에 추가 (전부 nullable)
github: text("github"),
blog: text("blog"),
homepage: text("homepage"),
```

- **additive · nullable · 기본값 없음 → 비파괴(non-breaking) 변경.**
  기존 행은 자동으로 `null`, 다른 기능에 영향 없음.
- 칼럼 3개 고정이라 `jsonb` 대신 개별 칼럼(단순·조회 쉬움).

## 4. 마이그레이션 운영 (★공유 Neon DB 합의)

같은 `DATABASE_URL`을 공유하므로 조율 필요:

1. **이 마이그레이션은 가희가 소유** — 다른 사람이 동시에 `user` 테이블 마이그레이션을 만들면 번호 충돌.
2. 순서: `npm run db:generate` → 생성된 SQL 리뷰 → **한 명이** `npm run db:migrate`로 공유 DB에 적용 → 나머지는 `git pull`.
3. additive nullable이라 적용해도 기존 데이터/기능 안전.

> 반대로, **별도 Neon DB 브랜치**를 쓰면 충돌 자체가 없음(권장 검토).

## 5. 입력 검증 (trust boundary — 생략 금지)

- 각 링크 optional. 입력 시 URL 형식 검증(`zod` 이미 사용 중: `z.string().url()`).
- 스킴 없으면 `https://` 자동 prepend 후 검증.
- 저장은 trim, 빈 문자열은 `null`.

## 6. 렌더 (예시)

bio 아래 링크 줄:
```
🔗 github.com/gahee   ✍ blog.naver.com/...   🌐 gahee.dev
```
- 값 있는 것만 표시. `target="_blank" rel="noopener noreferrer"`.

## 7. 범위 밖 (이번 제안 X)

- 링크 자동 검증(살아있는 URL인지 핑)·미리보기 카드.
- GitHub 활동 임베드(잔디 등).
- LinkedIn/X 등 추가 플랫폼 — 필요하면 같은 패턴으로 칼럼 추가.

## 8. 팀에 묻고 싶은 것

1. 공유 DB에 바로 마이그레이션 적용 vs Neon DB 브랜치 분리?
2. 링크 3종(GitHub/블로그/홈페이지) 외에 더 필요한 플랫폼?
3. 마이그레이션 소유·적용 타이밍(다른 `user` 스키마 작업과 겹치는지)?
