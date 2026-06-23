"use client";

import { useState } from "react";

export type PromptBlockProps = {
  /** 복사 가능한 프롬프트/템플릿 텍스트 */
  content: string;
  /** 상단 라벨 (옵션, .d-block .lab 로 표기) */
  label?: string;
  className?: string;
};

/**
 * 복사 버튼이 달린 다크 프롬프트 블록. reference.css 의 .promptbox + .copy(.done) 스킨.
 */
export function PromptBlock({ content, label, className }: PromptBlockProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard 권한 없을 때 무시
    }
  }

  return (
    <div className={["promptbox", className].filter(Boolean).join(" ")}>
      <button
        type="button"
        onClick={copy}
        className={["copy", copied ? "done" : ""].filter(Boolean).join(" ")}
        aria-label={label ? `${label} 복사` : "프롬프트 복사"}
      >
        {copied ? "복사됨" : "복사"}
      </button>
      <pre>{content}</pre>
    </div>
  );
}
