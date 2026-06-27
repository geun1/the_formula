"use client";

import Link from "next/link";
import type { MemberCard } from "@/lib/queries";
import {
  Avatar,
  Chip,
  GradeBadge,
  FollowButton,
  ChatButton,
  MemberSaveButton,
  type ToggleResult,
} from "@/components/ui";
import { toggleMemberBookmark, toggleFollow } from "@/app/actions";

/**
 * 포뮬러(멤버) 디렉토리 그리드 — 레퍼런스 .dir-grid > .dir-card 구조.
 * 멤버저장 하트·팔로우·채팅은 공유 컴포넌트로, 서버액션을 ToggleResult 로 감싸 주입해요.
 */
export function MemberDirGrid({ members }: { members: MemberCard[] }) {
  return (
    <div className="dir-grid">
      {members.map((m) => (
        <DirCard key={m.id} member={m} />
      ))}
    </div>
  );
}

function DirCard({ member }: { member: MemberCard }) {
  const role = [member.jobRole ?? member.role, member.company]
    .filter(Boolean)
    .join(" · ");

  async function saveAction(id: string): Promise<ToggleResult> {
    const res = await toggleMemberBookmark(id);
    if (res.ok) return { active: res.data?.saved ?? false };
    return { active: member.isBookmarked };
  }

  async function followAction(id: string): Promise<ToggleResult> {
    const res = await toggleFollow(id);
    if (res.ok) return { active: res.data?.following ?? false };
    return { active: false };
  }

  return (
    <article className="dir-card">
      <div className="dc-body">
        <div className="dc-top">
          <Link href={`/profile/${member.id}`} aria-label={`${member.name} 프로필`}>
            <Avatar id={member.id} name={member.name} src={member.image} variant="dc" />
          </Link>
          <div className="dc-top-info">
            <div className="dc-name">
              <Link href={`/profile/${member.id}`}>{member.name}</Link>{" "}
              <GradeBadge tier={member.tier} iconOnly />
            </div>
            {role && <div className="dc-role">{role}</div>}
          </div>
          <MemberSaveButton
            targetUserId={member.id}
            initialSaved={member.isBookmarked}
            action={saveAction}
            stopPropagation={false}
          />
        </div>

        {member.bio && <p className="dc-bio">{member.bio}</p>}

        {member.interests.length > 0 && (
          <div className="dc-tags">
            {member.interests.slice(0, 3).map((it) => (
              <Chip key={it}>{it}</Chip>
            ))}
          </div>
        )}

        <div className="dc-stats">
          <span className="dc-stat">공식 {member.formulaCount}</span>
          <span className="dc-stat">저장 {member.saveCount}</span>
        </div>

        <div className="dc-actions">
          <FollowButton
            targetUserId={member.id}
            initialFollowing={member.isFollowing}
            action={followAction}
            variant="dc"
          />
          <ChatButton targetUserId={member.id} targetName={member.name} variant="dc" />
        </div>
      </div>
    </article>
  );
}
