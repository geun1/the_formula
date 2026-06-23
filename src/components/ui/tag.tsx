export type TagProps = {
  label: string;
  className?: string;
};

/** 중립 톤 태그/키워드 칩 (KeywordChip 별칭 동일). 라이트 소프트 그레이 pill. */
export function Tag({ label, className }: TagProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-transparent bg-bg-2 px-2.5 py-0.5 text-xs font-medium text-t2 ${className ?? ""}`.trim()}
    >
      {label}
    </span>
  );
}

/** Tag 와 동일한 키워드 칩 별칭. */
export const KeywordChip = Tag;
export type KeywordChipProps = TagProps;
