// =============================================================================
// 전역 통합검색 (/search?q=...)
// =============================================================================
// posts / members / activities 를 한 화면에서 그룹으로 보여줘요.
// - searchAll(q) 단일 쿼리로 세 그룹을 read-time 집계까지 채워 받아요.
// - 레퍼런스 룩: .wrap 컨테이너 + .page-head(제목 + contained 검색바) + .sec 섹션헤더
//   + .feed-grid > .fcard(아카이브, 워터마크/배지 없음) / .dir-grid > .dir-card(포뮬러)
//   / ActivityCard(모임).
// - 빈 쿼리 / 무결과는 EmptyState 로 안내해요.
// =============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { searchAll, type FeedPost, type MemberCard } from "@/lib/queries";
import { Chip, ActivityCard, EmptyState, ShareButton } from "@/components/ui";
import { categories, type Category } from "@/lib/contract";
import { avaFor, initialOf, fmtCount } from "@/lib/ref-style";
import { SearchBar } from "./search-bar";

export const metadata: Metadata = {
  title: "통합검색 · The Formula",
  description: "공식, 멤버, 모임을 한 번에 검색해요.",
};

type SearchPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

/** searchParams 의 q 를 단일 문자열로 정규화. */
function readQuery(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) return (raw[0] ?? "").trim();
  return (raw ?? "").trim();
}

// 통계 아이콘 — 레퍼런스 .fc-stat 안 인라인 SVG(아카이브 카드와 동일).
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

/**
 * 아카이브/아티클 결과 카드 — 레퍼런스 .fcard(커버·워터마크·AI큐레이션·검증됨 없음).
 * 아카이브 페이지의 카드와 동일 마크업으로 페이지 간 일관성을 맞춰요.
 */
function PostResultCard({ post }: { post: FeedPost }) {
  const cat = categories[post.category as Category]?.label ?? post.category;
  const tool = post.formula?.tools?.[0] ?? post.cardnews?.keywords?.[0] ?? null;
  const summary = post.oneLiner ?? post.cardnews?.summary ?? post.formula?.result ?? "";
  const href = post.postType === "cardnews" ? `/article/${post.id}` : `/formula/${post.id}`;
  return (
    <article className="fcard">
      <div className="fc-tags">
        <span className="chip">{cat}</span>
        {tool && <span className="chip tool">{tool}</span>}
      </div>
      <Link href={href} style={{ display: "contents" }}>
        <h3>{post.title}</h3>
        <p className="fc-sum">{summary}</p>
      </Link>
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
      <ShareButton variant="card" url={href} />
    </article>
  );
}

/**
 * 멤버 결과 카드 — 레퍼런스 .dir-card / dc-* 마크업.
 * 검색은 경량 MemberCard 집계 타입을 쓰므로(공유 MemberCard UI 는 contract User 요구)
 * 여기서 dir-card 구조를 직접 미러링해요. 카드 전체가 프로필로 가는 링크예요.
 */
function MemberResultCard({ member }: { member: MemberCard }) {
  const subtitle = [member.jobRole ?? member.role, member.company]
    .filter(Boolean)
    .join(" · ");
  return (
    <Link href={`/profile/${member.id}`} className="dir-card">
      <div className="dc-body">
        <div className="dc-top">
          <div className={`dc-avatar ${avaFor(member.id)}`}>
            {initialOf(member.name)}
          </div>
          <div className="dc-top-info">
            <div className="dc-name">{member.name}</div>
            {subtitle && <div className="dc-role">{subtitle}</div>}
          </div>
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
          <span className="dc-stat">공식 {fmtCount(member.formulaCount)}</span>
          <span className="dc-stat">저장 {fmtCount(member.saveCount)}</span>
          <span className="dc-stat">
            팔로워 {fmtCount(member.followerCount)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const sp = await searchParams;
  const q = readQuery(sp.q);

  const { posts, members, activities } = q
    ? await searchAll(q)
    : { posts: [], members: [], activities: [] };

  const total = posts.length + members.length + activities.length;
  const hasResults = total > 0;

  return (
    <div className="wrap">
      {/* 깨끗한 헤더 — page-head(제목 + 서브 + contained 검색바). 풀블리드 다크 밴드 없음 */}
      <div className="page-head">
        <h1 className="page-title">무엇을 찾고 있나요?</h1>
        <p className="page-sub">아카이브, 포뮬러, 모임을 한 번에 찾아봐요.</p>
        <div style={{ marginTop: 16 }}>
          <SearchBar
            placeholder="공식·포뮬러·모임을 검색해보세요"
            defaultValue={q}
          />
        </div>
      </div>

      {q && (
        <p className="page-sub" style={{ marginTop: 0 }}>
          <b style={{ color: "var(--t1)", fontWeight: 800 }}>‘{q}’</b> 검색 결과{" "}
          {total}건
        </p>
      )}

      {!q ? (
        <EmptyState
          icon="🔍"
          title="검색어를 입력해보세요"
          description="아카이브 제목·태그, 포뮬러 이름·직무, 모임 키워드로 검색할 수 있어요."
        />
      ) : !hasResults ? (
        <EmptyState
          icon="🫥"
          title="검색 결과가 없어요"
          description={`‘${q}’ 와 일치하는 아카이브·포뮬러·모임을 찾지 못했어요. 다른 키워드로 다시 검색해 보세요.`}
          actionLabel="아카이브 둘러보기"
          actionHref="/archive"
        />
      ) : (
        <>
          {/* 아카이브 (공식) */}
          {posts.length > 0 && (
            <section>
              <div className="sec">
                <h2>아카이브 {posts.length}</h2>
                <Link href="/archive" className="more">
                  전체 아카이브
                </Link>
              </div>
              <div className="feed-grid">
                {posts.map((post) => (
                  <PostResultCard key={post.id} post={post} />
                ))}
              </div>
            </section>
          )}

          {/* 포뮬러 (멤버) */}
          {members.length > 0 && (
            <section>
              <div className="sec">
                <h2>포뮬러 {members.length}</h2>
                <Link href="/members" className="more">
                  포뮬러 전체
                </Link>
              </div>
              <div className="dir-grid">
                {members.map((member) => (
                  <MemberResultCard key={member.id} member={member} />
                ))}
              </div>
            </section>
          )}

          {/* 모임 */}
          {activities.length > 0 && (
            <section>
              <div className="sec">
                <h2>모임 {activities.length}</h2>
                <Link href="/activities" className="more">
                  모임 전체
                </Link>
              </div>
              <div className="feed-grid">
                {activities.map((activity) => (
                  <ActivityCard key={activity.id} activity={activity} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
