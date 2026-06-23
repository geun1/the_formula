"use client";

import { useRouter } from "next/navigation";

export type HomeSortOption = { value: string; label: string; href: string };

export type HomeSortSelectProps = {
  options: HomeSortOption[];
  value: string;
  className?: string;
};

/**
 * 홈/아카이브 정렬 드롭다운(URL 기반). reference.css 의 .sort-select 스킨
 * (네이티브 select + 내장 화살표 배경 SVG).
 * 선택 즉시 해당 옵션의 href 로 라우팅해요. (각 옵션 href 는 서버에서 미리 계산)
 * RSC 규칙상 클라이언트 컴포넌트엔 함수 prop 을 넘길 수 없어, 문자열 href 를 받아요.
 */
export function HomeSortSelect({ options, value, className }: HomeSortSelectProps) {
  const router = useRouter();
  return (
    <select
      value={value}
      onChange={(e) => {
        const next = options.find((o) => o.value === e.target.value);
        if (next) router.push(next.href);
      }}
      aria-label="정렬"
      className={["sort-select", className].filter(Boolean).join(" ")}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
