"use client";

import { useState } from "react";
import { toast } from "./toast";

export type ShareButtonProps = {
  /** 복사할 절대/상대 경로. 미지정 시 현재 페이지 URL. */
  url?: string;
  /**
   * 레퍼런스 스킨 위치:
   * - card   = 아카이브 카드 우상단 오버레이(.fcard-share)
   * - inline = fc-stats-row 안 인라인 아이콘(.fcard-share-inline)
   * - detail = 상세 액션바 라벨 버튼(.btn.btn-ghost)
   */
  variant?: "card" | "inline" | "detail";
  /** (호환) 아이콘만 — card/inline 과 동일 효과 */
  iconOnly?: boolean;
  /** 라벨(detail 변형에서 사용, 기본 "공유") */
  label?: string;
  size?: "sm" | "md";
  /** 토스트 메시지 */
  toastMessage?: string;
  className?: string;
  /** 부모 Link 클릭 방지 */
  stopPropagation?: boolean;
};

const SHARE_ICON = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
    <path d="M16 6l-4-4-4 4" />
    <path d="M12 2v13" />
  </svg>
);

/**
 * 링크 복사 공유 버튼. reference.css 의 .fcard-share / .fcard-share-inline / .btn 스킨.
 * 카드 안(부모가 Link)에서 쓰일 때 stopPropagation 으로 네비 방지.
 */
export function ShareButton({
  url,
  variant,
  iconOnly = false,
  label = "공유",
  toastMessage = "링크를 복사했어요",
  className,
  stopPropagation = true,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  // variant 미지정 시: iconOnly→card 오버레이, 아니면 detail 라벨 버튼.
  const v: "card" | "inline" | "detail" =
    variant ?? (iconOnly ? "card" : "detail");

  async function onClick(e: React.MouseEvent) {
    if (stopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }
    const href =
      url ?? (typeof window !== "undefined" ? window.location.href : "");
    const full =
      href.startsWith("http") || typeof window === "undefined"
        ? href
        : `${window.location.origin}${href}`;
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      toast(toastMessage);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한 없을 때 무시
    }
  }

  if (v === "detail") {
    const cls = ["btn", "btn-ghost", className].filter(Boolean).join(" ");
    return (
      <button type="button" onClick={onClick} className={cls}>
        {SHARE_ICON}
        {copied ? "복사됨" : label}
      </button>
    );
  }

  const base = v === "inline" ? "fcard-share-inline" : "fcard-share";
  const cls = [base, className].filter(Boolean).join(" ");
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cls}
    >
      {copied ? (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M5 12l5 5L20 6" />
        </svg>
      ) : (
        SHARE_ICON
      )}
    </button>
  );
}
