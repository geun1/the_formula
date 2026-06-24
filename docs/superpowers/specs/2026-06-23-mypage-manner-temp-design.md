# 마이페이지 매너온도 디자인 설계

> 작성일: 2026-06-23 · 소유자: 가희 · 브랜치: `feat/profile-manner-temp`
> 담당 역할: 사용자 평가·등급 산정 로직 (매너온도 차용 + 활동 이력 누적 표기 + 검증 문서)

## 1. 목표

프로필(마이페이지)에서 유저의 **이력을 "매너온도"로 시각화**한다. 점수 결과만이 아니라
**이력이 온도로 쌓이는 과정(누적 표기)** 을 보여주는 것이 핵심.

## 2. 현황 (이미 있는 것 — 재사용)

- 점수 엔진 `src/lib/trust.ts` — `computeTrust(stats)` → `{ trustScore, tier, badgeLabel, band, gauge }`.
  - 점수식: `clamp(36.5 + visit×0.1 + comment×1.0 + like×0.5 + formula×3.0 + project×4.0, 36.5, 99)`
  - 5단계 밴드: 새싹/기여자/활동가/빌더/AX마스터 (색·이모지·라벨·캡션 포함).
- 집계 `src/lib/queries.ts` `statsFor()` — read-time SQL 집계(캐시 없음).
- 게이지 컴포넌트 `src/components/ui/trust-gauge.tsx` (`TrustGauge`) — **만들어졌으나 미사용**.
- 시드 `src/db/seed.ts` — 5-tier 분포 유저 + posts/interactions/bookmarks/follows.

## 3. 안 된 것 (이번 작업 범위)

1. 프로필에 매너온도 노출 (게이지 미연결).
2. 점수 분해(breakdown) + 활동 타임라인 — "누적 표기" 미구현.
3. 데이터 기반 검증 아키텍처 문서 (별도 STEP 4).

## 4. 레이아웃

```
‹ 포뮬러
╭────╮  이가희 🌱새싹
│ 이 │  개발 · 회사
╰────╯
AI 관련 공부 (bio)

┌─ 매너온도 카드 (NEW · hero) ──────────────┐
│  🌱 새싹                       36.5°       │  A. 게이지 (TrustGauge, 큰 숫자)
│  ▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░               │
│  이제 막 시작했어요                          │
│ ─────────────────────────────────────── │
│  왜 이 온도?                                │  B. breakdown (항상 펼침)
│  기본 체온                     36.5°        │
│  공식 6개 작성   ▓▓▓▓▓        +18.0°        │
│  받은 좋아요 40  ▓▓▓          +20.0°        │
│  댓글 8개        ▓▓           +8.0°         │
│  방문 30회       ▓            +3.0°         │
└────────────────────────────────────────┘

[공식 6] [저장받음 40] [팔로워 12] [팔로잉 1]   stats (기존 유지)
[ 프로필 편집 ]

── 활동 이력 ──────────────                    C. 타임라인 (NEW)
🟢 공식 'RAG 평가 자동화' 작성       3일 전
❤️ 12명이 회원님을 저장              1주 전

── 관심 분야 ──  [AI] [Claude] [AX]            기존
── 내 공식 6 ──  [카드] [카드] ...             기존
```

## 5. 섹션 스펙

### A. 게이지
- 기존 `TrustGauge score={user.trustScore}` 그대로 매너온도 카드 상단에 배치.
- 이름 옆 `GradeBadge iconOnly` 는 유지(요약 표기, 중복 허용).

### B. breakdown — "왜 이 온도?"
- **항상 펼침**. `0` 기여 신호는 숨김(노이즈 제거).
- 각 줄: `{label} {count}개  ▓막대  +{points}°` — `points = count × weight`, 막대 길이는 points 비례.
- 맨 위 "기본 체온 36.5°" 고정.
- 데이터 출처: `trust.ts` 에 추가할 `breakdown(stats)` (§7).

### C. 활동 타임라인
- **모두에게 공개**. 단 **공개 이벤트만** 노출:
  - 포함: 작성한 공식(`posts`), 받은 좋아요/댓글(내 글 대상 `interactions`), 저장받음(`bookmarks` 내 글 대상), 프로젝트 완주.
  - 제외(사적): 내가 누른 좋아요/저장, DM, 내가 한 view.
- 이벤트별 이모지 + 문구 + 상대시간. 최신순 N개.
- 데이터 출처: `queries.ts` 에 추가할 `getActivityTimeline(userId)` (§7).

## 6. 빈 상태 (새싹 — 신규 OAuth 유저의 실제 케이스)

- 게이지: 36.5° 최소 채움(4%).
- breakdown: "기본 체온 36.5°" 한 줄 + "활동을 시작하면 온도가 올라가요" 안내.
- 타임라인: "아직 활동 이력이 없어요. 첫 공식을 기록해보세요" empty-state.

## 7. 데이터 의존성 (STEP 2에서 구현)

- `trust.ts` `breakdown(stats)`:
  ```ts
  { base: 36.5,
    items: [{ key, label, count, weight, points }],  // 0 기여 제외는 렌더에서
    total }
  ```
  점수식은 불변 — `WEIGHTS` 재사용만. (trust.ts 격리 원칙 유지)
- `queries.ts` `getActivityTimeline(userId, limit)`:
  공개 이벤트 통합 → `{ kind, emoji, text, at }[]` 최신순.

## 8. 결정 사항 (확정)

| 항목 | 결정 |
|---|---|
| breakdown 노출 | 항상 펼침, 0 기여 신호 숨김 |
| 타임라인 범위 | 모두에게 공개, 공개 이벤트만 |
| 점수식 변경 | 없음 (trust.ts 격리 유지) |
| 목업 데이터 | 기존 seed 활용, 빈 유저는 정상 새싹 empty-state |

## 9. 구현 순서

1. STEP 2 · `breakdown()` + `getActivityTimeline()` (로직).
2. STEP 3 · 프로필에 매너온도 카드 + 타임라인 섹션 (시각화).
3. STEP 1 · (옵션) 내 실제 계정 목업 백필 — 필요 시.
4. STEP 4 · 검증 아키텍처 문서 (`docs/`).
