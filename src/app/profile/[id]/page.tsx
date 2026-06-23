import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getProfile,
  currentUserId,
  isMemberBookmarked,
} from "@/lib/queries";
import { Chip, GradeBadge } from "@/components/ui";
import { avaFor, initialOf, fmtCount } from "@/lib/ref-style";
import { ProfileActions } from "./profile-follow";
import { ProfileFormulaGrid } from "./profile-grid";

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
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          ) : (
            initialOf(user.name)
          )}
        </div>
        <div>
          <div className="pn">
            {user.name}{" "}
            {/* 신뢰등급 뱃지 보조 표기 */}
            <GradeBadge tier={user.tier} score={user.trustScore} iconOnly />
          </div>
          {role && <div className="pr">{role}</div>}
        </div>
      </div>

      {user.bio && <p className="profile-bio">{user.bio}</p>}

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
    </div>
  );
}
