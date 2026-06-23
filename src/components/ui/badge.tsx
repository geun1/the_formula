import type { ReactNode } from "react";

export type BadgeTone = "study" | "proj";

export type BadgeProps = {
  children: ReactNode;
  /** 모임 종류 톤: study(블루) / proj(퍼플). 미지정 시 기본(.badge) */
  tone?: BadgeTone;
  className?: string;
};

/** 뱃지. reference.css 의 .badge / .badge.study / .badge.proj 스킨. */
export function Badge({ children, tone, className }: BadgeProps) {
  const cls = ["badge", tone ?? "", className].filter(Boolean).join(" ");
  return <span className={cls}>{children}</span>;
}
