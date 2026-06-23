"use client";

import {
  SaveButton,
  ShareButton,
  type ToggleResult,
} from "@/components/ui";
import { toggleBookmark } from "@/app/actions";

/**
 * 서버액션(ActionResult) → 공유 버튼이 기대하는 ToggleResult 어댑터.
 * 버튼은 useOptimistic 으로 반환값을 무시하므로 형태만 맞춰주면 돼요.
 */
const saveAdapter = async (postId: string): Promise<ToggleResult> => {
  const res = await toggleBookmark(postId);
  return { active: res.ok ? !!res.data?.saved : false };
};

export type ArticleActionsProps = {
  postId: string;
  initialSaved: boolean;
  initialSaveCount: number;
  initialLiked: boolean;
  initialLikeCount: number;
  /** 공유 링크(상세 경로) */
  shareUrl: string;
  /** 비로그인 시 저장 대신 안내 */
  loggedIn: boolean;
};

/**
 * 아티클 상세 상단 액션 바 — reference.css 의 .d-actions(sticky) + .btn 스킨.
 * 공식 저장(btn-primary) · 공유(btn-ghost). 공유는 비로그인도 가능.
 * '따라하기'는 본문 하단 '이 아티클로 만든 공식' 섹션의 큰 CTA로 이동했어요.
 */
export function ArticleActions({
  postId,
  initialSaved,
  initialSaveCount,
  shareUrl,
  loggedIn,
}: ArticleActionsProps) {
  return (
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
      <ShareButton url={shareUrl} variant="detail" stopPropagation={false} />
    </div>
  );
}
