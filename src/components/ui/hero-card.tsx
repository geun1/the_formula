import type { ReactNode } from "react";

export type HeroCardProps = {
  /** 블루 대문자 eyebrow (예: "6월 21일 토요일") */
  eyebrow?: string;
  /** 큰 흰 제목 */
  title: ReactNode;
  /** 서브 카피 */
  subtitle?: ReactNode;
  /** 제목/서브 아래 슬롯 — 보통 <HeroSearch /> */
  children?: ReactNode;
  /** 풀폭 다크 밴드로 렌더(기본) vs 둥근 카드 */
  fullBleed?: boolean;
  /** 하단 여유 padding (TOP5 카드가 겹쳐 올라올 공간) */
  withOverlapSpace?: boolean;
  className?: string;
};

/**
 * 홈 히어로 — 다크 네이비(#071330) 풀폭 밴드 (REFERENCE_DIFF §A-2-2).
 * eyebrow + 큰 흰 제목 + 서브 + 검색 박스 슬롯(children).
 * withOverlapSpace 로 하단 패딩을 키워 인기 TOP5 카드가 겹쳐 올라오게 한다.
 */
export function HeroCard({
  eyebrow,
  title,
  subtitle,
  children,
  fullBleed = true,
  withOverlapSpace = false,
  className,
}: HeroCardProps) {
  const shape = fullBleed ? "" : "rounded-[16px]";
  const bottomPad = withOverlapSpace ? "pb-28 md:pb-32" : "pb-12 md:pb-16";

  return (
    <section
      className={`hero-band relative overflow-hidden ${shape} ${className ?? ""}`.trim()}
    >
      {/* 은은한 블루 글로우 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, #3182f6 0%, transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, #13b864 0%, transparent 70%)" }}
      />

      <div
        className={`relative z-10 mx-auto w-full max-w-[680px] px-5 pt-14 text-center md:pt-20 ${bottomPad}`}
      >
        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-widest text-accent">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-3 text-[26px] font-bold leading-tight tracking-tight text-white md:text-[34px]">
          {title}
        </h1>
        {subtitle && (
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/65 md:text-base">
            {subtitle}
          </p>
        )}
        {children && <div className="mt-7">{children}</div>}
      </div>
    </section>
  );
}
