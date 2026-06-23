import type { Comment } from "@/lib/contract";
import { Avatar } from "./avatar";
import { GradeBadge } from "./grade-badge";
import { EmptyState } from "./empty-state";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR");
}

export type CommentItemProps = {
  comment: Comment;
  className?: string;
};

/** 단일 댓글: 아바타·작성자·등급뱃지·시간·본문. */
export function CommentItem({ comment, className }: CommentItemProps) {
  return (
    <li className={`flex gap-3 ${className ?? ""}`.trim()}>
      <Avatar
        id={comment.userId}
        name={comment.authorName}
        src={comment.authorImage}
        size={36}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{comment.authorName}</span>
          <GradeBadge tier={comment.authorTier} iconOnly />
          <span className="text-xs text-muted">{timeAgo(comment.createdAt)}</span>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {comment.body}
        </p>
      </div>
    </li>
  );
}

export type CommentListProps = {
  comments: Comment[];
  className?: string;
};

/** 댓글 목록. 비어있으면 EmptyState. */
export function CommentList({ comments, className }: CommentListProps) {
  if (comments.length === 0) {
    return (
      <EmptyState
        icon="💬"
        title="아직 댓글이 없어요"
        description="이 공식에 첫 피드백을 남겨보세요."
        className={className}
      />
    );
  }

  return (
    <ul className={`space-y-5 ${className ?? ""}`.trim()}>
      {comments.map((c) => (
        <CommentItem key={c.id} comment={c} />
      ))}
    </ul>
  );
}
