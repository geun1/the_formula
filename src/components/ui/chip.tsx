import type { ReactNode } from "react";

export type ChipProps = {
  children: ReactNode;
  /** true = 툴 칩(.chip.tool, 블루 틴트) */
  tool?: boolean;
  className?: string;
};

/** 칩. reference.css 의 .chip / .chip.tool 스킨. */
export function Chip({ children, tool = false, className }: ChipProps) {
  const cls = ["chip", tool ? "tool" : "", className].filter(Boolean).join(" ");
  return <span className={cls}>{children}</span>;
}
