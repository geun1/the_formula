"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export type SearchBarProps = {
  /** 검색 결과 경로 (기본 /search) */
  action?: string;
  placeholder?: string;
  /** 초기 값 */
  defaultValue?: string;
};

/**
 * 검색 페이지 헤더의 contained 검색 바.
 * 레퍼런스 .nav-search-bar 스킨(라이트 그레이 필드, 어두운 글씨)을 page-head 폭에 맞춰
 * 풀폭으로 쓴다. 입력 → /search?q= 로 이동.
 */
export function SearchBar({
  action = "/search",
  placeholder = "공식·포뮬러·모임을 검색해보세요",
  defaultValue = "",
}: SearchBarProps) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `${action}?q=${encodeURIComponent(query)}` : action);
  }

  return (
    <form
      className="nav-search-bar"
      role="search"
      onSubmit={onSubmit}
      style={{ width: "100%", maxWidth: 460, padding: "11px 18px", borderRadius: 24 }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="search"
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label="검색"
      />
    </form>
  );
}
