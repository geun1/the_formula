import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Avatar,
  PromptBlock,
  ViewTracker,
  CoverGradient,
  Markdown,
} from "@/components/ui";
import { renderFreeBody } from "@/lib/sanitize";
import {
  getArchiveDetail,
  getAuthorOtherPosts,
  getProfile,
  currentUserId,
  type FeedPost,
} from "@/lib/queries";
import { type Difficulty } from "@/lib/contract";
import { fmtCount } from "@/lib/ref-style";
import { FormulaActions } from "./formula-actions";
import { DetailComments } from "./detail-comments";
import { AuthorActions } from "./author-actions";

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  beginner: "입문",
  intermediate: "중급",
  advanced: "고급",
};

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const detail = await getArchiveDetail(id);
  if (!detail) {
    return { title: "아카이브를 찾을 수 없어요 · The Formula" };
  }
  const { post } = detail;
  const desc =
    post.oneLiner ??
    post.formula?.problem ??
    post.cardnews?.summary ??
    "AX 실전 공식";
  return {
    title: `${post.title} · The Formula`,
    description: desc.slice(0, 150),
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}. ${m}. ${day}`;
  } catch {
    return "";
  }
}

/** 참고한 아티클 백링크 — reference.css 의 .author-more 톤과 어울리는 카드. */
function SourceArticleCard({ article }: { article: FeedPost }) {
  const summary = article.cardnews?.summary ?? article.oneLiner ?? "";
  return (
    <Link
      href={`/article/${article.id}`}
      className="author-more"
      style={{
        display: "flex",
        gap: 14,
        alignItems: "center",
        marginTop: 28,
        textDecoration: "none",
      }}
    >
      <span
        style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          overflow: "hidden",
          flexShrink: 0,
          display: "block",
        }}
      >
        {article.cardnews?.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.cardnews.coverImageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <CoverGradient
            seed={article.id}
            category={article.category}
            className="h-full w-full"
          />
        )}
      </span>
      <span style={{ minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 700,
            color: "var(--blue)",
          }}
        >
          참고한 아티클
        </span>
        <span
          style={{
            display: "block",
            fontSize: 14,
            fontWeight: 700,
            color: "var(--t1)",
            marginTop: 2,
          }}
        >
          {article.title}
        </span>
        {summary && (
          <span
            style={{
              display: "block",
              fontSize: 13,
              color: "var(--t3)",
              marginTop: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {summary}
          </span>
        )}
      </span>
    </Link>
  );
}

export default async function FormulaDetailPage({ params }: PageProps) {
  const { id } = await params;
  const viewerId = await currentUserId();
  const detail = await getArchiveDetail(id, viewerId);
  if (!detail) notFound();

  const { post, comments, isSaved, isLiked, author, sourceArticle } = detail;
  const isCardnews = post.postType === "cardnews";

  // 우측 사이드바: 작성자의 다른 공식 + 팔로우 상태
  const otherPosts = author
    ? await getAuthorOtherPosts(author.id, post.id, 4)
    : [];
  let isFollowing = false;
  let isMe = false;
  if (author) {
    const prof = await getProfile(author.id, viewerId);
    isFollowing = prof?.isFollowing ?? false;
    isMe = prof?.isMe ?? false;
  }

  const shareUrl = `/formula/${post.id}`;
  const dateStr = formatDate(post.createdAt);

  return (
    <div className="wrap">
      {/* 진입 시 조회수 +1 */}
      <ViewTracker postId={post.id} />

      {/* 뒤로가기 */}
      <Link href="/archive" className="back">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        아카이브
      </Link>

      <div className="detail-wrap">
        <article className="detail-main">
          {/* 상단 액션 (sticky): 공식 저장 + 따라하기 + 공유 */}
          <FormulaActions
            postId={post.id}
            initialSaved={isSaved}
            initialSaveCount={post.saveCount}
            initialLiked={isLiked}
            initialLikeCount={post.likeCount}
            shareUrl={shareUrl}
            loggedIn={!!viewerId}
          />

          {/* 해시태그 */}
          {post.tags.length > 0 && (
            <div className="d-hashtags">
              {post.tags.map((t) => (
                <span key={t}>#{t}</span>
              ))}
            </div>
          )}

          {/* 제목 */}
          <h1 className="d-title">{post.title}</h1>

          {/* 메타: 난이도 · 날짜 · 조회수 */}
          <div className="d-meta">
            {DIFFICULTY_LABEL[post.difficulty]}
            {post.workType && (
              <>
                <span className="d-dot">·</span>
                {post.workType}
              </>
            )}
            <span className="d-dot">·</span>
            {dateStr}
            <span className="d-dot">·</span>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {fmtCount(post.viewCount)}
          </div>

          {/* 리드(한줄요약) */}
          {post.oneLiner && (
            <blockquote className="d-quote">{post.oneLiner}</blockquote>
          )}

          {/* 참고한 아티클 백링크 */}
          {sourceArticle && <SourceArticleCard article={sourceArticle} />}

          {/* 본문 */}
          {isCardnews && post.cardnews ? (
            <>
              <div className="d-block">
                <div className="lab">요약</div>
                <Markdown content={post.cardnews.summary} />
              </div>
              {post.cardnews.body && (
                <div className="d-block">
                  <div className="lab">정리</div>
                  <Markdown content={post.cardnews.body} />
                </div>
              )}
            </>
          ) : post.formula && post.formula.format === "free" ? (
            // 자유 형식 — 작성한 HTML 그대로(렌더 시 재새니타이즈, 심층 방어)
            <div className="d-block">
              <div
                className="md free-body"
                dangerouslySetInnerHTML={{
                  __html: renderFreeBody(post.formula.content),
                }}
              />
            </div>
          ) : post.formula ? (
            <>
              <div className="d-block">
                <div className="lab">문제</div>
                <Markdown content={post.formula.problem} />
              </div>

              {post.formula.hypothesis && (
                <div className="d-block">
                  <div className="lab">가설</div>
                  <Markdown content={post.formula.hypothesis} />
                </div>
              )}

              {post.formula.tools.length > 0 && (
                <div className="d-block">
                  <div className="lab">사용한 도구</div>
                  <div className="d-tags">
                    {post.formula.tools.map((t) => (
                      <span key={t} className="chip tool">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="d-block">
                <div className="lab">과정</div>
                <Markdown content={post.formula.process} />
              </div>

              {post.formula.prompt && (
                <div className="d-block">
                  <div className="lab">프롬프트 — 그대로 가져가세요</div>
                  <PromptBlock content={post.formula.prompt} label="프롬프트" />
                </div>
              )}

              <div className="d-block">
                <div className="lab">결과</div>
                <Markdown content={post.formula.result} />
                {post.formula.timeSaved && (
                  <div className="tip" style={{ marginTop: 12 }}>
                    <b>⏱ {post.formula.timeSaved}</b> 절약했어요.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="d-block">
              <p style={{ color: "var(--t3)" }}>본문이 아직 준비 중이에요.</p>
            </div>
          )}

          {/* 키워드/태그 (cardnews 키워드) */}
          {isCardnews &&
            post.cardnews &&
            post.cardnews.keywords.length > 0 && (
              <div className="d-tags" style={{ marginTop: 28 }}>
                {post.cardnews.keywords.map((k) => (
                  <span key={k} className="chip">
                    {k}
                  </span>
                ))}
              </div>
            )}

          {/* 원문 링크 */}
          {post.sourceUrl && (
            <div className="d-block">
              <a
                href={post.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--blue)",
                }}
              >
                원문 보기{post.sourceName ? ` · ${post.sourceName}` : ""} →
              </a>
            </div>
          )}

          {/* 댓글 */}
          <DetailComments
            postId={post.id}
            comments={comments}
            loggedIn={!!viewerId}
            viewerId={viewerId}
          />
        </article>

        {/* 우측 사이드바 */}
        {author && (
          <aside className="d-side">
            <div className="author-card">
              <div className="ac-top">
                <Avatar
                  id={author.id}
                  name={author.name}
                  src={author.image}
                  variant="ac"
                />
                <div>
                  <div className="ac-name">{author.name}</div>
                  <div className="ac-role">
                    {author.jobRole ?? author.role}
                  </div>
                </div>
              </div>
              <Link className="ac-link" href={`/profile/${author.id}`}>
                프로필 보기 →
              </Link>
              {!isMe &&
                (viewerId ? (
                  <AuthorActions
                    authorId={author.id}
                    authorName={author.name}
                    initialFollowing={isFollowing}
                  />
                ) : (
                  <div className="ac-actions">
                    <a href="/account" className="ac-follow">
                      로그인하고 팔로우
                    </a>
                  </div>
                ))}
            </div>

            {otherPosts.length > 0 && (
              <div className="author-more">
                <div className="am-head">
                  <span>{author.name}님이 쓴 다른 공식</span>
                  <Link href={`/profile/${author.id}`}>더보기</Link>
                </div>
                {otherPosts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/formula/${p.id}`}
                    className="am-item"
                    style={{ display: "block" }}
                  >
                    {p.title}
                  </Link>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
