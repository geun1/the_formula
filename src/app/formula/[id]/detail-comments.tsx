"use client";

import { useState, useTransition } from "react";
import { Avatar, GradeBadge } from "@/components/ui";
import type { Comment } from "@/lib/contract";
import { addComment } from "@/app/actions";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR");
}

export type DetailCommentsProps = {
  postId: string;
  comments: Comment[];
  loggedIn: boolean;
  viewerId: string | null;
  viewerName?: string | null;
};

/**
 * 공식 상세 댓글 섹션 — reference.css 의 .comment-section / .cs-head / .ci-* / .comment-item 스킨.
 * view-02-detail.html 마크업 복제. contenteditable 대신 우리 입력을 와이어.
 */
export function DetailComments({
  postId,
  comments,
  loggedIn,
  viewerId,
  viewerName,
}: DetailCommentsProps) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const value = body.trim();
    if (!value) {
      setError("내용을 입력해 주세요.");
      return;
    }
    startTransition(async () => {
      const res = await addComment(postId, value);
      if (res.ok) {
        setBody("");
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="comment-section" id="comment-section">
      <div className="cs-head">
        <h2>피드백</h2>
        <span className="cs-count">{comments.length}</span>
      </div>

      {loggedIn ? (
        <div className="ci-wrap">
          <Avatar
            id={viewerId ?? "me"}
            name={viewerName ?? "나"}
            variant="sm"
          />
          <div className="ci-box" style={{ flex: 1 }}>
            <textarea
              className="ci-field"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              placeholder="이 공식에 피드백을 남겨보세요."
              aria-label="피드백 작성"
              style={{
                width: "100%",
                border: "none",
                background: "transparent",
                resize: "vertical",
              }}
            />
            <div className="ci-bar">
              <span className="ci-hint">
                {error ? (
                  <span style={{ color: "#F03E3E" }}>{error}</span>
                ) : (
                  <>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <path d="M4 7h16M4 12h10M4 17h7" />
                    </svg>
                    적용 경험을 나눠보세요
                  </>
                )}
              </span>
              <button
                type="button"
                className="ci-submit"
                onClick={submit}
                disabled={pending || !body.trim()}
              >
                {pending ? "등록 중…" : "등록"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 14, color: "var(--t3)", marginBottom: 24 }}>
          피드백을 남기려면{" "}
          <a href="/account" style={{ color: "var(--blue)", fontWeight: 600 }}>
            로그인
          </a>
          이 필요해요.
        </p>
      )}

      <div>
        {comments.length === 0 ? (
          <p style={{ fontSize: 14, color: "var(--t3)", padding: "20px 0" }}>
            아직 피드백이 없어요. 첫 피드백을 남겨보세요.
          </p>
        ) : (
          comments.map((c) => (
            <div className="comment-item" key={c.id}>
              <Avatar
                id={c.userId}
                name={c.authorName}
                src={c.authorImage}
                variant="sm"
              />
              <div className="ci-body">
                <div className="ci-row">
                  <span className="ci-name">{c.authorName}</span>
                  <GradeBadge tier={c.authorTier} iconOnly />
                  <span className="ci-time">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="ci-text">{c.body}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
