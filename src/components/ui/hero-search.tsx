"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export type HeroSearchProps = {
  /** 검색 결과 경로 (기본 /search) */
  action?: string;
  placeholder?: string;
  /** 초기 값 */
  defaultValue?: string;
  className?: string;
};

/**
 * 다크 히어로 밴드 위 큰 검색 박스. reference.css 의 .hero-search-wrap / .hero-search 스킨.
 * 입력 → /search?q= 로 이동.
 */
export function HeroSearch({
  action = "/search",
  placeholder = "공식·포뮬러·모임을 검색해보세요",
  defaultValue = "",
  className,
}: HeroSearchProps) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `${action}?q=${encodeURIComponent(query)}` : action);
  }

  return (
    <div className={["hero-search-wrap", className].filter(Boolean).join(" ")}>
      <form className="hero-search" onSubmit={onSubmit} role="search">
        <span className="hs-icon" aria-hidden>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </span>
        <input
          type="search"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          aria-label="검색"
        />
      </form>
    </div>
  );
}
