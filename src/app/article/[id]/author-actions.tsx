"use client";

import {
  FollowButton,
  ChatButton,
  type ToggleResult,
} from "@/components/ui";
import { toggleFollow } from "@/app/actions";

export type AuthorActionsProps = {
  authorId: string;
  authorName: string;
  initialFollowing: boolean;
};

/**
 * 상세 우측 author-card 의 .ac-actions — reference.css 의 .ac-follow + .ac-coffee 스킨.
 * 팔로우(ac variant) + 채팅(ac variant). toggleFollow → ToggleResult 어댑트.
 */
export function AuthorActions({
  authorId,
  authorName,
  initialFollowing,
}: AuthorActionsProps) {
  async function followAction(id: string): Promise<ToggleResult> {
    const res = await toggleFollow(id);
    if (res.ok) return { active: res.data?.following ?? false };
    return { active: initialFollowing };
  }

  return (
    <div className="ac-actions">
      <FollowButton
        targetUserId={authorId}
        initialFollowing={initialFollowing}
        action={followAction}
        variant="ac"
      />
      <ChatButton
        targetUserId={authorId}
        targetName={authorName}
        variant="ac"
      />
    </div>
  );
}
