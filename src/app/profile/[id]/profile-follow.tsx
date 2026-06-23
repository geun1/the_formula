"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { MemberSaveButton, type ToggleResult } from "@/components/ui";
import { toggleFollow, toggleMemberBookmark } from "@/app/actions";

/**
 * 프로필 상단 액션 묶음 — 레퍼런스 .profile-actions(.btn) 룩.
 * 팔로우(btn-primary) + 채팅 요청(btn-ghost) + 멤버저장 하트(.dc-heart).
 * 팔로우는 useOptimistic 으로 즉시 반영하고, 저장은 공유 MemberSaveButton 에 위임해요.
 */
export function ProfileActions({
  targetUserId,
  targetName,
  initialFollowing,
  initialSaved = false,
}: {
  targetUserId: string;
  targetName: string;
  initialFollowing: boolean;
  initialSaved?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [following, setOptimistic] = useOptimistic(
    initialFollowing,
    (_prev, next: boolean) => next,
  );

  function onFollow() {
    startTransition(async () => {
      setOptimistic(!following);
      await toggleFollow(targetUserId);
    });
  }

  async function saveAction(id: string): Promise<ToggleResult> {
    const res = await toggleMemberBookmark(id);
    if (res.ok) return { active: res.data?.saved ?? false };
    return { active: initialSaved };
  }

  return (
    <div className="profile-actions">
      <button
        type="button"
        onClick={onFollow}
        disabled={pending}
        aria-pressed={following}
        className={`btn ${following ? "btn-ghost" : "btn-primary"}`}
      >
        {following ? "팔로잉" : "팔로우"}
      </button>
      <Link
        href={`/chat?to=${encodeURIComponent(targetUserId)}`}
        aria-label={`${targetName}님과 채팅`}
        className="btn btn-ghost"
      >
        채팅 요청
      </Link>
      <MemberSaveButton
        targetUserId={targetUserId}
        initialSaved={initialSaved}
        action={saveAction}
        stopPropagation={false}
      />
    </div>
  );
}
