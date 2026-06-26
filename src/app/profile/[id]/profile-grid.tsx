"use client";
// 프로필 공식 그리드 — 3개까지 접힌 상태, 더보기로 전체 펼침.

import { useState } from "react";
import Link from "next/link";
import type { FeedPost } from "@/lib/queries";
import { categories } from "@/lib/contract";
import { Chip, ShareButton } from "@/components/ui";

const COLLAPSE_COUNT = 3;

export function ProfileFormulaGrid({ posts }: { posts: FeedPost[] }) {
  const [cat, setCat] = useState<string>("all");
  const [expanded, setExpanded] = useState(false);

  // posts에 실제 존재하는 카테고리만
  const cats = Array.from(new Set(posts.map((p) => p.category)));

  const filtered = cat === "all" ? posts : posts.filter((p) => p.category === cat);
  const visible = expanded ? filtered : filtered.slice(0, COLLAPSE_COUNT);
  const hidden = filtered.length - COLLAPSE_COUNT;

  // 카테고리 바뀌면 더보기 접기 초기화
  function selectCat(c: string) {
    setCat(c);
    setExpanded(false);
  }

  return (
    <div>
      {cats.length > 1 && (
        <div className="grid-cats">
          <button className={`grid-cat${cat === "all" ? " active" : ""}`} onClick={() => selectCat("all")}>전체</button>
          {cats.map((c) => (
            <button key={c} className={`grid-cat${cat === c ? " active" : ""}`} onClick={() => selectCat(c)}>
              {categories[c as keyof typeof categories]?.label ?? c}
            </button>
          ))}
        </div>
      )}
      <div className="grid">
        {visible.map((p) => (
          <FCard key={p.id} post={p} />
        ))}
      </div>
      {hidden > 0 && (
        <button className="grid-more" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "접기" : `더보기 +${hidden}`}
        </button>
      )}
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
          <span className="fc-stats">
            <span className="fc-stat">조회 {post.viewCount}</span>
            <span className="fc-stat">댓글 {post.commentCount}</span>
            <span className="fc-stat">좋아요 {post.likeCount}</span>
          </span>
        </div>
      </Link>
      <ShareButton url={url} variant="card" />
    </article>
  );
}
