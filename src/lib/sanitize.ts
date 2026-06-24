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
    "img",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td", "colgroup", "col",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    code: ["class"],
    pre: ["class"],
    img: ["src", "alt"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
    col: ["span"],
  },
  // http/https/mailto 만 허용(javascript:/data: 등 차단)
  allowedSchemes: ["http", "https", "mailto"],
  // 이미지 src 는 http/https 만(data:/javascript: 차단)
  allowedSchemesByTag: { img: ["http", "https"] },
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

/**
 * 자유 본문(free-body) 렌더 전용 — 새니타이즈 후 <table>을 가로 스크롤 래퍼(.md-scroll-x)로
 * 감싼다. 모바일 좁은 폭에서 열이 많은 표가 페이지 전체를 밀어내지 않고 표 안에서만 스크롤되게.
 * (.md-table-wrap 은 border/radius 가 있어 free-body 표의 셀 보더와 이중선이 되므로, 보더 없는
 *  .md-scroll-x 로 감싼다.) sanitize-html 출력은 항상 well-formed 라 단순 치환으로 안전.
 * ⚠ div 는 새니타이즈 allowedTags 에 없으므로 반드시 "정리 후"(렌더 단계에서만) 감싸야 한다.
 */
export function renderFreeBody(html: string | null | undefined): string {
  const clean = sanitizeRichHtml(html);
  if (!clean) return "";
  return clean
    .replace(/<table(\s|>)/g, '<div class="md-scroll-x"><table$1')
    .replace(/<\/table>/g, "</table></div>");
}
