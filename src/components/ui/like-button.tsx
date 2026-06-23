"use client";

import { useOptimistic, useTransition } from "react";
import type { ToggleLikeAction } from "./action-types";

export type LikeButtonProps = {
  postId: string;
  initialLiked: boolean;
  initialCount?: number;
  /** 서버액션 toggleLike (페이지에서 주입) */
  action: ToggleLikeAction;
  showCount?: boolean;
  size?: "sm" | "md";
  className?: string;
};

/** 좋아요 토글. reference.css 의 .btn.btn-ghost 스킨. useOptimistic 즉시 반영. */
export function LikeButton({
  postId,
  initialLiked,
  initialCount = 0,
  action,
  showCount = true,
  className,
}: LikeButtonProps) {
  const [pending, startTransition] = useTransition();
  const [state, setOptimistic] = useOptimistic(
    { liked: initialLiked, count: initialCount },
    (prev, next: boolean) => ({
      liked: next,
      count: prev.count + (next ? 1 : -1),
    }),
  );

  function onClick() {
    startTransition(async () => {
      setOptimistic(!state.liked);
      await action(postId);
    });
  }

  const cls = ["btn", "btn-ghost", state.liked ? "liked" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={state.liked}
      className={cls}
      style={state.liked ? { color: "#F03E3E" } : undefined}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={state.liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
      {showCount && <span className="tabular-nums">{state.count}</span>}
    </button>
  );
}
