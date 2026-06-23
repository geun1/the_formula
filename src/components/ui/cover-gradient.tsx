import type { ReactNode } from "react";
import { categories, type Category } from "@/lib/contract";
import { CATEGORY_COVER } from "./tones";

/** 문자열 → 안정 해시 (결정론적 그라데이션 각도 시드) */
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** 카테고리 없을 때 기본 블루 톤 */
const DEFAULT_COVER: [string, string] = ["#3b82f6", "#2563eb"];

export type CoverGradientProps = {
  /** 결정론적 시드 (post id 등) */
  seed: string;
  category?: Category;
  /** 좌하단/우상단 등에 올릴 오버레이 (칩 등) */
  children?: ReactNode;
  className?: string;
};

/**
 * 결정론적 블루 그라데이션 커버 (DESIGN §3). 카테고리별 블루 계열 톤 변주.
 * 이미지 없이 seed 로 각도만 흔들어 일관 + 약간의 다양성.
 */
export function CoverGradient({ seed, category, children, className }: CoverGradientProps) {
  const h = hash(seed);
  const [c1, c2] = category ? CATEGORY_COVER[category] : DEFAULT_COVER;
  const angle = 110 + (h % 60); // 110~170deg, 부드러운 대각선
  const label = category ? categories[category].label : "Formula";

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className ?? ""}`.trim()}
      style={{ background: `linear-gradient(${angle}deg, ${c1}, ${c2})` }}
    >
      <span className="select-none text-2xl font-black uppercase tracking-widest text-white/30">
        {label}
      </span>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" />
      {children}
    </div>
  );
}
