"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  SaveButton,
  ShareButton,
  ConfirmDialog,
  type ToggleResult,
} from "@/components/ui";
import { toggleBookmark, deletePost } from "@/app/actions";

/**
 * 실제 서버액션(ActionResult 반환)을 공유 버튼이 기대하는
 * ToggleResult 시그니처로 어댑트해요. 버튼은 반환값을 useOptimistic 으로 무시.
 */
const saveAdapter = async (postId: string): Promise<ToggleResult> => {
  const res = await toggleBookmark(postId);
  return { active: res.ok ? !!res.data?.saved : false };
};

export type FormulaActionsProps = {
  postId: string;
  initialSaved: boolean;
  initialSaveCount: number;
  initialLiked: boolean;
  initialLikeCount: number;
  /** 공유 링크(상세 경로) */
  shareUrl: string;
  /** 비로그인 시 안내 */
  loggedIn: boolean;
  /** 작성자 본인 여부(삭제 노출) */
  isOwner?: boolean;
};

/**
 * 공식 상세 상단 액션 바 — reference.css 의 .d-actions(sticky) + .btn 스킨.
 * 공식 저장(btn-primary) · 따라하기(btn-ghost, 복제) · 공유(btn-ghost). 공유는 비로그인도 가능.
 */
export function FormulaActions({
  postId,
  initialSaved,
  initialSaveCount,
  shareUrl,
  loggedIn,
  isOwner = false,
}: FormulaActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // 따라하기 — 내용 복제 없이, 원본을 출처로 연결한 새 공식 작성 화면으로 이동.
  function onFollow() {
    router.push(`/archive/new?ref=${postId}`);
  }

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deletePost(postId);
      if (res.ok) router.push("/archive");
      else setError(res.error);
    });
  }

  return (
    <div>
      <div className="d-actions">
        {loggedIn ? (
          <SaveButton
            postId={postId}
            initialSaved={initialSaved}
            initialCount={initialSaveCount}
            action={saveAdapter}
          />
        ) : (
          <a href="/account" className="btn btn-primary">
            로그인하고 저장
          </a>
        )}
        {loggedIn ? (
          <button type="button" className="btn btn-ghost" onClick={onFollow}>
            따라하기
          </button>
        ) : (
          <a href="/account" className="btn btn-ghost">
            따라하기
          </a>
        )}
        <ShareButton url={shareUrl} variant="detail" stopPropagation={false} />
        {isOwner && (
          <ConfirmDialog
            onConfirm={onDelete}
            label="삭제"
            title="공식을 삭제할까요?"
            message="이 공식을 삭제하면 되돌릴 수 없어요."
            className="btn btn-ghost"
            disabled={pending}
          />
        )}
      </div>
      {error && (
        <p style={{ fontSize: 13, color: "#F03E3E", marginTop: 8 }}>{error}</p>
      )}
    </div>
  );
}
