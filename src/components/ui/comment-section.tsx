"use client";

import { useState, useTransition } from "react";
import { Avatar, GradeBadge } from "@/components/ui";
import { ConfirmDialog } from "./confirm-dialog";
import type { CommentNode } from "@/lib/contract";
import { useRouter } from "next/navigation";
import { addComment, deleteComment } from "@/app/actions";

const PAGE = 10; // 최상위 스레드 페이지 크기

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

/** 트리 전체 댓글 수(답글 포함). */
function countAll(nodes: CommentNode[]): number {
  return nodes.reduce((n, c) => n + 1 + countAll(c.replies), 0);
}

export type DetailCommentsProps = {
  postId: string;
  comments: CommentNode[];
  loggedIn: boolean;
  /** 비로그인 시 입력 자리에 보여줄 본인 이니셜 시드(없으면 '나') */
  viewerId: string | null;
  viewerName?: string | null;
};

/** 답글 입력 폼(특정 댓글 아래). 등록 성공 시 revalidate 로 서버 댓글 갱신. */
function ReplyForm({
  postId,
  parentId,
  onDone,
}: {
  postId: string;
  parentId: string;
  onDone: () => void;
}) {
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
      const res = await addComment(postId, value, parentId);
      if (res.ok) {
        setBody("");
        onDone();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="ci-reply-form">
      <textarea
        className="ci-field"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
        placeholder="답글을 입력해요."
        aria-label="답글 작성"
        autoFocus
        style={{
          width: "100%",
          border: "1px solid var(--border)",
          borderRadius: 10,
          background: "var(--bg)",
          padding: "10px 12px",
          resize: "vertical",
          minHeight: 56,
        }}
      />
      <div className="ci-bar">
        <span className="ci-hint">
          {error ? <span style={{ color: "#F03E3E" }}>{error}</span> : ""}
        </span>
        <button
          type="button"
          className="ci-submit"
          onClick={submit}
          disabled={pending || !body.trim()}
        >
          {pending ? "등록 중…" : "답글 등록"}
        </button>
      </div>
    </div>
  );
}

/** 단일 댓글 + 그 답글(재귀). 무제한 중첩, 시각 들여쓰기는 .ci-replies 가 담당. */
// 일정 깊이 이상은 시각 들여쓰기를 멈춰(평탄) 깊은 스레드가 화면 밖으로 밀리는 것 방지.
const MAX_VISUAL_DEPTH = 4;

function CommentItem({
  node,
  postId,
  loggedIn,
  viewerId,
  depth = 0,
}: {
  node: CommentNode;
  postId: string;
  loggedIn: boolean;
  viewerId: string | null;
  depth?: number;
}) {
  const router = useRouter();
  const [replying, setReplying] = useState(false);
  const [deleting, startDelete] = useTransition();
  const isOwn = viewerId != null && node.userId === viewerId;

  function remove() {
    startDelete(async () => {
      const res = await deleteComment(node.id);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="comment-item">
      <Avatar
        id={node.userId}
        name={node.authorName}
        src={node.authorImage}
        variant="sm"
      />
      <div className="ci-body">
        <div className="ci-row">
          <span className="ci-name">{node.authorName}</span>
          {node.isAgent ? (
            <span className="ci-agent">AI</span>
          ) : (
            <GradeBadge tier={node.authorTier} iconOnly />
          )}
          <span className="ci-time">{timeAgo(node.createdAt)}</span>
        </div>
        <p className="ci-text">{node.body}</p>

        {(loggedIn || isOwn) && (
          <span style={{ display: "inline-flex", gap: 12 }}>
            {loggedIn && (
              <button
                type="button"
                className="ci-reply-btn"
                onClick={() => setReplying((v) => !v)}
              >
                {replying ? "취소" : "답글"}
              </button>
            )}
            {isOwn && (
              <ConfirmDialog
                onConfirm={remove}
                label={deleting ? "삭제 중…" : "삭제"}
                title="댓글을 삭제할까요?"
                message="달린 답글도 함께 삭제되며 되돌릴 수 없어요."
                className="ci-reply-btn"
                disabled={deleting}
              />
            )}
          </span>
        )}
        {replying && (
          <ReplyForm
            postId={postId}
            parentId={node.id}
            onDone={() => setReplying(false)}
          />
        )}

        {node.replies.length > 0 && (
          <div
            className={
              depth < MAX_VISUAL_DEPTH
                ? "ci-replies"
                : "ci-replies ci-replies-flat"
            }
          >
            {node.replies.map((r) => (
              <CommentItem
                key={r.id}
                node={r}
                postId={postId}
                loggedIn={loggedIn}
                viewerId={viewerId}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 상세 댓글 섹션 — 스레드(무제한 중첩 대댓글) + 최상위 페이지네이션('더 보기').
 * AI 큐레이터/페르소나 댓글은 AI 뱃지. reference.css .comment-* 스킨 + globals 보강.
 */
export function CommentSection({
  postId,
  comments,
  loggedIn,
  viewerId,
  viewerName,
}: DetailCommentsProps) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [visible, setVisible] = useState(PAGE);

  const total = countAll(comments);
  const shown = comments.slice(0, visible);
  const remaining = comments.length - visible;

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
        <h2>댓글</h2>
        <span className="cs-count">{total}</span>
      </div>

      {/* 최상위 입력 */}
      {loggedIn ? (
        <div className="ci-wrap">
          <Avatar id={viewerId ?? "me"} name={viewerName ?? "나"} variant="sm" />
          <div className="ci-box" style={{ flex: 1 }}>
            <textarea
              className="ci-field"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              placeholder="댓글을 남겨보세요."
              aria-label="댓글 작성"
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
                  "생각을 남겨보세요"
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
          댓글을 남기려면{" "}
          <a href="/account" style={{ color: "var(--blue)", fontWeight: 600 }}>
            로그인
          </a>
          이 필요해요.
        </p>
      )}

      {/* 스레드 목록 */}
      <div>
        {total === 0 ? (
          <p style={{ fontSize: 14, color: "var(--t3)", padding: "20px 0" }}>
            아직 댓글이 없어요. 첫 댓글을 남겨보세요.
          </p>
        ) : (
          shown.map((c) => (
            <CommentItem
              key={c.id}
              node={c}
              postId={postId}
              loggedIn={loggedIn}
              viewerId={viewerId}
            />
          ))
        )}
      </div>

      {remaining > 0 && (
        <button
          type="button"
          className="cs-more"
          onClick={() => setVisible((v) => v + PAGE)}
        >
          이전 댓글 더 보기
        </button>
      )}
    </div>
  );
}
