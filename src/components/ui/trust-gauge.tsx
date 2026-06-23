import { TRUST_BASE, TRUST_MAX, gaugeRatio, tierBandFor } from "@/lib/trust";

export type TrustGaugeProps = {
  /** 36.5 ~ 99 */
  score: number;
  /** 점수/등급 캡션 표시 */
  showLabel?: boolean;
  className?: string;
};

/** 신뢰온도 게이지 (36.5°~99°). 등급 색으로 채움. */
export function TrustGauge({ score, showLabel = true, className }: TrustGaugeProps) {
  const ratio = gaugeRatio(score);
  const band = tierBandFor(score);

  return (
    <div className={className}>
      {showLabel && (
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-sm font-semibold" style={{ color: band.color }}>
            {band.emoji} {band.label}
          </span>
          <span className="tabular-nums text-sm font-bold" style={{ color: band.color }}>
            {score}°
          </span>
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-border/60"
        role="meter"
        aria-valuemin={TRUST_BASE}
        aria-valuemax={TRUST_MAX}
        aria-valuenow={score}
        aria-label="신뢰온도"
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.max(ratio * 100, 4)}%`,
            background: `linear-gradient(90deg, ${band.color}99, ${band.color})`,
          }}
        />
      </div>
      {showLabel && (
        <p className="mt-1 text-xs text-muted">{band.caption}</p>
      )}
    </div>
  );
}
