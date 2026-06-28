import type { Metadata } from "next";
import Link from "next/link";
import { ShareButton, ListSearch } from "@/components/ui";
import { getArchives, type ArchiveParams, type FeedPost } from "@/lib/queries";
import { categories, type Category } from "@/lib/contract";
import { avaFor, initialOf, fmtCount } from "@/lib/ref-style";
import { ArchiveSortSelect, type ArchiveSortValue } from "./archive-sort-select";

export const metadata: Metadata = {
  title: "아카이브 · The Formula",
  description:
    "직무·도구·업무유형·난이도로 탐색하는 AX 실전 공식 모음이에요. 검색하고 저장하고 따라해 보세요.",
};

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** 아카이브 좌측 네비 카테고리(레퍼런스 .dir-nav). value=jobRole 필터값(한국어). */
const NAV_CATS: { label: string; value: string | null; icon: React.ReactNode }[] = [
  {
    label: "전체",
    value: null,
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: "기획",
    value: "기획",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    label: "디자인",
    value: "디자인",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
      </svg>
    ),
  },
  {
    label: "마케팅",
    value: "마케팅",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    label: "개발",
    value: "개발",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    label: "데이터",
    value: "데이터",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
  },
];

const VIEW_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const COMMENT_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);
const LIKE_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.5 1-1a5.5 5.5 0 0 0 0-7.9z" />
  </svg>
);

function ArchiveCard({ post }: { post: FeedPost }) {
  const cat = categories[post.category as Category]?.label ?? post.category;
  const tool = post.formula?.tools?.[0] ?? null;
  const summary = post.oneLiner ?? post.formula?.result ?? "";
  return (
    <article className="fcard" style={{ position: "relative" }}>
      {/* 카드 전체 클릭 오버레이 — 공유 버튼만 z-index 로 예외 */}
      <Link
        href={`/formula/${post.id}`}
        aria-label={post.title}
        style={{ position: "absolute", inset: 0, zIndex: 1 }}
      />
      <div className="fc-tags">
        <span className="chip">{cat}</span>
        {tool && <span className="chip tool">{tool}</span>}
      </div>
      <h3>{post.title}</h3>
      <p className="fc-sum">{summary}</p>
      <div className="fc-foot">
        <span className="author">
          <span className={`avatar-sm ${avaFor(post.authorId)}`}>
            {initialOf(post.authorName)}
          </span>
          {post.authorName}
        </span>
        <span className="fc-stats">
          <span className="fc-stat">{VIEW_ICON}{fmtCount(post.viewCount)}</span>
          <span className="fc-stat">{COMMENT_ICON}{fmtCount(post.commentCount)}</span>
          <span className="fc-stat">{LIKE_ICON}{fmtCount(post.likeCount)}</span>
        </span>
      </div>
      <ShareButton variant="card" url={`/formula/${post.id}`} />
    </article>
  );
}

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const q = first(sp.q) ?? "";
  const jobRole = first(sp.jobRole) ?? null;
  const tool = first(sp.tool) ?? null;
  const workType = first(sp.workType) ?? null;
  const difficulty = first(sp.difficulty) ?? null;
  const sortRaw = first(sp.sort);
  const sort: ArchiveSortValue =
    sortRaw === "popular" || sortRaw === "save" ? sortRaw : "latest";

  // getArchives 는 latest|popular|verified 만 지원 → 저장순(save)은 popular 로 받아
  // 렌더-세이프하게 saveCount 기준 재정렬한다.
  const params: ArchiveParams = {
    q: q || undefined,
    jobRole,
    tool: tool || undefined,
    workType: workType || undefined,
    difficulty: difficulty || undefined,
    sort: sort === "save" ? "popular" : sort,
  };

  let posts = await getArchives(params);
  if (sort === "save") {
    posts = [...posts].sort((a, b) => b.saveCount - a.saveCount);
  }

  const catLabel = jobRole ?? "공식 아카이브";

  // sort 제외 현재 쿼리스트링(정렬 select 가 보존).
  const base = new URLSearchParams();
  if (q) base.set("q", q);
  if (jobRole) base.set("jobRole", jobRole);
  if (tool) base.set("tool", tool);
  if (workType) base.set("workType", workType);
  if (difficulty) base.set("difficulty", difficulty);
  const baseParams = base.toString();

  // 좌측 네비 카테고리 링크(jobRole 만 교체, 나머지 보존).
  function navHref(value: string | null): string {
    const p = new URLSearchParams(baseParams);
    if (value) p.set("jobRole", value);
    else p.delete("jobRole");
    p.delete("sort");
    const qs = p.toString();
    return qs ? `/archive?${qs}` : "/archive";
  }

  return (
    <div className="wrap">
      <div className="dir-wrap">
        <aside className="dir-nav">
          <div className="dir-nav-head">카테고리</div>
          {NAV_CATS.map((c) => {
            const on = (jobRole ?? null) === c.value;
            return (
              <Link
                key={c.label}
                href={navHref(c.value)}
                className={`dn-item${on ? " on" : ""}`}
                aria-current={on ? "page" : undefined}
              >
                {c.icon}
                {c.label}
              </Link>
            );
          })}
          <Link href="/archive/new" className="btn btn-primary btn-full" style={{ marginTop: 12 }}>
            공식 작성
          </Link>
        </aside>

        <div>
          <div style={{ marginBottom: 14 }}>
            <ListSearch placeholder="공식 검색 (제목·요약)" />
          </div>
          <div className="dir-main-head">
            <div className="dir-title">
              <span>{catLabel}</span>
              <span className="dir-count">{posts.length}개</span>
            </div>
            <ArchiveSortSelect value={sort} baseParams={baseParams} />
          </div>

          {posts.length === 0 ? (
            <p className="page-sub" style={{ padding: "40px 4px" }}>
              {q || jobRole || tool || workType || difficulty
                ? "조건에 맞는 공식이 없어요. 필터를 바꾸거나 검색어를 지워보세요."
                : "아직 공식이 없어요. 첫 공식을 남겨보는 건 어때요?"}
            </p>
          ) : (
            <div className="grid">
              {posts.map((p) => (
                <ArchiveCard key={p.id} post={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
