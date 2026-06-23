"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

/**
 * 포뮬러 디렉토리 정렬 — 레퍼런스 select.sort-select 스킨.
 * 변경 시 현재 q/jobRole 을 유지한 채 sort 파라미터만 갱신해 라우팅해요.
 */
export function MemberSort({
  current,
  options,
}: {
  current: string;
  options: readonly { value: string; label: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    const sp = new URLSearchParams(params.toString());
    if (value && value !== "latest") sp.set("sort", value);
    else sp.delete("sort");
    startTransition(() => {
      router.push(sp.toString() ? `/members?${sp}` : "/members");
    });
  }

  return (
    <select
      className="sort-select"
      value={current}
      onChange={onChange}
      aria-label="정렬"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
