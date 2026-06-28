"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

export type ListSearchProps = {
  placeholder?: string;
};

/**
 * 목록 페이지(아카이브·멤버 디렉토리)용 검색 입력.
 * 서버는 이미 q 파라미터로 검색을 지원하지만 입력 UI가 없었다 — 이를 보완한다.
 * 현재 쿼리스트링(직무/정렬 등)을 보존한 채 q 만 갱신해 같은 경로로 라우팅한다.
 */
export function ListSearch({ placeholder = "검색어를 입력해보세요" }: ListSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [, startTransition] = useTransition();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams(params.toString());
    const query = q.trim();
    if (query) sp.set("q", query);
    else sp.delete("q");
    startTransition(() => {
      const qs = sp.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  return (
    <form
      className="nav-search-bar"
      role="search"
      onSubmit={onSubmit}
      style={{ width: "100%", maxWidth: 360, padding: "9px 14px", borderRadius: 22 }}
    >
      <svg
        width="17"
        height="17"
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
