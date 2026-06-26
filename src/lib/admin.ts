// =============================================================================
// 관리자 판별 — env ADMIN_USER_IDS(쉼표구분 user.id 목록) 기반
// =============================================================================
// 별도 role 컬럼 없이 환경변수로 관리자 계정을 지정한다. 수동 '아티클 추가'처럼
// 공개 발행 + AI 비용이 드는 액션을 게이팅하는 데 사용.
// =============================================================================

/** 주어진 user.id 가 관리자(ADMIN_USER_IDS 에 포함)인지. */
export function isAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const ids = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.includes(userId);
}
