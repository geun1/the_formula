import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getActivity } from "@/lib/queries";
import { auth } from "@/auth";
import type { ActivityType, ApplicationStatus } from "@/lib/contract";
import { ShareButton } from "@/components/ui";
import { ApplyForm } from "../apply-form";
import { OwnerPanel } from "./owner-panel";

const TYPE_LABEL: Record<ActivityType, string> = {
  study: "스터디",
  project: "프로젝트",
};

const APP_STATUS_LABEL: Record<ApplicationStatus, string> = {
  pending: "검토 중",
  accepted: "수락됨",
  rejected: "반려됨",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await getActivity(id);
  if (!detail) return { title: "모임을 찾을 수 없어요 — The Formula" };
  return {
    title: `${detail.activity.title} — The Formula`,
    description: detail.activity.summary,
  };
}

/** createdAt → "N시간 전 / N일 전 / 방금 전". */
function timeAgo(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const h = Math.floor(diff / (60 * 60 * 1000));
  if (h < 1) return "방금 전";
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  const detail = await getActivity(id, viewerId);
  if (!detail) notFound();

  const { activity, applicants, myApplication } = detail;
  const isOwner = viewerId === activity.ownerId;
  const isRecruiting = activity.status === "recruiting";
  const isNew =
    Date.now() - new Date(activity.createdAt).getTime() <
    24 * 60 * 60 * 1000;
  const capacityLabel =
    activity.capacity > 0 ? `${activity.capacity}명` : "제한 없음";

  return (
    <div className="wrap">
      <Link href={`/activities`} className="back">
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
        모임
      </Link>

      <div
        className="md-badges"
        style={{ display: "flex", gap: "8px", marginBottom: "12px" }}
      >
        <span
          className={`mp-badge ${
            activity.type === "project" ? "proj" : "study"
          }`}
        >
          {TYPE_LABEL[activity.type]}
        </span>
        {isNew && <span className="mp-badge new">따끈따끈 새글</span>}
        {!isRecruiting && <span className="mp-badge closed">마감</span>}
      </div>

      <h1 className="md-main-title">{activity.title}</h1>

      <div className="md-stats">
        <span className="md-stat">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          {activity.applicantCount ?? 0}명 지원
        </span>
        <span className="md-stat">{timeAgo(activity.createdAt)}</span>
      </div>

      <div className="md-info-grid">
        <div className="md-info-item">
          <div className="md-info-label">정원</div>
          <div className="md-info-value">{capacityLabel}</div>
        </div>
        <div className="md-info-item">
          <div className="md-info-label">구분</div>
          <div className="md-info-value">{TYPE_LABEL[activity.type]}</div>
        </div>
        {activity.season && (
          <div className="md-info-item">
            <div className="md-info-label">기수 · 시즌</div>
            <div className="md-info-value">{activity.season}</div>
          </div>
        )}
        <div className="md-info-item">
          <div className="md-info-label">모임장</div>
          <div className="md-info-value">{activity.ownerName}</div>
        </div>
      </div>

      {activity.summary && (
        <div className="md-section">
          <div className="md-section-title">한 줄 소개</div>
          <p className="md-section-body">{activity.summary}</p>
        </div>
      )}

      {activity.tags.length > 0 && (
        <div className="md-section">
          <div className="md-section-title">사용 도구</div>
          <div className="md-chips">
            {activity.tags.map((t) => (
              <span key={t} className="tool-chip">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="md-section">
        <div className="md-section-title">모임 소개</div>
        <p className="md-section-body" style={{ whiteSpace: "pre-wrap" }}>
          {activity.description}
        </p>
      </div>

      {/* 지원 / 소유자 패널 — md-apply 액션 행 */}
      {isOwner ? (
        <OwnerPanel
          activityId={activity.id}
          status={activity.status}
          applicants={applicants}
        />
      ) : myApplication ? (
        <div className="md-section">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div className="md-section-title" style={{ marginBottom: 0 }}>
              지원을 완료했어요
            </div>
            <span className="mp-badge proj">
              {APP_STATUS_LABEL[myApplication.status]}
            </span>
          </div>
          <p
            className="md-section-body"
            style={{
              marginTop: "12px",
              whiteSpace: "pre-wrap",
              background: "var(--bg-2)",
              borderRadius: "12px",
              padding: "14px 16px",
            }}
          >
            {myApplication.message}
          </p>
        </div>
      ) : !isRecruiting ? (
        <div className="md-section">
          <div className="md-section-title">모집이 마감됐어요</div>
          <p className="md-section-body" style={{ marginBottom: "16px" }}>
            다른 모집 중인 모임을 둘러보세요.
          </p>
          <div className="md-apply">
            <Link href="/activities" className="btn btn-ghost">
              모임 둘러보기
            </Link>
            <ShareButton variant="detail" label="공유" />
          </div>
        </div>
      ) : !viewerId ? (
        <div className="md-section">
          <div className="md-section-title">함께하고 싶으신가요?</div>
          <p className="md-section-body" style={{ marginBottom: "16px" }}>
            지원하려면 로그인이 필요해요.
          </p>
          <div className="md-apply">
            <Link href="/account" className="btn btn-primary">
              로그인하고 지원하기
            </Link>
            <ShareButton variant="detail" label="공유" />
          </div>
        </div>
      ) : (
        <div className="md-section">
          <div className="md-section-title">이 모임에 지원하기</div>
          <p className="md-section-body" style={{ marginBottom: "16px" }}>
            모임장에게 전할 메시지를 남겨주세요.
          </p>
          <ApplyForm activityId={activity.id} />
          <div className="md-apply">
            <ShareButton variant="detail" label="공유" />
          </div>
        </div>
      )}
    </div>
  );
}
