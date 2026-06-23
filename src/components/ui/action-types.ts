// 공유 UI 가 호출하는 서버액션 시그니처 (src/app/actions.ts 와 합의된 이름).
// 버튼들은 액션을 prop 으로 받아 호출하므로 actions.ts 존재 여부와 무관하게 컴파일됩니다.
// 페이지에서: import { toggleBookmark } from "@/app/actions"; <SaveButton action={toggleBookmark} .../>

/** 토글 결과: 최종 활성 상태 + 갱신된 카운트(옵션) */
export type ToggleResult = { active: boolean; count?: number };

/** toggleBookmark(postId) → 저장 토글 */
export type ToggleBookmarkAction = (postId: string) => Promise<ToggleResult>;

/** toggleLike(postId) → 좋아요 토글 */
export type ToggleLikeAction = (postId: string) => Promise<ToggleResult>;

/** toggleFollow(targetUserId) → 팔로우 토글 */
export type ToggleFollowAction = (targetUserId: string) => Promise<ToggleResult>;

/** toggleMemberBookmark(targetUserId) → 멤버(포뮬러) 저장 토글 (REFERENCE_DIFF §B-1) */
export type ToggleMemberBookmarkAction = (
  targetUserId: string,
) => Promise<ToggleResult>;

/** addComment(postId, body) → 생성된 댓글 id 등 (반환 형태 자유) */
export type AddCommentAction = (
  postId: string,
  body: string,
) => Promise<{ id: string } | void>;

/** duplicateFormula(postId) → 복제된 새 공식 id */
export type DuplicateFormulaAction = (
  postId: string,
) => Promise<{ id: string }>;
