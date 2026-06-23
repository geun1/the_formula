import Link from "next/link";
import type { Post } from "@/lib/contract";
import { CategoryChip } from "./category-chip";
import { ToolBadge } from "./tool-badge";

export type PopularTop5Props = {
  /** 상위 5개 글 (이미 정렬된 상태로 주입) */
  posts: Post[];
  /** 우상단 라벨 (기본 "이번 주") */
  periodLabel?: string;
  /** 카드 href 매핑 (기본 /formula/[id]) */
  hrefFor?: (post: Post) => string;
  className?: string;
};

function Rank({ post, index, href }: { post: Post; index: number; href: string }) {
  const tool =
    post.formula?.tools?.[0] ?? post.cardnews?.keywords?.[0] ?? post.tags?.[0];
  return (
    <Link
      href={href}
      className="group flex min-w-0 flex-1 flex-col gap-2 rounded-xl p-3 transition-colors hover:bg-accent-soft"
    >
      <span className="text-2xl font-black tabular-nums text-accent">{index + 1}</span>
      <div className="flex flex-wrap items-center gap-1">
        <CategoryChip category={post.category} />
        {tool && <ToolBadge tool={tool} />}
      </div>
      <h3 className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight text-t1 transition-colors group-hover:text-accent">
        {post.title}
      </h3>
      <div className="mt-auto flex items-center justify-between gap-2 text-xs text-t3">
        <span className="truncate">{post.authorName}</span>
        <span className="flex shrink-0 items-center gap-2 tabular-nums">
          <span>👁 {post.viewCount}</span>
          <span>♥ {post.likeCount}</span>
        </span>
      </div>
    </Link>
  );
}

/** 인기 글 TOP 5 (DESIGN §5-2). 흰 카드 한 줄(5칸), 큰 블루 숫자. */
export function PopularTop5({
  posts,
  periodLabel = "이번 주",
  hrefFor,
  className,
}: PopularTop5Props) {
  const top = posts.slice(0, 5);
  if (top.length === 0) return null;

  return (
    <section
      className={`rounded-[16px] border border-border bg-card p-5 shadow-lift ${className ?? ""}`.trim()}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold tracking-tight text-t1">인기 글 TOP 5</h2>
        <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">
          {periodLabel}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-5">
        {top.map((p, i) => (
          <Rank
            key={p.id}
            post={p}
            index={i}
            href={hrefFor ? hrefFor(p) : `/formula/${p.id}`}
          />
        ))}
      </div>
    </section>
  );
}
