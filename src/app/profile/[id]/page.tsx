import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getProfile,
  currentUserId,
  isMemberBookmarked,
  getActivityTimeline,
  getAppliedActivities,
  getSaved,
  getTopBookmarkTags,
} from "@/lib/queries";
import { Chip, GradeBadge } from "@/components/ui";
import { SignOutButton } from "@/components/ui/auth-buttons";
import { avaFor, initialOf, fmtCount, timeAgo } from "@/lib/ref-style";
import { computeTrust } from "@/lib/trust";
import { ProfileActions } from "./profile-follow";
import { ProfileFormulaGrid } from "./profile-grid";
import { MannerTempCard } from "./manner-temp-card";

type Params = { id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) {
    return { title: "포뮬러를 찾을 수 없어요 · The Formula" };
  }
  const { user } = profile;
  return {
    title: `${user.name} · The Formula`,
    description:
      user.bio?.slice(0, 120) ||
      `${user.name}님의 AX 포트폴리오와 활동 기록을 만나보세요.`,
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const viewerId = await currentUserId();
  const profile = await getProfile(id, viewerId);
  if (!profile) notFound();

  const {
    user,
    authoredPosts,
    followerCount,
    followingCount,
    isFollowing,
    isMe,
  } = profile;
  const formulas = authoredPosts.filter((p) => p.postType === "formula");

  // 저장받음(전면) = 작성한 공식들이 받은 저장 합계.
  const savesReceived = authoredPosts.reduce(
    (sum, p) => sum + (p.saveCount ?? 0),
    0,
  );

  // 뷰어가 이 포뮬러를 저장(멤버 북마크)했는지.
  const initialSaved =
    !isMe && viewerId ? await isMemberBookmarked(viewerId, user.id) : false;

  // 활동 이력 — 최근 5개. 사적 행동(저장/좋아요 누른 것)은 본인만.
  const timeline = await getActivityTimeline(user.id, {
    includePrivate: isMe,
    limit: 5,
  });

  // 모임 활동 — 완주·참여중은 공개(신뢰 신호), 지원 중(pending)은 본인만.
  const appliedActivities = await getAppliedActivities(user.id);
  const accepted = appliedActivities.filter((a) => a.status === "accepted");
  const completedActivities = accepted.filter(
    (a) => a.activity.status === "done",
  );
  const ongoingActivities = accepted.filter(
    (a) => a.activity.status !== "done",
  );
  const pendingApplications = appliedActivities.filter(
    (a) => a.status === "pending",
  );
  const moimList = [
    ...ongoingActivities.map(({ activity }) => ({ activity, label: "활동 중", cls: "moim-active" })),
    ...(isMe ? pendingApplications.map(({ activity }) => ({ activity, label: "검토 중", cls: "moim-pending" })) : []),
    ...completedActivities.map(({ activity }) => ({ activity, label: "완료", cls: "moim-done" })),
  ];

  // 북마크한 공식 — 본인 마이페이지에서만(저장함은 사적).
  const savedPosts = isMe ? await getSaved(user.id) : [];
  const topTags = await getTopBookmarkTags(user.id, 5);

  const role = [user.jobRole ?? user.role, user.company]
    .filter(Boolean)
    .join(" · ");

  // 달성 조건 충족 시 자동으로 표시되는 배지
  const { tier } = computeTrust(user.activityStats);
  const TIER_RANK: Record<string, number> = { sprout: 0, contributor: 1, activist: 2, builder: 3, master: 4 };
  const tierRank = TIER_RANK[tier] ?? 0;
  const s = user.activityStats;
  const bCompleted = completedActivities.length;
  const bSaves     = savesReceived;
  const bFollowers = followerCount;
  const bTierRank  = tierRank;
  type Badge = { emoji: string; label: string };
  const pick = (tiers: (Badge | false)[]) =>
    tiers.filter((x): x is Badge => !!x).at(-1) ?? false;

  const badges = [
    // 공식
    pick([
      s.formulaCount >= 1 && { emoji: "🌱", label: "첫 공식" },
      ...[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map(n =>
        s.formulaCount >= n && { emoji: "✍️", label: `공식 ${n}개 달성` }
      ),
    ]),
    // 검증 공식
    pick([
      (s.verifiedFormulaCount ?? 0) >= 1 && { emoji: "✅", label: "첫 검증 공식" },
      ...[5, 10, 15, 20, 25, 30].map(n =>
        (s.verifiedFormulaCount ?? 0) >= n && { emoji: "✅", label: `검증 공식 ${n}개 달성` }
      ),
    ]),
    // 아티클 변환
    pick([
      (s.articleFormulaCount ?? 0) >= 1 && { emoji: "📰", label: "첫 아티클 변환" },
      (s.articleFormulaCount ?? 0) >= 5 && { emoji: "📰", label: "아티클 변환 5개" },
    ]),
    // 모임 완주
    pick([
      bCompleted >= 1 && { emoji: "🏁", label: "첫 모임 완주" },
      ...[3, 6, 9, 12, 15, 18].map(n =>
        bCompleted >= n && { emoji: "🏆", label: `모임 ${n}회 완주` }
      ),
    ]),
    // 모임 개설
    pick([
      (s.createdActivityCount ?? 0) >= 1 && { emoji: "🏠", label: "첫 모임 개설" },
      (s.createdActivityCount ?? 0) >= 3 && { emoji: "🏠", label: "모임 개설 3회" },
    ]),
    // 모임 지원
    (s.appliedActivityCount ?? 0) >= 1 && { emoji: "🙋", label: "첫 모임 지원" },
    // 북마크받음
    pick([
      ...[10, 30, 50, 70, 90, 110].map(n =>
        bSaves >= n && { emoji: "💾", label: `북마크 ${n}회` }
      ),
    ]),
    // 하트받음
    pick([
      ...[10, 30, 50, 70].map(n =>
        (s.memberSaves ?? 0) >= n && { emoji: "❤️", label: `하트 ${n}개` }
      ),
    ]),
    // 받은 좋아요
    pick([
      ...[10, 30, 50].map(n =>
        (s.likesReceived ?? 0) >= n && { emoji: "👍", label: `좋아요 ${n}개` }
      ),
    ]),
    // 받은 댓글
    pick([
      (s.commentsReceived ?? 0) >= 10 && { emoji: "💬", label: "댓글 10개 받음" },
      (s.commentsReceived ?? 0) >= 30 && { emoji: "💬", label: "댓글 30개 받음" },
    ]),
    // 댓글 작성
    pick([
      ...[10, 30, 50].map(n =>
        s.commentCount >= n && { emoji: "🗣️", label: `댓글 ${n}회 작성` }
      ),
    ]),
    // 팔로워
    pick([
      ...[10, 30, 50, 70, 90].map(n =>
        bFollowers >= n && { emoji: "👥", label: `팔로워 ${n}명` }
      ),
    ]),
    // 팔로잉
    pick([
      ...[10, 30, 50].map(n =>
        (s.followingCount ?? 0) >= n && { emoji: "🔁", label: `팔로잉 ${n}명` }
      ),
    ]),
    // 등급
    pick([
      bTierRank >= 1 && { emoji: "🌿", label: "기여자" },
      bTierRank >= 2 && { emoji: "💪", label: "활동가" },
      bTierRank >= 3 && { emoji: "🔨", label: "빌더" },
      bTierRank >= 4 && { emoji: "👑", label: "AX 마스터" },
    ]),
  ].filter(Boolean) as Badge[];

  // 이름 끝 글자 기준 호칭(서연님의 공식) — 마지막 2글자 또는 전체.
  const callName = user.name.length > 2 ? user.name.slice(-2) : user.name;

  return (
    <div className="wrap">
      <Link href="/members" className="back">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        포뮬러
      </Link>

      {/* 프로필 히어로 — 아바타 | 이름/태그/링크 | 게이지+팁 */}
      <div className="profile-hero">
        {isMe ? (
          <Link href="/account" className="avatar-edit-wrap" aria-label="프로필 편집">
            <div className={`avatar-lg ${avaFor(user.id)}`} aria-hidden>
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                initialOf(user.name)
              )}
            </div>
            <span className="avatar-edit-bar">편집</span>
          </Link>
        ) : (
          <div className={`avatar-lg ${avaFor(user.id)}`} aria-hidden>
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              initialOf(user.name)
            )}
          </div>
        )}

        <div className="profile-info">
          <div className="profile-name-row">
            <span className="pn">
              {user.name}
              {role && <span className="pr-inline"> {role}</span>}
            </span>
          </div>

          {user.interests.length > 0 && (
            <div className="profile-hashtags">
              {user.interests.map((it) => (
                <span key={it} className="profile-hashtag">#{it}</span>
              ))}
            </div>
          )}

          {(user.github || user.blog || user.homepage) && (
            <div className="profile-links">
              {user.github && (
                <a href={user.github} target="_blank" rel="noopener noreferrer" className="profile-link">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49v-1.7c-2.78.62-3.37-1.2-3.37-1.2-.45-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.9 1.56 2.36 1.11 2.94.85.09-.66.35-1.11.63-1.36-2.22-.26-4.56-1.13-4.56-5.04 0-1.11.39-2.02 1.03-2.73-.1-.26-.45-1.3.1-2.7 0 0 .84-.27 2.75 1.04a9.36 9.36 0 0 1 5 0c1.91-1.31 2.75-1.04 2.75-1.04.55 1.4.2 2.44.1 2.7.64.71 1.03 1.62 1.03 2.73 0 3.92-2.35 4.78-4.58 5.03.36.32.68.94.68 1.9v2.82c0 .27.18.6.69.49A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2z" />
                  </svg>
                  GitHub
                </a>
              )}
              {user.blog && (
                <a href={user.blog} target="_blank" rel="noopener noreferrer" className="profile-link">
                  <span aria-hidden>✍</span> 블로그
                </a>
              )}
              {user.homepage && (
                <a href={user.homepage} target="_blank" rel="noopener noreferrer" className="profile-link">
                  <span aria-hidden>🌐</span> 홈페이지
                </a>
              )}
            </div>
          )}

          <div className="stats">
            <div className="stat">
              <div className="n">{user.activityStats.formulaCount}</div>
              <div className="l">공식</div>
            </div>
            <div className="stat">
              <div className="n">{fmtCount(savesReceived)}</div>
              <div className="l">저장받음</div>
            </div>
            <div className="stat">
              <div className="n">{fmtCount(followerCount)}</div>
              <div className="l">팔로워</div>
            </div>
            <div className="stat">
              <div className="n">{fmtCount(followingCount)}</div>
              <div className="l">팔로잉</div>
            </div>
          </div>
        </div>

        <div className="profile-gauge">
          <MannerTempCard stats={user.activityStats} />
        </div>
      </div>

      {!isMe && (
        <ProfileActions
          targetUserId={user.id}
          targetName={user.name}
          initialFollowing={isFollowing}
          initialSaved={initialSaved}
        />
      )}

      <hr className="pf-divider" />
      <div className="sec">
        <h2>나의 배지</h2>
        <div className="badge-help">
          ?
          <div className="badge-tooltip">
            <p className="badge-tooltip-title">달성 가능한 배지</p>
            <ul className="badge-tooltip-list">
              <li>🌱 공식</li>
              <li>✅ 검증 공식</li>
              <li>📰 아티클 변환</li>
              <li>🏁 모임 완주</li>
              <li>🏠 모임 개설 / 🙋 모임 지원</li>
              <li>💾 저장받음</li>
              <li>❤️ 하트 / 👍 좋아요</li>
              <li>💬 댓글 받기 / 🗣️ 댓글 작성</li>
              <li>👥 팔로워 / 🔁 팔로잉</li>
              <li>🌿 기여자 · 💪 활동가 · 🔨 빌더 · 👑 AX마스터</li>
            </ul>
          </div>
        </div>
      </div>
      {badges.length > 0 ? (
        <div className="profile-badges">
          {badges.map((b) => (
            <span key={b.label} className="profile-badge">
              <span className="profile-badge-emoji">{b.emoji}</span>
              <span className="profile-badge-label">{b.label}</span>
            </span>
          ))}
        </div>
      ) : (
        <p className="page-sub">아직 배지가 없어요. 활동을 시작하면 하나씩 모을 수 있어요.</p>
      )}

      <div className="sec">
        <h2>활동 이력 및 점수</h2>
      </div>
      {timeline.length === 0 ? (
        <p className="page-sub">
          {isMe
            ? "아직 활동 이력이 없어요. 첫 공식을 기록하면 온도가 올라가요."
            : "아직 활동 이력이 없어요."}
        </p>
      ) : (
        <ul className="timeline">
          {timeline.map((ev, i) => (
            <li key={i} className="tl-item">
              <span className="tl-text">{ev.text}</span>
              {ev.tempGain && (
                <span className="tl-temp">+{ev.tempGain}</span>
              )}
              <span className="tl-at">{timeAgo(ev.at)}</span>
            </li>
          ))}
        </ul>
      )}

      {/* 모임 — 활동중/검토중/완료 통합 리스트 */}
      {moimList.length > 0 ? (
        <>
          <div className="sec">
            <h2>모임</h2>
            <span className="more">{moimList.length}개</span>
          </div>
          <ul className="moim-list">
            {moimList.map(({ activity, label, cls }) => (
              <li key={activity.id} className="moim-row">
                <Link href={`/activities/${activity.id}`} className="moim-link">
                  <span className="moim-type">{activity.type === "study" ? "스터디" : "프로젝트"}</span>
                  <span className="moim-title">{activity.title}</span>
                </Link>
                <span className={`moim-badge ${cls}`}>{label}</span>
              </li>
            ))}
          </ul>
        </>
      ) : isMe ? (
        <>
          <div className="sec">
            <h2>모임</h2>
          </div>
          <p className="page-sub">아직 참여한 모임이 없어요. 스터디나 프로젝트에 지원해보세요.</p>
        </>
      ) : null}

      <div className="sec">
        <h2>{isMe ? "내 공식" : `${callName}님의 공식`}</h2>
        <span className="more">{formulas.length}개</span>
      </div>

      {formulas.length === 0 ? (
        <p className="page-sub">
          {isMe
            ? "아직 작성한 공식이 없어요. 첫 AX 공식을 기록해보세요."
            : "아직 작성한 공식이 없어요."}
        </p>
      ) : (
        <ProfileFormulaGrid posts={formulas} />
      )}

      {isMe && (
        <>
          <div className="sec">
            <h2>북마크한 공식</h2>
            <span className="more">{savedPosts.length}개</span>
          </div>
          {savedPosts.length === 0 ? (
            <p className="page-sub">
              아직 저장한 공식이 없어요. 마음에 드는 공식을 북마크해보세요.
            </p>
          ) : (
            <ProfileFormulaGrid posts={savedPosts} />
          )}
          {topTags.length > 0 && (
            <>
              <div className="sec">
                <h2>자주 보는 태그</h2>
                <div className="badge-help">
                  ?
                  <div className="badge-tooltip">
                    <p className="badge-tooltip-title">자주 보는 태그</p>
                    <p className="badge-tooltip-desc">북마크한 공식의 태그를 집계한 관심 분야예요.</p>
                    <p className="badge-tooltip-desc">클릭하면 해당 태그로 검색해요.</p>
                  </div>
                </div>
              </div>
              <div className="chips pf-tags">
                {topTags.map(({ tag }) => (
                  <Link key={tag} href={`/search?q=${encodeURIComponent(tag)}`}>
                    <Chip>#{tag}</Chip>
                  </Link>
                ))}
              </div>
            </>
          )}
        </>
      )}
      {isMe && <SignOutButton className="pf-signout" />}
    </div>
  );
}
