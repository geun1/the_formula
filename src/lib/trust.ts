// =============================================================================
// 신뢰 루프 — 당근 매너온도식 등급 산정 (소유자: 가희)
// =============================================================================
// 이 파일 하나만 고치면 render/storage/계약을 안 건드리고 등급을 재튜닝할 수 있다.
// 원칙: "검증 가능한 것 > 남이 인정한 것 > 내가 한 것" — 신뢰는 위조 어려운 신호에 무게.
// 온도 = 100 × raw/(raw+K)  — 감속곡선(100에 점근, 위로 갈수록 둔화).
// raw = 4계층(검증/인정/자가/정체성) 가중합. 자가 신호는 캡으로 양치기 차단.
// =============================================================================
import type { ActivityStats, Tier } from "./contract";

export const TRUST_BASE = 0;
export const TRUST_MAX = 100;
export const SATURATION_K = 30; // 감속상수 — K=30이면 완주 1회(raw≈21)→온도 41점 근접

// 신호별 가중치 — 모임완주 최고, 검증공식 다음, 저장/하트 보조
export const WEIGHTS = {
  completion: 20,        // 모임·스터디 완주 (핵심 신뢰 신호)
  verifiedFormula: 12,   // 검증된 공식
  formula: 4,            // 공식 작성
  saveReceived: 0.5,     // 공식 저장받음
  memberSave: 0.3,       // 받은 하트
  likesReceived: 0.3,    // 좋아요 받기
  commentsReceived: 0.5, // 댓글 받기
  onboarded: 10,         // 프로필 채우기 (기본 온도 10점 부여)
} as const;

export interface TierBand {
  tier: Tier;
  min: number;
  label: string;
  color: string; // 뱃지/게이지 색
  emoji: string;
  caption: string;
  condition?: string; // 이 등급 달성을 위한 최소 조건
}

// 높은 등급부터 (find 가 첫 매칭 반환). 0~100 스케일 기준 경계.
export const TIER_BANDS: TierBand[] = [
  { tier: "master", min: 82, label: "AX마스터", color: "#f59e0b", emoji: "👑", caption: "상위 0.1% 신뢰", condition: "완주 5회 + 검증 공식 3개 + 하트 50개" },
  { tier: "builder", min: 65, label: "빌더", color: "#fbbf24", emoji: "🛠", caption: "커뮤니티를 만들어가요", condition: "완주 3회" },
  { tier: "activist", min: 38, label: "활동가", color: "#a78bfa", emoji: "🔥", caption: "활발하게 활동해요", condition: "공식 작성 + 완주 1회" },
  { tier: "contributor", min: 15, label: "기여자", color: "#60a5fa", emoji: "🌿", caption: "꾸준히 참여해요", condition: "공식 작성" },
  { tier: "sprout", min: 0, label: "새싹", color: "#34d399", emoji: "🌱", caption: "이제 막 시작했어요" },
];

export interface TrustContribution {
  key: string;
  label: string;
  count: number; // 표시용 신호 개수 (정체성은 0)
  weight: number;
  points: number; // 실제 기여 점수 (캡 반영)
}

/** 등급별 최소 조건 충족 여부 — 단계형: 이전 등급 조건이 모두 충족되어야 다음 단계 진입. */
function meetsMinCondition(s: ActivityStats, tier: Tier): boolean {
  const completed = s.completedActivityCount ?? s.projectCount ?? 0;
  const hearts = s.memberSaves ?? 0;
  const verified = s.verifiedFormulaCount ?? 0;
  const hasFormula = (s.formulaCount ?? 0) >= 1;
  // 단계형: isContributor → isActivist → isBuilder → isMaster
  const isContributor = hasFormula;
  const isActivist    = isContributor && completed >= 1;
  const isBuilder     = isActivist && completed >= 3;
  const isMaster      = isBuilder && completed >= 5 && verified >= 3 && hearts >= 50;
  switch (tier) {
    case "master":      return isMaster;
    case "builder":     return isBuilder;
    case "activist":    return isActivist;
    case "contributor": return isContributor;
    default:            return true;
  }
}

