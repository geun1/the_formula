import Link from "next/link";
import type { ReactNode } from "react";

export type SectionHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  /** 우측 "더 보기" 등 액션 링크 */
  actionLabel?: string;
  actionHref?: string;
  className?: string;
};

/** 섹션 헤더: 제목 + 설명 + 우측 액션 링크. */
export function SectionHeader({
  title,
  description,
  actionLabel,
  actionHref,
  className,
}: SectionHeaderProps) {
  return (
    <div className={`flex items-end justify-between gap-4 ${className ?? ""}`.trim()}>
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-t1 md:text-3xl">{title}</h2>
        {description && <p className="mt-2 text-sm text-t2">{description}</p>}
      </div>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="shrink-0 text-sm font-medium text-accent transition-colors hover:text-accent-hover"
        >
          {actionLabel} →
        </Link>
      )}
    </div>
  );
}
