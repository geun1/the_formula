"use client";

import { useRouter } from "next/navigation";

export type ArchiveSortValue = "latest" | "popular" | "save";

const OPTIONS: { value: ArchiveSortValue; label: string }[] = [
  { value: "latest", label: "최신순" },
  { value: "popular", label: "인기순" },
  { value: "save", label: "저장순" },
];

/**
 * 아카이브 정렬 select(레퍼런스 .sort-select 스킨).
 * 현재 검색/필터 쿼리스트링을 보존한 채 sort 만 교체해 URL push.
 */
export function ArchiveSortSelect({
  value,
  baseParams,
}: {
  value: ArchiveSortValue;
  /** sort 를 제외한 현재 쿼리스트링(예: "q=foo&jobRole=개발"). */
  baseParams: string;
}) {
  const router = useRouter();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as ArchiveSortValue;
    const params = new URLSearchParams(baseParams);
    if (next === "latest") params.delete("sort");
    else params.set("sort", next);
    const qs = params.toString();
    router.push(qs ? `/archive?${qs}` : "/archive", { scroll: false });
  }

  return (
    <select
      className="sort-select"
      value={value}
      onChange={onChange}
      aria-label="정렬"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
