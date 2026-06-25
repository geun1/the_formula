// =============================================================================
// 사이트 절대 URL · OG(소셜 미리보기) 공통값
// =============================================================================
// 슬랙/카카오/디스코드 등 링크 언퍼는 절대경로 og:image / og:url 을 요구한다.
// metadataBase(layout) 가 상대경로를 이 베이스로 절대화하고, 외부/Blob 절대 URL 은
// 그대로 둔다. 배포 환경에서 NEXT_PUBLIC_SITE_URL 로 덮어쓸 수 있다.
// =============================================================================

/** 사이트 정식 베이스 URL(끝 슬래시 없음). prod alias 고정, env 로 override 가능. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://the-formula-silk.vercel.app"
).replace(/\/+$/, "");

export const SITE_NAME = "The Formula";

/** 커버/이미지가 없을 때 쓰는 기본 OG 이미지(별하늘 히어로). 상대경로 → metadataBase 로 절대화. */
export const DEFAULT_OG_IMAGE = "/hero-stars.jpg";

/**
 * og:image 로 쓸 URL 을 고른다.
 * - 커버(절대 URL: Vercel Blob/외부 og:image)가 있으면 그것을,
 * - 없으면 기본 이미지(metadataBase 로 절대화됨)를 반환.
 */
export function ogImage(cover?: string | null): string {
  return cover && cover.trim() ? cover.trim() : DEFAULT_OG_IMAGE;
}
