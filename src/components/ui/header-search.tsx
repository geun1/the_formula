"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export type HeaderSearchProps = {
  action?: string;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
};

/**
 * 헤더 검색 input 바 (REFERENCE_DIFF §A-2-1).
 * 토스 그레이 필드. 입력 → /search?q= 로 이동.
 */
export function HeaderSearch({
  action = "/search",
  placeholder = "검색",
  defaultValue = "",
  className,
}: HeaderSearchProps) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `${action}?q=${encodeURIComponent(query)}` : action);
  }

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      className={`flex items-center gap-2 rounded-xl bg-bg-2 px-3 py-2 transition-colors focus-within:bg-white focus-within:ring-1 focus-within:ring-accent ${className ?? ""}`.trim()}
    >
      <span className="text-t3" aria-hidden>
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M14 14l3.5 3.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <input
        type="search"
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label="검색"
        className="w-36 min-w-0 bg-transparent text-sm text-t1 outline-none placeholder:text-t3 md:w-48 lg:w-60"
      />
    </form>
  );
}
