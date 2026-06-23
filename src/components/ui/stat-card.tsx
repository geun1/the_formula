import type { ReactNode } from "react";

export type StatCardProps = {
  label: string;
  value: ReactNode;
  /** 보조 설명/단위 */
  hint?: string;
  icon?: ReactNode;
  className?: string;
};

/** 통계 카드 (공식수·저장받은수·팔로워 등). */
export function StatCard({ label, value, hint, icon, className }: StatCardProps) {
  return (
    <div
      className={`rounded-[16px] border border-border bg-card p-5 shadow-soft ${className ?? ""}`.trim()}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-t2">{label}</span>
        {icon && <span className="text-t3">{icon}</span>}
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-accent">{value}</div>
      {hint && <p className="mt-1 text-xs text-t3">{hint}</p>}
    </div>
  );
}
