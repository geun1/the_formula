// =============================================================================
// 디자인 톤 헬퍼 — 토스 디자인 시스템 (REFERENCE_DIFF.md §A)
// =============================================================================
// 칩/뱃지/커버에서 공유하는 결정론적 색 정의. 인라인 style 로 적용해
// 토큰과 어긋나지 않게 한다. accent = 토스블루 #3182F6.
// =============================================================================
import type { Category } from "@/lib/contract";

export type Tone = {
  bg: string;
  text: string;
  border: string;
};

// ---- 카테고리 칩: 중립 토스 그레이 (bg-2 기반) ----
export const CATEGORY_TONE: Tone = {
  bg: "#f2f4f6", // --bg-2
  text: "#4e5968", // --t2
  border: "#eaedf0", // --border
};

/** 활성 필터/선택 상태 카테고리 톤 (토스블루 weak) */
export const CATEGORY_ACTIVE_TONE: Tone = {
  bg: "#eaf2fe", // --blue-weak
  text: "#3182f6", // --blue
  border: "#d6e6fd",
};

// ---- 검증됨 뱃지 (토스 그린) ----
export const VERIFIED_TONE: Tone = {
  bg: "#e6f8ef", // green-soft
  text: "#13b864", // --green
  border: "#bdedd4",
};

// ---- 툴 칩 (AI 도구) ----
export type ToolKind = "gpt" | "claude" | "automation" | "other";

export const TOOL_TONE: Record<ToolKind, Tone> = {
  gpt: { bg: "#e6f8ef", text: "#0a9d56", border: "#bdedd4" }, // 그린(OpenAI)
  claude: { bg: "#fdf0e7", text: "#d97742", border: "#f6dcc8" }, // 토스톤 오렌지(Anthropic)
  automation: { bg: "#eaf2fe", text: "#3182f6", border: "#d6e6fd" }, // 토스블루
  other: { bg: "#f2f4f6", text: "#4e5968", border: "#eaedf0" }, // 토스 그레이
};

/** 도구 문자열 → 툴 종류 (칩 색 결정). */
export function toolKindOf(tool: string): ToolKind {
  const t = tool.toLowerCase();
  if (/(gpt|chatgpt|openai|o1|o3|dall)/.test(t)) return "gpt";
  if (/(claude|anthropic|opus|sonnet|haiku)/.test(t)) return "claude";
  if (
    /(zapier|make|n8n|automat|자동화|workflow|워크플로우|api|webhook|script|스크립트)/.test(
      t,
    )
  )
    return "automation";
  return "other";
}

// ---- 카드 커버 그라데이션 (토스블루 중심 + 카테고리 톤 변주) ----
// 단일 accent(토스블루) 원칙. 카테고리별로 블루~시안~인디고 미세 변주.
export const CATEGORY_COVER: Record<Category, [string, string]> = {
  dev: ["#3182f6", "#2272eb"], // 토스블루
  design: ["#6478f6", "#5161e8"], // 인디고-블루
  pm: ["#3182f6", "#1b64da"], // 딥 블루
  marketing: ["#22b8cf", "#3182f6"], // 시안→블루
  data: ["#5b8def", "#3182f6"], // 페일 블루
  ai: ["#4593fb", "#3182f6"], // 라이트 토스블루
  insight: ["#13b864", "#1aa7c9"], // 그린→틸(인사이트 강조)
};
