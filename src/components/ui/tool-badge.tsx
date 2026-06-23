import { TOOL_TONE, toolKindOf } from "./tones";

export type ToolBadgeProps = {
  /** 도구명 (예: "ChatGPT", "Claude", "Zapier") */
  tool: string;
  size?: "sm" | "md";
  /** 반투명 흰 배경(커버 위 오버레이용) */
  onCover?: boolean;
  className?: string;
};

/**
 * 툴 칩 (AI 도구). DESIGN §2 — GPT/Claude/자동화/기타 별 색.
 * onCover=true 면 커버 그라데이션 위 반투명 흰 pill 로 표시(DESIGN §3 좌하단 뱃지).
 */
export function ToolBadge({ tool, size = "sm", onCover = false, className }: ToolBadgeProps) {
  const tone = TOOL_TONE[toolKindOf(tool)];
  const pad = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  if (onCover) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-xs font-semibold backdrop-blur-sm ${className ?? ""}`.trim()}
        style={{ color: tone.text }}
      >
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: tone.text }}
          aria-hidden
        />
        {tool}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${pad} ${className ?? ""}`.trim()}
      style={{ backgroundColor: tone.bg, color: tone.text, borderColor: tone.border }}
    >
      {tool}
    </span>
  );
}
