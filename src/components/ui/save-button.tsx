"use client";

import { useOptimistic, useTransition } from "react";
import type { ToggleBookmarkAction } from "./action-types";

export type SaveButtonProps = {
  postId: string;
  initialSaved: boolean;
  initialCount?: number;
  /** 서버액션 toggleBookmark (페이지에서 주입) */
  action: ToggleBookmarkAction;
  /** 카운트 표시 여부 */
  showCount?: boolean;
  size?: "sm" | "md";
  className?: string;
};

/**
 * 공식 저장(북마크) 토글. reference.css 의 .btn.btn-primary(.saved) 스킨.
 * useOptimistic 으로 즉시 반영 후 서버액션 호출.
 */
export function SaveButton({
  postId,
  initialSaved,
  initialCount = 0,
  action,
  showCount = true,
  className,
}: SaveButtonProps) {
  const [pending, startTransition] = useTransition();
  const [state, setOptimistic] = useOptimistic(
    { saved: initialSaved, count: initialCount },
    (prev, next: boolean) => ({
      saved: next,
      count: prev.count + (next ? 1 : -1),
    }),
  );

  function onClick() {
    startTransition(async () => {
      setOptimistic(!state.saved);
      await action(postId);
    });
  }

  const cls = ["btn", "btn-primary", state.saved ? "saved" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={state.saved}
      className={cls}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={state.saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
      </svg>
      {state.saved ? "저장됨" : "공식 저장"}
      {showCount && <span className="tabular-nums">{state.count}</span>}
    </button>
  );
}
