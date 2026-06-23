import Link from "next/link";
import { Avatar } from "./avatar";
import { GradeBadge } from "./grade-badge";
import { ChatButton } from "./chat-button";
import { DetailFollow } from "./detail-follow";
import type { ProfileLite, FeedPost } from "@/lib/queries";

export type AuthorSidebarProps = {
  author: ProfileLite;
  /** 뷰어가 이 작성자를 팔로우 중인지 */
  isFollowing: boolean;
  /** 작성자의 다른 공식 목록 */
  otherPosts: FeedPost[];
  /** 본인 글이면 팔로우/채팅 숨김 */
  isMe: boolean;
  /** 비로그인이면 팔로우/채팅 대신 로그인 안내 */
  loggedIn: boolean;
};

/**
 * 상세 우측 사이드바 (REFERENCE_DIFF §A-2 #7):
 * 작성자 카드 + 프로필 보기 + 팔로우 + 채팅 + "작성자의 다른 공식".
 * 서버 컴포넌트(팔로우/채팅만 client 위임).
 */
export function AuthorSidebar({
  author,
  isFollowing,
  otherPosts,
  isMe,
  loggedIn,
}: AuthorSidebarProps) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-28">
      {/* 작성자 카드 */}
      <div className="rounded-[16px] border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <Avatar id={author.id} name={author.name} src={author.image} size={48} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[15px] font-bold text-t1">
                {author.name}
              </span>
              <GradeBadge tier={author.tier} score={author.trustScore} />
            </div>
            <p className="truncate text-xs text-t3">
              {author.jobRole ?? author.role}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          <Link
            href={`/profile/${author.id}`}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border-2 bg-surface text-sm font-semibold text-t2 transition-colors hover:bg-card-hover hover:text-t1"
          >
            프로필 보기
          </Link>

          {!isMe &&
            (loggedIn ? (
              <div className="flex gap-2">
                <DetailFollow
                  targetUserId={author.id}
                  initialFollowing={isFollowing}
                  size="md"
                  className="flex-1"
                />
                <ChatButton
                  targetUserId={author.id}
                  targetName={author.name}
                  size="md"
                  className="flex-1"
                />
              </div>
            ) : (
              <a
                href="/account"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                로그인하고 팔로우·채팅
              </a>
            ))}
        </div>
      </div>

      {/* 작성자의 다른 공식 */}
      {otherPosts.length > 0 && (
        <div className="rounded-[16px] border border-border bg-card p-5 shadow-soft">
          <h2 className="text-sm font-bold text-t1">작성자의 다른 공식</h2>
          <ul className="mt-3 space-y-1">
            {otherPosts.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/formula/${p.id}`}
                  className="group block rounded-xl px-3 py-2.5 transition-colors hover:bg-card-hover"
                >
                  <p className="line-clamp-2 text-sm font-medium leading-snug text-t1 transition-colors group-hover:text-accent">
                    {p.title}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-xs tabular-nums text-t3">
                    <span>🔖 {p.saveCount}</span>
                    <span>👁 {p.viewCount}</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
