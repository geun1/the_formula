"use client";

import { FollowButton, type ToggleResult } from "@/components/ui";
import { toggleFollow } from "@/app/actions";

export type DetailFollowProps = {
  targetUserId: string;
  initialFollowing: boolean;
  size?: "sm" | "md";
  className?: string;
};

/**
 * 상세 우측 사이드바 팔로우 버튼.
 * 서버액션 toggleFollow(ActionResult<{following}>) 를 공유 FollowButton 이 기대하는
 * ToggleResult({active}) 시그니처로 맞춰주는 얇은 어댑터.
 */
export function DetailFollow({
  targetUserId,
  initialFollowing,
  size = "sm",
  className,
}: DetailFollowProps) {
  async function action(id: string): Promise<ToggleResult> {
    const res = await toggleFollow(id);
    if (res.ok) return { active: res.data?.following ?? false };
    return { active: initialFollowing };
  }

  return (
    <FollowButton
      targetUserId={targetUserId}
      initialFollowing={initialFollowing}
      action={action}
      size={size}
      className={className}
    />
  );
}
