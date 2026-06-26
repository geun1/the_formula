"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewArticlePermission } from "@/app/actions";

type Req = {
  userId: string;
  name: string;
  email: string | null;
  note: string | null;
  createdAt: string;
};

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

/** 관리자(송근일) — 대기 중인 아티클 추가 권한 요청 승인/거절. */
export function PermissionRequests({ requests }: { requests: Req[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function review(userId: string, decision: "approve" | "reject") {
    startTransition(async () => {
      const res = await reviewArticlePermission(userId, decision);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="perm-admin">
      <div className="perm-admin-head">
        권한 요청 관리 <span className="cs-count">{requests.length}</span>
      </div>
      {requests.length === 0 ? (
        <p className="perm-desc">대기 중인 권한 요청이 없어요.</p>
      ) : (
        requests.map((r) => (
          <div className="perm-req" key={r.userId}>
            <div className="perm-req-main">
              <div className="perm-req-name">
                {r.name}
                {r.email ? (
                  <span className="perm-req-email"> · {r.email}</span>
                ) : null}
              </div>
              {r.note && <div className="perm-req-note">“{r.note}”</div>}
              <div className="perm-req-time">{timeAgo(r.createdAt)}</div>
            </div>
            <div className="perm-req-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={pending}
                onClick={() => review(r.userId, "approve")}
              >
                승인
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={pending}
                onClick={() => review(r.userId, "reject")}
              >
                거절
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
