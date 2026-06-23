"use client";

import { useOptimistic, useTransition } from "react";
import type { ToggleFollowAction } from "./action-types";

export type FollowButtonProps = {
  targetUserId: string;
  initialFollowing: boolean;
  /** 서버액션 toggleFollow (페이지에서 주입) */
  action: ToggleFollowAction;
  /** 레퍼런스 스킨: dc=멤버카드(.dc-follow) / ac=상세 사이드바(.ac-follow) */
  variant?: "dc" | "ac";
  size?: "sm" | "md";
  className?: string;
};

/** 팔로우 토글 버튼. reference.css 의 .dc-follow/.ac-follow 스킨. useOptimistic 즉시 반영. */
export function FollowButton({
  targetUserId,
  initialFollowing,
  action,
  variant = "dc",
  className,
}: FollowButtonProps) {
  const [pending, startTransition] = useTransition();
  const [following, setOptimistic] = useOptimistic(
    initialFollowing,
    (_prev, next: boolean) => next,
  );

  function onClick(e: React.MouseEvent) {
    // 카드 전체가 Link 인 경우 네비 방지
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      setOptimistic(!following);
      await action(targetUserId);
    });
  }

  const base = variant === "ac" ? "ac-follow" : "dc-follow";
  const cls = [base, following ? "following" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={following}
      className={cls}
    >
      {following ? "팔로잉" : "팔로우"}
    </button>
  );
}
