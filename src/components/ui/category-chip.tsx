import { categories, type Category } from "@/lib/contract";
import { CATEGORY_TONE, CATEGORY_ACTIVE_TONE } from "./tones";

export type CategoryChipProps = {
  category: Category;
  /** 활성(선택/필터) 상태면 accent-soft 톤 */
  active?: boolean;
  className?: string;
};

/** 카테고리 칩. DESIGN §2 — 중립 톤(작고 옅게), 활성 시 accent-soft. */
export function CategoryChip({ category, active = false, className }: CategoryChipProps) {
  const meta = categories[category];
  const tone = active ? CATEGORY_ACTIVE_TONE : CATEGORY_TONE;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${className ?? ""}`.trim()}
      style={{ backgroundColor: tone.bg, color: tone.text, borderColor: tone.border }}
    >
      {meta.label}
    </span>
  );
}
