import Link from "next/link";
import type { Post, Tier } from "@/lib/contract";
import { CategoryChip } from "./category-chip";
import { GradeBadge } from "./grade-badge";
import { SourceBadge } from "./source-badge";
import { CoverGradient } from "./cover-gradient";
import { ToolBadge } from "./tool-badge";
import { Avatar } from "./avatar";
import { ShareButton } from "./share-button";
import { VERIFIED_TONE } from "./tones";

export type FormulaCardProps = {
  post: Post;
  /** post 별 bookmark 집계 (read-time) */
  saveCount?: number;
  /** 작성자 등급 (멤버 join 시) */
  authorTier?: Tier;
  /** 작성자 아바타 src */
  authorImage?: string | null;
  /** href override (기본: /formula/[id]) */
  href?: string;
  className?: string;
};

function StatIcon({ icon, count }: { icon: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <span aria-hidden>{icon}</span>
      {count}
    </span>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

/**
 * 아티클/아카이브 공용 카드 (DESIGN §3).
 * 컬러 그라데이션 커버 + 좌하단 툴 뱃지 pill + 작성자·날짜 → 제목 → 설명 → 칩 + ♥.
 */
export function FormulaCard({
  post,
  saveCount = 0,
  authorTier,
  authorImage,
  href,
  className,
}: FormulaCardProps) {
  const isCardnews = post.postType === "cardnews";
  const url = href ?? `/formula/${post.id}`;

  const summary = isCardnews
    ? post.cardnews?.summary ?? post.oneLiner ?? ""
    : post.oneLiner ?? post.formula?.problem ?? "";

  const cover = isCardnews ? post.cardnews?.coverImageUrl : undefined;

  // 커버 좌하단 툴 뱃지: formula.tools 우선, 없으면 첫 키워드
  const tool =
    post.formula?.tools?.[0] ??
    (isCardnews ? post.cardnews?.keywords?.[0] : undefined) ??
    post.tags?.[0];

  return (
    <Link
      href={url}
      className={`card-lift group flex flex-col overflow-hidden rounded-[16px] border border-border bg-card shadow-soft hover:border-accent/30 ${className ?? ""}`.trim()}
    >
      {/* Cover */}
      <div className="relative h-40 w-full">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <CoverGradient seed={post.id} category={post.category} className="h-full w-full" />
        )}
        {isCardnews && (
          <div className="absolute right-3 top-3">
            <SourceBadge authorType={post.authorType} sourceName={post.sourceName} />
          </div>
        )}
        {/* 좌하단 툴 뱃지 pill */}
        {tool && (
          <div className="absolute bottom-3 left-3">
            <ToolBadge tool={tool} onCover />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        {/* 작성자 · 날짜 */}
        <div className="flex items-center gap-2 text-xs text-muted">
          <Avatar id={post.authorId} name={post.authorName} src={authorImage} size={20} />
          <span className="truncate font-medium">{post.authorName}</span>
          {authorTier && <GradeBadge tier={authorTier} iconOnly />}
          <span className="text-muted-soft">·</span>
          <span className="shrink-0 text-muted-soft">{formatDate(post.createdAt)}</span>
        </div>

        <h3 className="mt-2.5 line-clamp-2 text-base font-bold leading-snug tracking-tight transition-colors group-hover:text-accent">
          {post.title}
        </h3>
        {summary && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{summary}</p>
        )}

        {/* 하단: 카테고리 + 검증 칩 (좌) / ♥ 카운트 (우) */}
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-border-soft pt-3">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <CategoryChip category={post.category} />
            {post.verified && (
              <span
                className="inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: VERIFIED_TONE.bg,
                  color: VERIFIED_TONE.text,
                  borderColor: VERIFIED_TONE.border,
                }}
              >
                ✓ 검증됨
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2.5 text-xs text-t3">
            <StatIcon icon="👁" count={post.viewCount} />
            <StatIcon icon="💬" count={post.commentCount} />
            <StatIcon icon="♥" count={post.likeCount} />
            <StatIcon icon="🔖" count={saveCount} />
            <ShareButton url={url} iconOnly />
          </div>
        </div>
      </div>
    </Link>
  );
}
