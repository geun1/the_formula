// =============================================================================
// 자유 형식(Tiptap) HTML 새니타이즈 — 저장·렌더 전 XSS 차단
// =============================================================================
// Tiptap StarterKit + Link 가 만드는 태그만 허용. script/style/on* /
// javascript: 등은 전부 제거. 서버에서 호출(저장 시·렌더 시 이중 적용).
// =============================================================================
import sanitizeHtml from "sanitize-html";

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr",
    "h1", "h2", "h3", "h4",
    "strong", "b", "em", "i", "s", "u", "mark",
    "ul", "ol", "li",
    "blockquote",
    "pre", "code",
    "a",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    code: ["class"],
    pre: ["class"],
  },
  // http/https/mailto 만 허용(javascript: 등 차단)
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  // 링크는 새 탭 + noopener 강제
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        target: "_blank",
        rel: "noopener noreferrer nofollow",
      },
    }),
  },
  // style 속성/태그 전면 차단(인라인 CSS 주입 방지)
  allowedStyles: {},
};

/** 자유 형식 HTML 을 안전하게 정리. null/빈 입력은 "" 반환. */
export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, OPTIONS).trim();
}

/** 새니타이즈 후 태그를 벗겨 순수 텍스트 길이 확인용(빈 본문 검증). */
export function richTextLength(html: string | null | undefined): number {
  if (!html) return 0;
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim().length;
}