/** stats → 신호별 기여 목록. breakdown/rawScore 공용. */
function contributionsOf(s: ActivityStats): TrustContribution[] {
  const completed = s.completedActivityCount ?? s.projectCount ?? 0;
  return [
    { key: "completion",       label: "모임·스터디 완주", count: completed,                       weight: WEIGHTS.completion,       points: completed                      * WEIGHTS.completion },
    { key: "verifiedFormula",  label: "검증된 공식",       count: s.verifiedFormulaCount ?? 0,    weight: WEIGHTS.verifiedFormula,  points: (s.verifiedFormulaCount ?? 0)  * WEIGHTS.verifiedFormula },
    { key: "formula",          label: "공식 작성",         count: s.formulaCount ?? 0,            weight: WEIGHTS.formula,          points: (s.formulaCount ?? 0)          * WEIGHTS.formula },
    { key: "saveReceived",     label: "공식 저장받음",     count: s.savesReceived ?? 0,           weight: WEIGHTS.saveReceived,     points: (s.savesReceived ?? 0)         * WEIGHTS.saveReceived },
    { key: "memberSave",       label: "받은 하트",         count: s.memberSaves ?? 0,             weight: WEIGHTS.memberSave,       points: (s.memberSaves ?? 0)           * WEIGHTS.memberSave },
    { key: "likesReceived",    label: "좋아요 받기",       count: s.likesReceived ?? 0,           weight: WEIGHTS.likesReceived,    points: (s.likesReceived ?? 0)         * WEIGHTS.likesReceived },
    { key: "commentsReceived", label: "댓글 받기",         count: s.commentsReceived ?? 0,        weight: WEIGHTS.commentsReceived, points: (s.commentsReceived ?? 0)      * WEIGHTS.commentsReceived },
    { key: "onboarded",        label: "온보딩 완료",       count: 0,                              weight: WEIGHTS.onboarded,        points: s.onboarded ? WEIGHTS.onboarded : 0 },
  ];
}

/** raw 가중합 (감속곡선 입력 전). */
export function rawScore(s: ActivityStats): number {
  return contributionsOf(s).reduce((sum, c) => sum + c.points, 0);
}

/** stats → 매너온도(0~100). 감속곡선 + 최소 조건 미충족 시 등급 상한으로 잠금. */
export function scoreFromStats(s: ActivityStats): number {
  const raw = rawScore(s);
  const score = TRUST_MAX * (raw / (raw + SATURATION_K));

  // 최소 조건 미충족 등급의 경계값 미만으로 상한 설정 (높은 등급부터 검사)
  let maxScore = TRUST_MAX;
  for (const band of TIER_BANDS) {
    if (!meetsMinCondition(s, band.tier)) {
      maxScore = band.min - 0.1;
      break;
    }
  }

  const min = 10;
  const clamped = Math.min(Math.max(score, min), maxScore);
  return Math.round(clamped * 10) / 10;
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

/** 게이지 채움 비율 0~1 */
export function gaugeRatio(score: number): number {
  return Math.max(0, Math.min(1, score / TRUST_MAX));
}

export interface TrustBreakdown {
  base: number;
  items: TrustContribution[]; // points 내림차순, 0 기여 제외
  rawTotal: number; // raw 가중합 (감속 전 참고값)
  score: number; // 실제 매너온도
}

/** "왜 이 온도?" — 신호별 기여 분해(0 제외, 큰 기여순). */
export function breakdown(s: ActivityStats): TrustBreakdown {
  const items = contributionsOf(s)
    .filter((c) => c.points > 0)
    .sort((a, b) => b.points - a.points);
  const raw = rawScore(s);
  return {
    base: TRUST_BASE,
    items,
    rawTotal: Math.round(raw * 10) / 10,
    score: scoreFromStats(s),
  };
}

/** 다음 등급 달성 조건별 충족 여부 */
export function nextTierChecklist(s: ActivityStats, tier: Tier): { label: string; met: boolean }[] {
  const completed = s.completedActivityCount ?? s.projectCount ?? 0;
  const hearts = s.memberSaves ?? 0;
  const verified = s.verifiedFormulaCount ?? 0;
  switch (tier) {
    case "master": return [
      { label: "완주", met: completed >= 5 },
      { label: "검증 공식", met: verified >= 3 },
      { label: "하트", met: hearts >= 50 },
    ];
    case "builder": return [
      { label: "완주", met: completed >= 3 },
    ];
    case "activist": return [
      { label: "완주", met: completed >= 1 },
    ];
    case "contributor": return [
      { label: "공식 작성", met: (s.formulaCount ?? 0) >= 1 },
    ];
    default: return [];
  }
}

/** 다음 등급까지 — 카드 진행바용. 최고 등급이면 next=null. */
export function nextTier(score: number): {
  next: TierBand | null;
  gap: number; // 다음 경계까지 남은 온도
  progress: number; // 현재 등급 구간 내 진행률 0~1
} {
  const idx = TIER_BANDS.findIndex((b) => score >= b.min); // 현재 밴드(높은순 배열)
  const current = TIER_BANDS[idx] ?? TIER_BANDS[TIER_BANDS.length - 1];
  const next = idx > 0 ? TIER_BANDS[idx - 1] : null;
  if (!next) return { next: null, gap: 0, progress: 1 };
  const span = next.min - current.min;
  const progress = span > 0 ? (score - current.min) / span : 1;
  return {
    next,
    gap: Math.round((next.min - score) * 10) / 10,
    progress: Math.max(0, Math.min(1, progress)),
  };
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
