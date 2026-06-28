import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { getArticles, getPopularTop5, getProfile } from "@/lib/queries";
import type { FeedPost } from "@/lib/queries";
import { HeroSearch, HomeSortSelect, ShareButton } from "@/components/ui";
import { catToCover, fmtCount } from "@/lib/ref-style";
import {
  CATEGORIES,
  categories,
  isCategory,
  type Category,
} from "@/lib/contract";

export const metadata: Metadata = {
  title: "The Formula — 매일 한 줄씩, 나만의 공식이 쌓여요",
  description:
    "AI 큐레이터가 정제한 최신 AX 아티클을 매일 만나고, 내 직무의 업무 공식을 아카이브로 축적해요. 검증된 공식을 발견하고 내 자산으로 쌓아요.",
};

// =============================================================================
// 정렬 — URL 기반(서버 렌더). 최신/인기/저장.
// =============================================================================
type Sort = "latest" | "popular" | "saved";

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "latest", label: "최신순" },
  { value: "popular", label: "인기순" },
  { value: "saved", label: "저장순" },
];

function buildHref(category: Category | null, sort: Sort): string {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (sort !== "latest") params.set("sort", sort);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

function categoryLabel(c: Category): string {
  return categories[c].label;
}

// 작성일 → "2026.06.19" 표기.
function fmtDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

// 히어로 jh-date — "JUNE 21 · SATURDAY".
function heroDate(): string {
  const d = new Date();
  const month = d
    .toLocaleDateString("en-US", { month: "long" })
    .toUpperCase();
  const weekday = d
    .toLocaleDateString("en-US", { weekday: "long" })
    .toUpperCase();
  return `${month} ${d.getDate()} · ${weekday}`;
}

// 카드 첫 번째 툴/키워드 칩.
function firstTool(p: FeedPost): string | undefined {
  return p.formula?.tools?.[0] ?? p.cardnews?.keywords?.[0] ?? p.tags?.[0];
}

// 많이 찾는 트렌드 칩.
const TRENDS = ["회의록", "프롬프트", "GPT", "리포트", "디자인", "기획"] as const;
const TREND_LABEL: Record<(typeof TRENDS)[number], string> = {
  회의록: "#회의록 정리",
  프롬프트: "#프롬프트",
  GPT: "#GPT",
  리포트: "#리포트 자동화",
  디자인: "#디자인",
  기획: "#기획",
};

// =============================================================================
// 아이콘 (조회·댓글·좋아요)
// =============================================================================
const EyeIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const CommentIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);
const HeartIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
  </svg>
);

// =============================================================================
// TOP5 — pop-card
// =============================================================================
function PopCard({ post, rank }: { post: FeedPost; rank: number }) {
  const tool = firstTool(post);
  return (
    <Link href={`/article/${post.id}`} className="pop-card">
      <div className="pop-rank">{rank}</div>
      <div className="pop-tags">
        <span className="chip">{categoryLabel(post.category)}</span>
        {tool && <span className="chip tool">{tool}</span>}
      </div>
      <h3 className="pop-title">{post.title}</h3>
      <div className="pop-meta">
        <span className="pop-by">{post.authorName}</span>
        <div style={{ display: "flex", gap: 8 }}>
          <span className="fc-stat">{EyeIcon} {fmtCount(post.viewCount)}</span>
          <span className="fc-stat">{CommentIcon} {fmtCount(post.commentCount)}</span>
          <span className="fc-stat">{HeartIcon} {fmtCount(post.likeCount)}</span>
        </div>
      </div>
    </Link>
  );
}

// =============================================================================
// 홈 피드 카드 — feed-card (커버 cov-* + fcover-cat)
// =============================================================================
function FeedCard({ post }: { post: FeedPost }) {
  const cover = catToCover(post.category);
  const tool = firstTool(post);
  const href = `/article/${post.id}`;
  return (
    <article className="feed-card" style={{ position: "relative" }}>
      {/* 카드 전체 클릭 오버레이 — 어디를 눌러도 상세로. 위 버튼만 z-index 로 예외 */}
      <Link
        href={href}
        aria-hidden
        tabIndex={-1}
        style={{ position: "absolute", inset: 0, zIndex: 1 }}
      />
      <Link href={href} className={`fcover ${cover}`}>
        {post.cardnews?.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cardnews.coverImageUrl}
            alt=""
            className="fcover-img"
            loading="lazy"
            decoding="async"
          />
        ) : null}
        <span className="fcover-cat">{categoryLabel(post.category)}</span>
      </Link>
      <div className="fcb">
        <div className="fc-src">
          {post.authorName} · {fmtDate(post.createdAt)}
        </div>
        <Link href={href} className="fc-t">
          {post.title}
        </Link>
        {post.oneLiner && <p className="fc-d">{post.oneLiner}</p>}
        <div className="fc-bottom">
          <div className="fc-tags">
            <span className="chip">{categoryLabel(post.category)}</span>
            {tool && <span className="chip tool">{tool}</span>}
          </div>
          <div className="fc-stats-row">
            <span className="fc-stat-i">{EyeIcon} {fmtCount(post.viewCount)}</span>
            <span className="fc-stat-i">{CommentIcon} {fmtCount(post.commentCount)}</span>
            <span className="fc-stat-i">{HeartIcon} {fmtCount(post.likeCount)}</span>
            <ShareButton url={href} variant="inline" />
          </div>
        </div>
      </div>
    </article>
  );
}

