"use client";

import Link from "next/link";
import type { FeedPost } from "@/lib/queries";
import { categories } from "@/lib/contract";
import { Chip, ShareButton } from "@/components/ui";
import { avaFor, initialOf } from "@/lib/ref-style";

/**
 * 프로필의 작성 공식 목록 — 레퍼런스 .grid > .fcard(아카이브 카드) 구조.
 * 커버 없는 텍스트 집중 카드. 공유는 ShareButton(card 변형).
 */
export function ProfileFormulaGrid({ posts }: { posts: FeedPost[] }) {
  return (
    <div className="grid">
      {posts.map((p) => (
        <FCard key={p.id} post={p} />
      ))}
    </div>
  );
}

function FCard({ post }: { post: FeedPost }) {
  const url = `/formula/${post.id}`;
  const catLabel = categories[post.category]?.label ?? post.category;
  const tool = post.formula?.tools?.[0] ?? post.tags?.[0];
  const summary = post.oneLiner ?? post.formula?.problem ?? "";

  return (
    <article className="fcard">
      <Link href={url} style={{ display: "contents" }}>
        <div className="fc-tags">
          <Chip>{catLabel}</Chip>
          {tool && <Chip tool>{tool}</Chip>}
        </div>
        <h3>{post.title}</h3>
        {summary && <p className="fc-sum">{summary}</p>}
        <div className="fc-foot">
          <span className="author">
            <span className={`avatar-sm ${avaFor(post.authorId)}`} aria-hidden>
              {initialOf(post.authorName)}
            </span>
            {post.authorName}
          </span>
          <span className="fc-stats">
            <span className="fc-stat">👁 {post.viewCount}</span>
            <span className="fc-stat">💬 {post.commentCount}</span>
            <span className="fc-stat">♥ {post.likeCount}</span>
          </span>
        </div>
      </Link>
      <ShareButton url={url} variant="card" />
    </article>
  );
}
