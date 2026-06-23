"use client";

export type SortOption<T extends string = string> = {
  value: T;
  label: string;
};

export type SortTabsProps<T extends string = string> = {
  options: SortOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

/** 정렬 탭 (최신·인기·검증됨 등). 토스풍 세그먼트(흰 알약). 제어 컴포넌트. */
export function SortTabs<T extends string = string>({
  options,
  value,
  onChange,
  className,
}: SortTabsProps<T>) {
  return (
    <div
      className={`inline-flex items-center gap-1 rounded-xl bg-bg-2 p-1 ${className ?? ""}`.trim()}
      role="tablist"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all ${
            value === opt.value
              ? "bg-card text-t1 shadow-soft"
              : "text-t3 hover:text-t2"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export type SortDropdownProps<T extends string = string> = {
  options: SortOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

/**
 * 정렬 드롭다운 (REFERENCE_DIFF §A-6 "최신순 ▾"). 토스 네이티브 select 톤.
 * SortTabs 와 동일 props 로 교체 가능.
 */
export function SortDropdown<T extends string = string>({
  options,
  value,
  onChange,
  className,
}: SortDropdownProps<T>) {
  return (
    <div className={`relative inline-flex ${className ?? ""}`.trim()}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        aria-label="정렬"
        className="appearance-none rounded-xl border border-border-2 bg-surface py-2 pl-3.5 pr-9 text-sm font-semibold text-t1 outline-none transition-colors hover:bg-card-hover focus:border-accent"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-t3"
      >
        ▾
      </span>
    </div>
  );
}