// =============================================================================
// 홈 = 아티클 피드. journal-hero 풀블리드 + TOP5 겹침 + feed-layout.
// 로그인/비로그인 동일 피드(+가입 CTA).
// =============================================================================
type HomeSearchParams = {
  category?: string;
  sort?: string;
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  const sp = await searchParams;
  const activeCategory: Category | null = isCategory(sp.category)
    ? sp.category
    : null;
  const sort: Sort =
    sp.sort === "popular" || sp.sort === "saved" ? sp.sort : "latest";

  const session = await auth();
  const userId = session?.user?.id ?? null;

  // 비로그인은 하단 가입 CTA. (개인화 인사는 별도 — 현재 히어로는 고정 카피)
  const profile = userId ? await getProfile("me", userId) : null;
  // 신규 가입자는 가입 흐름(apply → /account → 온보딩)에서 안내한다.
  // 홈에서 비온보딩 유저를 강제로 /account 로 보내면 기존 회원이 홈에 머물 수 없어
  // 갇히므로(모든 진입이 /account 로 튕김), 홈 게이트는 두지 않는다.
  const displayName = profile?.user.name ?? null;

  // getArticles 는 latest/popular 만 지원 → 'saved' 는 saveCount 로 재정렬.
  const articleSort = sort === "popular" ? "popular" : "latest";
  const [articlesRaw, top5] = await Promise.all([
    getArticles({
      category: activeCategory ?? undefined,
      sort: articleSort,
    }),
    getPopularTop5(),
  ]);

  const articles =
    sort === "saved"
      ? [...articlesRaw].sort((a, b) => b.saveCount - a.saveCount)
      : articlesRaw;

  return (
    <>
      {/* 본문 컨테이너 — 레퍼런스(view-00): wrap > journal-hero > pop-wrap > feed-layout > join-cta */}
      <div className="wrap">
        {/* =====================================================================
            1) journal-hero — 풀블리드(-50vw)이지만 반드시 .wrap 안의 첫 자식.
               margin-top:-100px + pop-wrap margin-top:-90px 겹침 계산이 맞으려면
               형제로 wrap 안에 있어야 함. 별 배경 + 오버레이 + 검색.
            ===================================================================== */}
        <div className="journal-hero">
          <video
            className="hero-video"
            autoPlay
            muted
            loop
            playsInline
            poster="/hero-stars.jpg"
            preload="auto"
          >
            <source src="/hero-galaxy.mp4" type="video/mp4" />
          </video>
          <div className="hero-overlay" />
          <div className="jh-text">
            <div className="jh-date">{heroDate()}</div>
            <h1 className="jh-title">
              {displayName ? (
                <>
                  {displayName}님, 지금 가장 해결하고 싶은
                  <br />
                  업무 고민은 무엇인가요?
                </>
              ) : (
                <>
                  지금 가장 해결하고 싶은
                  <br />
                  업무 고민은 무엇인가요?
                </>
              )}
            </h1>
            <p className="jh-sub">AI와 함께 더 효율적인 일하는 방식을 찾아보세요.</p>
          </div>
          {/* 가운데 회전 행성 엠블럼(투명 GIF) — 헤드라인과 검색창 사이 중앙 아이콘 */}
          <div className="hero-emblem" aria-hidden />
          <HeroSearch action="/search" placeholder="공식, 아티클, 멤버 검색…" />
          <div className="hero-trends">
            <span className="trend-label">많이 찾는</span>
            {TRENDS.map((t) => (
              <Link
                key={t}
                href={`/search?q=${encodeURIComponent(t)}`}
                className="trend-chip"
              >
                {TREND_LABEL[t]}
              </Link>
            ))}
          </div>
        </div>

        {/* ===================================================================
            2) 인기 글 TOP 5 — 히어로 하단에 겹침
            =================================================================== */}
        <div className="pop-wrap">
          <div className="sec">
            <h2>인기 글 TOP 5</h2>
            <span className="more">이번 주</span>
          </div>
          <div className="pop-slide">
            {top5.map((p, i) => (
              <PopCard key={p.id} post={p} rank={i + 1} />
            ))}
          </div>
        </div>

        {/* ===================================================================
            3) feed-layout — 좌: 관심 카테고리 / 우: 정렬 + 카드 그리드
            =================================================================== */}
        <div className="feed-layout">
          <aside className="feed-cats">
            <div className="fc-cats-head">관심 카테고리</div>
            <Link
              href={buildHref(null, sort)}
              aria-current={activeCategory === null ? "page" : undefined}
              className={`cat${activeCategory === null ? " on" : ""}`}
            >
              전체
            </Link>
            {CATEGORIES.map((c) => (
              <Link
                key={c}
                href={buildHref(c, sort)}
                aria-current={activeCategory === c ? "page" : undefined}
                className={`cat${activeCategory === c ? " on" : ""}`}
              >
                {categoryLabel(c)}
              </Link>
            ))}
          </aside>

          <div className="feed-main">
            <div className="feed-ctrl">
              <HomeSortSelect
                options={SORT_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                  href: buildHref(activeCategory, o.value),
                }))}
                value={sort}
              />
            </div>
            <div className="feed-grid">
              {articles.map((p) => (
                <FeedCard key={p.id} post={p} />
              ))}
            </div>
            {userId && (
              <div style={{ marginTop: 18, textAlign: "left" }}>
                <Link href="/article/new" className="write-btn">
                  + 아티클 추가 요청
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ===================================================================
            4) 가입 CTA — 비로그인만.
            =================================================================== */}
        {!userId && (
          <div className="join-cta">
            <div>
              <div className="jc-title">아직 포뮬러가 아니신가요?</div>
              <div className="jc-sub">
                가입하면 마음에 든 공식을 저장하고, 나만의 공식을 쌓을 수 있어요.
              </div>
            </div>
            <Link className="btn btn-primary" href="/apply">
              가입하고 시작하기
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
