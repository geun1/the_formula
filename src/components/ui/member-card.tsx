import Link from "next/link";
import type { User } from "@/lib/contract";
import type {
  ToggleFollowAction,
  ToggleMemberBookmarkAction,
} from "./action-types";
import { Avatar } from "./avatar";
import { GradeBadge } from "./grade-badge";
import { Tag } from "./tag";
import { FollowButton } from "./follow-button";
import { ChatButton } from "./chat-button";
import { MemberSaveButton } from "./member-save-button";

export type MemberCardProps = {
  member: User;
  /** 작성 공식 수 (없으면 activityStats.formulaCount) */
  formulaCount?: number;
  /** 받은 저장 수 */
  savedCount?: number;
  /** 멤버 저장 하트 — action 주입 시 노출 */
  memberSaveAction?: ToggleMemberBookmarkAction;
  initialSaved?: boolean;
  /** 팔로우 — action 주입 시 노출 */
  followAction?: ToggleFollowAction;
  initialFollowing?: boolean;
  /** 채팅 버튼 노출 여부 (기본 followAction 있으면 true) */
  showChat?: boolean;
  className?: string;
};

/**
 * 포뮬러(멤버) 카드 — 토스풍 (REFERENCE_DIFF §A-2-8).
 * 아바타+이름+직무 + 멤버저장(하트) + bio + 관심칩 + 공식 N·저장 N + 팔로우 + 채팅.
 */
export function MemberCard({
  member,
  formulaCount,
  savedCount = 0,
  memberSaveAction,
  initialSaved = false,
  followAction,
  initialFollowing = false,
  showChat,
  className,
}: MemberCardProps) {
  const formulas = formulaCount ?? member.activityStats.formulaCount;
  const subtitle = [member.jobRole ?? member.role, member.company]
    .filter(Boolean)
    .join(" · ");
  const chat = showChat ?? Boolean(followAction);

  return (
    <div
      className={`card-lift flex flex-col rounded-[16px] border border-border bg-card p-5 shadow-soft ${className ?? ""}`.trim()}
    >
      {/* 헤더: 아바타 + 이름/직무 + 저장 하트 */}
      <div className="flex items-start gap-3">
        <Link href={`/profile/${member.id}`} className="shrink-0">
          <Avatar id={member.id} name={member.name} src={member.image} size={48} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/profile/${member.id}`}
              className="truncate font-bold text-t1 transition-colors hover:text-accent"
            >
              {member.name}
            </Link>
            <GradeBadge tier={member.tier} iconOnly />
          </div>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-t3">{subtitle}</p>
          )}
        </div>
        {memberSaveAction && (
          <MemberSaveButton
            targetUserId={member.id}
            initialSaved={initialSaved}
            action={memberSaveAction}
            stopPropagation={false}
          />
        )}
      </div>

      {/* bio */}
      {member.bio && (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-t2">
          {member.bio}
        </p>
      )}

      {/* 관심 칩 */}
      {member.interests.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {member.interests.slice(0, 3).map((it) => (
            <Tag key={it} label={it} />
          ))}
        </div>
      )}

      {/* 공식 N · 저장 N */}
      <div className="mt-4 flex items-center gap-4 border-t border-border-soft pt-3 text-xs text-t2">
        <span className="tabular-nums">
          공식 <b className="font-bold text-t1">{formulas}</b>
        </span>
        <span className="tabular-nums">
          저장 <b className="font-bold text-t1">{savedCount}</b>
        </span>
      </div>

      {/* 팔로우 + 채팅 */}
      {(followAction || chat) && (
        <div className="mt-4 flex items-center gap-2">
          {followAction && (
            <FollowButton
              targetUserId={member.id}
              initialFollowing={initialFollowing}
              action={followAction}
              size="sm"
              className="flex-1"
            />
          )}
          {chat && (
            <ChatButton
              targetUserId={member.id}
              targetName={member.name}
              size="sm"
              variant="ghost"
              className="flex-1"
            />
          )}
        </div>
      )}
    </div>
  );
}
