// =============================================================================
// 신뢰 루프 — 당근 매너온도식 등급 산정 (소유자: 가희)
// =============================================================================
// 이 파일 하나만 고치면 render/storage/계약을 안 건드리고 등급을 재튜닝할 수 있다.
// score = clamp(36.5 + visit*0.1 + comment*1.0 + like*0.5 + formula*3.0 + project*4.0, 36.5, 99)
// =============================================================================
import type { ActivityStats, Tier } from "./contract";

export const TRUST_BASE = 36.5; // 정상체온 메타포
export const TRUST_MAX = 99;

export const WEIGHTS = {
  visit: 0.1,
  comment: 1.0,
  like: 0.5,
  formula: 3.0,
  project: 4.0,
} as const;

export interface TierBand {
  tier: Tier;
  min: number;
  label: string;
  color: string; // 뱃지/게이지 색
  emoji: string;
  caption: string;
}

// 높은 등급부터 (find 가 첫 매칭 반환)
export const TIER_BANDS: TierBand[] = [
  { tier: "master", min: 95, label: "AX마스터", color: "#f59e0b", emoji: "👑", caption: "상위 0.1% 신뢰" },
  { tier: "builder", min: 80, label: "빌더", color: "#fbbf24", emoji: "🛠", caption: "커뮤니티를 만들어가요" },
  { tier: "activist", min: 60, label: "활동가", color: "#a78bfa", emoji: "🔥", caption: "활발하게 활동해요" },
  { tier: "contributor", min: 45, label: "기여자", color: "#60a5fa", emoji: "🌿", caption: "꾸준히 참여해요" },
  { tier: "sprout", min: 0, label: "새싹", color: "#34d399", emoji: "🌱", caption: "이제 막 시작했어요" },
];

export function scoreFromStats(s: ActivityStats): number {
  const raw =
    TRUST_BASE +
    s.visitCount * WEIGHTS.visit +
    s.commentCount * WEIGHTS.comment +
    s.likesReceived * WEIGHTS.like +
    s.formulaCount * WEIGHTS.formula +
    s.projectCount * WEIGHTS.project;
  const clamped = Math.min(Math.max(raw, TRUST_BASE), TRUST_MAX);
  return Math.round(clamped * 10) / 10; // 소수 1자리
}

export function tierBandFor(score: number): TierBand {
  return TIER_BANDS.find((b) => score >= b.min) ?? TIER_BANDS[TIER_BANDS.length - 1];
}

export function tierFor(score: number): Tier {
  return tierBandFor(score).tier;
}

export function badgeLabelFor(score: number): string {
  return tierBandFor(score).label;
}

/** 게이지 채움 비율 0~1 (36.5°→99°) */
export function gaugeRatio(score: number): number {
  return Math.max(0, Math.min(1, (score - TRUST_BASE) / (TRUST_MAX - TRUST_BASE)));
}

/** 순수 함수: stats → 신뢰 메트릭 일체 */
export function computeTrust(stats: ActivityStats) {
  const trustScore = scoreFromStats(stats);
  const band = tierBandFor(trustScore);
  return {
    trustScore,
    tier: band.tier,
    badgeLabel: band.label,
    band,
    gauge: gaugeRatio(trustScore),
  };
}
