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
} from "@/lib/queries";
import { Chip, GradeBadge, ActivityCard } from "@/components/ui";
import { avaFor, initialOf, fmtCount, timeAgo } from "@/lib/ref-style";
import type { ApplicationStatus } from "@/lib/contract";

// 내 지원 상태 라벨/색 클래스.
const APP_STATUS_LABEL: Record<ApplicationStatus, string> = {
  pending: "검토 중",
  accepted: "수락됨",
  rejected: "반려됨",
};
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

  // 북마크한 공식 — 본인 마이페이지에서만(저장함은 사적).
  const savedPosts = isMe ? await getSaved(user.id) : [];

  const role = [user.jobRole ?? user.role, user.company]
    .filter(Boolean)
    .join(" · ");

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

      <div className="profile-head">
        <div className={`avatar-lg ${avaFor(user.id)}`} aria-hidden>
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt=""
              style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            initialOf(user.name)
          )}
        </div>
        <div>
          <div className="pn">
            {user.name}{" "}
            <GradeBadge tier={user.tier} score={user.trustScore} iconOnly />
          </div>
          {role && <div className="pr">{role}</div>}
        </div>
      </div>

      <MannerTempCard stats={user.activityStats} />

      {user.bio && <p className="profile-bio">{user.bio}</p>}

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

      {isMe ? (
        <div className="profile-actions">
          <Link href="/account" className="btn btn-ghost">
            프로필 편집
          </Link>
        </div>
      ) : (
        <ProfileActions
          targetUserId={user.id}
          targetName={user.name}
          initialFollowing={isFollowing}
          initialSaved={initialSaved}
        />
      )}

      <div className="sec">
        <h2>활동 이력</h2>
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
              <span className="tl-emoji" aria-hidden>
                {ev.emoji}
              </span>
              {ev.href ? (
                <Link href={ev.href} className="tl-text">
                  {ev.text}
                </Link>
              ) : (
                <span className="tl-text">{ev.text}</span>
              )}
              <span className="tl-at">{timeAgo(ev.at)}</span>
            </li>
          ))}
        </ul>
      )}

      {/* 완주한 모임 — 공개(신뢰 신호) */}
      {completedActivities.length > 0 && (
        <>
          <div className="sec">
            <h2>완주한 모임</h2>
            <span className="more">{completedActivities.length}개 완주</span>
          </div>
          <div className="grid">
            {completedActivities.map(({ activity }) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        </>
      )}

      {/* 참여중인 모임 — 공개 */}
      {ongoingActivities.length > 0 && (
        <>
          <div className="sec">
            <h2>참여중인 모임</h2>
            <span className="more">{ongoingActivities.length}개</span>
          </div>
          <div className="grid">
            {ongoingActivities.map(({ activity }) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        </>
      )}

      {/* 지원 중 — 본인만(검토 대기) */}
      {isMe && pendingApplications.length > 0 && (
        <>
          <div className="sec">
            <h2>지원 중인 모임</h2>
            <span className="more">{pendingApplications.length}개</span>
          </div>
          <div className="grid">
            {pendingApplications.map(({ activity, status }) => (
              <div key={activity.id} className="applied-cell">
                <span className={`applied-status applied-${status}`}>
                  {APP_STATUS_LABEL[status]}
                </span>
                <ActivityCard activity={activity} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* 본인인데 모임 활동이 전혀 없을 때 */}
      {isMe &&
        completedActivities.length === 0 &&
        ongoingActivities.length === 0 &&
        pendingApplications.length === 0 && (
          <>
            <div className="sec">
              <h2>참여한 모임</h2>
            </div>
            <p className="page-sub">
              아직 참여한 모임이 없어요. 스터디나 프로젝트에 지원해보세요.
            </p>
          </>
        )}

      {user.interests.length > 0 && (
        <>
          <div className="sec">
            <h2>관심 분야</h2>
          </div>
          <div className="chips pf-tags">
            {user.interests.map((it) => (
              <Chip key={it}>{it}</Chip>
            ))}
          </div>
        </>
      )}

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
        </>
      )}
    </div>
  );
}
