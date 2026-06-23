import Link from "next/link";

export type ChatButtonProps = {
  /** 대화 상대 userId */
  targetUserId: string;
  /** 상대 이름(라벨/접근성) */
  targetName?: string;
  /** 채팅 경로 빌더 (기본 /chat?to=<id>) */
  href?: string;
  size?: "sm" | "md";
  /** 아이콘만 */
  iconOnly?: boolean;
  /**
   * 레퍼런스 스킨: dc=멤버카드(.dc-chat) / ac=상세 사이드바(.ac-coffee).
   * (이전 soft/ghost 값도 받아 ac/dc 로 매핑 — 기존 호출 호환)
   */
  variant?: "dc" | "ac" | "soft" | "ghost";
  className?: string;
};

/**
 * 1:1 채팅(DM) 진입 버튼. reference.css 의 .dc-chat/.ac-coffee 스킨.
 * 멤버·작성자 카드/사이드바에서 "채팅"으로 노출 → /chat?to=<userId>.
 */
export function ChatButton({
  targetUserId,
  targetName,
  href,
  iconOnly = false,
  variant = "dc",
  className,
}: ChatButtonProps) {
  const url = href ?? `/chat?to=${encodeURIComponent(targetUserId)}`;
  // soft → ac(블루 틴트), ghost/dc → dc(중립). 명시적 ac/dc 우선.
  const base =
    variant === "ac" || variant === "soft" ? "ac-coffee" : "dc-chat";
  const cls = [base, className].filter(Boolean).join(" ");

  return (
    <Link
      href={url}
      aria-label={targetName ? `${targetName}님과 채팅` : "채팅"}
      className={cls}
    >
      {iconOnly ? "💬" : "채팅"}
    </Link>
  );
}
