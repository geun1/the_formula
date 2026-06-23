export type SkeletonProps = {
  className?: string;
};

/** 로딩 스켈레톤 블록. */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-bg-2 ${className ?? ""}`.trim()}
      aria-hidden
    />
  );
}

/** FormulaCard 자리표시 스켈레톤. */
export function CardSkeleton({ className }: SkeletonProps) {
  return (
    <div
      className={`overflow-hidden rounded-[16px] border border-border bg-card shadow-soft ${className ?? ""}`.trim()}
    >
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
