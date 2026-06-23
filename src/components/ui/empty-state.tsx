import type { ReactNode } from "react";
import { Button } from "./button";

export type EmptyStateProps = {
  title: string;
  description?: string;
  /** 이모지/아이콘 */
  icon?: ReactNode;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
};

/** 빈 상태 플레이스홀더. */
export function EmptyState({
  title,
  description,
  icon = "🗂",
  actionLabel,
  actionHref,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-[16px] border border-dashed border-border-2 bg-card px-6 py-16 text-center ${className ?? ""}`.trim()}
    >
      <div className="text-4xl" aria-hidden>
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-t1">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-t2">{description}</p>
      )}
      {actionLabel && actionHref && (
        <Button href={actionHref} variant="ghost" size="md" className="mt-6">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
