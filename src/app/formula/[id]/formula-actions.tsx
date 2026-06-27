"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  SaveButton,
  ShareButton,
  type ToggleResult,
} from "@/components/ui";
import { toggleBookmark, duplicateFormula, deletePost } from "@/app/actions";

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

  function onDuplicate() {
    setError(null);
    startTransition(async () => {
      const res = await duplicateFormula(postId);
      if (res.ok && res.data) {
        router.push(`/formula/${res.data.id}`);
      } else {
        setError(res.ok ? "복제에 실패했어요." : res.error);
      }
    });
  }

  function onDelete() {
    if (!window.confirm("이 공식을 삭제할까요? 되돌릴 수 없어요.")) return;
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
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onDuplicate}
            disabled={pending}
          >
            {pending ? "복제 중…" : "따라하기"}
          </button>
        ) : (
          <a href="/account" className="btn btn-ghost">
            따라하기
          </a>
        )}
        <ShareButton url={shareUrl} variant="detail" stopPropagation={false} />
        {isOwner && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onDelete}
            disabled={pending}
          >
            삭제
          </button>
        )}
      </div>
      {error && (
        <p style={{ fontSize: 13, color: "#F03E3E", marginTop: 8 }}>{error}</p>
      )}
    </div>
  );
}
