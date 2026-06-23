import { TIER_BANDS } from "@/lib/trust";
import type { Tier } from "@/lib/contract";

export type GradeBadgeProps = {
  tier: Tier;
  /** 점수 표기 여부 (있으면 라벨 옆 °C 톤으로 표시) */
  score?: number;
  size?: "sm" | "md";
  /** 라벨 텍스트 숨기고 이모지만 (예: 아바타 옆) */
  iconOnly?: boolean;
  className?: string;
};

function bandFor(tier: Tier) {
  return TIER_BANDS.find((b) => b.tier === tier) ?? TIER_BANDS[TIER_BANDS.length - 1];
}

/** 신뢰 등급 뱃지. TIER_BANDS 의 색/이모지/라벨 사용. */
export function GradeBadge({
  tier,
  score,
  size = "sm",
  iconOnly = false,
  className,
}: GradeBadgeProps) {
  const band = bandFor(tier);
  const pad = size === "sm" ? "px-2 py-0.5 text-xs gap-1" : "px-2.5 py-1 text-sm gap-1.5";

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${pad} ${className ?? ""}`.trim()}
      style={{
        color: band.color,
        borderColor: `${band.color}40`,
        backgroundColor: `${band.color}14`,
      }}
      title={band.caption}
    >
      <span aria-hidden>{band.emoji}</span>
      {!iconOnly && <span>{band.label}</span>}
      {!iconOnly && score !== undefined && (
        <span className="tabular-nums opacity-70">{score}°</span>
      )}
    </span>
  );
}
