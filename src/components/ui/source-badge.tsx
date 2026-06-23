import type { AuthorType } from "@/lib/contract";

export type SourceBadgeProps = {
  authorType: AuthorType;
  /** 출처명 (예: 매체명). agent 큐레이션이면 생략 가능 */
  sourceName?: string | null;
  className?: string;
};

/** 출처/AI 큐레이션 뱃지. authorType==='agent' → "AI 큐레이션". */
export function SourceBadge({ authorType, sourceName, className }: SourceBadgeProps) {
  const isAgent = authorType === "agent";
  const label = isAgent ? "AI 큐레이션" : sourceName ?? "멤버 작성";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold backdrop-blur-sm ${
        isAgent
          ? "border-transparent bg-accent-soft/95 text-accent"
          : "border-border bg-white/90 text-t2"
      } ${className ?? ""}`.trim()}
    >
      {isAgent && <span aria-hidden>✦</span>}
      {label}
    </span>
  );
}
