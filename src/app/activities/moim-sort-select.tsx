"use client";

import { useRouter } from "next/navigation";

export type MoimSortOption = { value: string; label: string; href: string };

export type MoimSortSelectProps = {
  /** 현재 정렬값 */
  value: string;
  /** 각 옵션 href 는 서버에서 미리 계산(필터 유지). RSC 규칙상 함수 prop 금지 → 문자열. */
  options: MoimSortOption[];
};

/** 모임 목록 정렬 셀렉트. reference.css 의 select.sort-select 스킨. 변경 시 라우팅. */
export function MoimSortSelect({ value, options }: MoimSortSelectProps) {
  const router = useRouter();
  return (
    <select
      className="sort-select"
      value={value}
      onChange={(e) => {
        const next = options.find((o) => o.value === e.target.value);
        if (next) router.push(next.href);
      }}
      aria-label="모임 정렬"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
