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
export const SATURATION_K = 60; // 감속상수(클수록 완만)

// 신호별 가중치 — 검증 > 인정 > 자가
export const WEIGHTS = {
  // 검증된 기여 (최강, 위조 난이도 최고)
  verifiedFormula: 6,
  completion: 5,
  articleFormula: 2,
  // 동료 인정 (강, 타인 판단)
  saveReceived: 1.5,
  memberSave: 1.5,
  follower: 0.6,
  likeReceived: 0.3,
  commentReceived: 0.4,
  // 자가 활동 (약 + 캡)
  unverifiedFormula: 1,
  selfComment: 0.1,
  // 정체성 검증 (바닥 + 캡)
  onboarded: 2,
  company: 1,
  externalLink: 2,
} as const;

const SELF_FORMULA_CAP = 10; // 미검증 공식 기여 상한
const SELF_COMMENT_CAP = 5; // 내 댓글 기여 상한(=0.1×50)
const IDENTITY_CAP = 7; // 정체성 신호 합 상한

export interface TierBand {
  tier: Tier;
  min: number;
  label: string;
  color: string; // 뱃지/게이지 색
  emoji: string;
  caption: string;
}

// 높은 등급부터 (find 가 첫 매칭 반환). 0~100 스케일 기준 경계.
export const TIER_BANDS: TierBand[] = [
  { tier: "master", min: 82, label: "AX마스터", color: "#f59e0b", emoji: "👑", caption: "상위 0.1% 신뢰" },
  { tier: "builder", min: 65, label: "빌더", color: "#fbbf24", emoji: "🛠", caption: "커뮤니티를 만들어가요" },
  { tier: "activist", min: 38, label: "활동가", color: "#a78bfa", emoji: "🔥", caption: "활발하게 활동해요" },
  { tier: "contributor", min: 15, label: "기여자", color: "#60a5fa", emoji: "🌿", caption: "꾸준히 참여해요" },
  { tier: "sprout", min: 0, label: "새싹", color: "#34d399", emoji: "🌱", caption: "이제 막 시작했어요" },
];

export interface TrustContribution {
  key: string;
  label: string;
  count: number; // 표시용 신호 개수 (정체성은 0)
  weight: number;
  points: number; // 실제 기여 점수 (캡 반영)
}

/** stats → 신호별 기여 목록(캡 반영). breakdown/rawScore 공용. */
function contributionsOf(s: ActivityStats): TrustContribution[] {
  const verified = s.verifiedFormulaCount ?? 0;
  const completed = s.completedActivityCount ?? s.projectCount ?? 0;
  const unverified = Math.max(0, (s.formulaCount ?? 0) - verified);
  const identityRaw =
    (s.onboarded ? WEIGHTS.onboarded : 0) +
    (s.hasCompany ? WEIGHTS.company : 0) +
    (s.externalLinkCount ?? 0) * WEIGHTS.externalLink;

  return [
    { key: "verifiedFormula", label: "검증된 공식", count: verified, weight: WEIGHTS.verifiedFormula, points: verified * WEIGHTS.verifiedFormula },
    { key: "completion", label: "모임/스터디 완주", count: completed, weight: WEIGHTS.completion, points: completed * WEIGHTS.completion },
    { key: "articleFormula", label: "아티클→공식 변환", count: s.articleFormulaCount ?? 0, weight: WEIGHTS.articleFormula, points: (s.articleFormulaCount ?? 0) * WEIGHTS.articleFormula },
    { key: "saveReceived", label: "공식 저장받음", count: s.savesReceived ?? 0, weight: WEIGHTS.saveReceived, points: (s.savesReceived ?? 0) * WEIGHTS.saveReceived },
    { key: "memberSave", label: "멤버 하트", count: s.memberSaves ?? 0, weight: WEIGHTS.memberSave, points: (s.memberSaves ?? 0) * WEIGHTS.memberSave },
    { key: "follower", label: "팔로워", count: s.followerCount ?? 0, weight: WEIGHTS.follower, points: (s.followerCount ?? 0) * WEIGHTS.follower },
    { key: "likeReceived", label: "받은 좋아요", count: s.likesReceived ?? 0, weight: WEIGHTS.likeReceived, points: (s.likesReceived ?? 0) * WEIGHTS.likeReceived },
    { key: "commentReceived", label: "받은 댓글", count: s.commentsReceived ?? 0, weight: WEIGHTS.commentReceived, points: (s.commentsReceived ?? 0) * WEIGHTS.commentReceived },
    { key: "unverifiedFormula", label: "공식 작성", count: unverified, weight: WEIGHTS.unverifiedFormula, points: Math.min(unverified * WEIGHTS.unverifiedFormula, SELF_FORMULA_CAP) },
    { key: "selfComment", label: "댓글 작성", count: s.commentCount ?? 0, weight: WEIGHTS.selfComment, points: Math.min((s.commentCount ?? 0) * WEIGHTS.selfComment, SELF_COMMENT_CAP) },
    { key: "identity", label: "정체성 검증", count: 0, weight: 0, points: Math.min(identityRaw, IDENTITY_CAP) },
  ];
}

/** raw 가중합 (감속곡선 입력 전). */
export function rawScore(s: ActivityStats): number {
  return contributionsOf(s).reduce((sum, c) => sum + c.points, 0);
}

/** stats → 매너온도(0~100). 감속곡선으로 상한 점근. */
export function scoreFromStats(s: ActivityStats): number {
  const raw = rawScore(s);
  const score = TRUST_MAX * (raw / (raw + SATURATION_K));
  const clamped = Math.min(Math.max(score, 0), TRUST_MAX);
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
