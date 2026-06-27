"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/ui";
import {
  reviewApplication,
  updateActivityStatus,
  deleteActivity,
} from "@/app/actions";
import type { ActivityStatus, ApplicationStatus } from "@/lib/contract";

export type OwnerApplicant = {
  id: string;
  userId: string;
  userName: string;
  message: string;
  status: ApplicationStatus;
};

const APP_STATUS_LABEL: Record<ApplicationStatus, string> = {
  pending: "검토 중",
  accepted: "수락됨",
  rejected: "반려됨",
};

const APP_STATUS_BADGE: Record<ApplicationStatus, string> = {
  pending: "proj",
  accepted: "study",
  rejected: "closed",
};

const STATUS_FLOW: { value: ActivityStatus; label: string }[] = [
  { value: "recruiting", label: "모집중" },
  { value: "ongoing", label: "진행중" },
  { value: "done", label: "완료" },
];

/** 모임 소유자 관리 패널 — 상태 전환 · 삭제 · 지원자 수락/반려. */
export function OwnerPanel({
  activityId,
  status,
  applicants,
}: {
  activityId: string;
  status: ActivityStatus;
  applicants: OwnerApplicant[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function review(applicationId: string, decision: "accept" | "reject") {
    startTransition(async () => {
      const res = await reviewApplication(applicationId, decision);
      if (res.ok) router.refresh();
    });
  }

  function changeStatus(next: ActivityStatus) {
    if (next === status) return;
    startTransition(async () => {
      const res = await updateActivityStatus(activityId, next);
      if (res.ok) router.refresh();
    });
  }

  function remove() {
    if (!window.confirm("이 모임을 삭제할까요? 지원 내역도 함께 삭제돼요.")) {
      return;
    }
    startTransition(async () => {
      const res = await deleteActivity(activityId);
      if (res.ok) router.push("/activities");
    });
  }

  return (
    <div className="md-section">
      <div className="md-section-title">내가 만든 모임이에요</div>

      {/* 상태 전환 + 삭제 */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        {STATUS_FLOW.map((s) => (
          <button
            key={s.value}
            type="button"
            className={`btn ${s.value === status ? "btn-primary" : "btn-ghost"}`}
            disabled={pending}
            onClick={() => changeStatus(s.value)}
          >
            {s.label}
          </button>
        ))}
        <button
          type="button"
          className="btn btn-ghost"
          disabled={pending}
          onClick={remove}
          style={{ marginLeft: "auto" }}
        >
          삭제
        </button>
      </div>

      {/* 지원자 목록 */}
      {applicants.length === 0 ? (
        <p style={{ color: "var(--t3)", fontSize: 14, padding: "16px 0" }}>
          아직 지원자가 없어요.
        </p>
      ) : (
        <ul style={{ display: "grid", gap: 12, listStyle: "none", padding: 0 }}>
          {applicants.map((a) => (
            <li
              key={a.id}
              className="moim-post"
              style={{ cursor: "default", marginBottom: 0 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar id={a.userId} name={a.userName} variant="sm" />
                <Link
                  href={`/profile/${a.userId}`}
                  className="ci-name"
                  style={{ fontWeight: 700 }}
                >
                  {a.userName}
                </Link>
                <span
                  className={`mp-badge ${APP_STATUS_BADGE[a.status]}`}
                  style={{ marginLeft: "auto" }}
                >
                  {APP_STATUS_LABEL[a.status]}
                </span>
              </div>
              <p
                className="md-section-body"
                style={{ marginTop: 10, whiteSpace: "pre-wrap" }}
              >
                {a.message}
              </p>
              {a.status === "pending" && (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={pending}
                    onClick={() => review(a.id, "accept")}
                  >
                    수락
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={pending}
                    onClick={() => review(a.id, "reject")}
                  >
                    반려
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
