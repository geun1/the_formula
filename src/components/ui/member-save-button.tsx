"use client";

import { useOptimistic, useTransition } from "react";
import type { ToggleMemberBookmarkAction } from "./action-types";

export type MemberSaveButtonProps = {
  targetUserId: string;
  initialSaved: boolean;
  /** 서버액션 toggleMemberBookmark (페이지에서 주입) */
  action: ToggleMemberBookmarkAction;
  /** 부모가 Link 일 때 네비 방지 */
  stopPropagation?: boolean;
  className?: string;
};

/**
 * 멤버(포뮬러) 저장 하트. reference.css 의 .dc-heart(.liked) 스킨.
 * 카드 우상단 아이콘 토글, useOptimistic 즉시 반영.
 */
export function MemberSaveButton({
  targetUserId,
  initialSaved,
  action,
  stopPropagation = true,
  className,
}: MemberSaveButtonProps) {
  const [pending, startTransition] = useTransition();
  const [saved, setOptimistic] = useOptimistic(
    initialSaved,
    (_prev, next: boolean) => next,
  );

  function onClick(e: React.MouseEvent) {
    if (stopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }
    startTransition(async () => {
      setOptimistic(!saved);
      await action(targetUserId);
    });
  }

  const cls = ["dc-heart", saved ? "liked" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? "멤버 저장 취소" : "멤버 저장"}
      title={saved ? "저장됨" : "멤버 저장"}
      className={cls}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
    </button>
  );
}
