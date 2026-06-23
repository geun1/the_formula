"use client";

import { DIFFICULTIES, type Difficulty } from "@/lib/contract";

export type FilterState = {
  jobRole?: string | null;
  tool?: string | null;
  workType?: string | null;
  difficulty?: Difficulty | null;
};

export type FilterBarProps = {
  value: FilterState;
  onChange: (next: FilterState) => void;
  /** 셀렉트 옵션 풀 (페이지에서 데이터 기반 주입) */
  jobRoles?: string[];
  tools?: string[];
  workTypes?: string[];
  /** 초기화 노출 */
  onReset?: () => void;
  className?: string;
};

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  beginner: "입문",
  intermediate: "중급",
  advanced: "고급",
};

function Select({
  label,
  value,
  options,
  onChange,
  renderLabel,
}: {
  label: string;
  value: string | null | undefined;
  options: string[];
  onChange: (v: string | null) => void;
  renderLabel?: (v: string) => string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-t2">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="rounded-xl border border-border-2 bg-surface px-3 py-2 text-sm text-t1 outline-none transition-colors hover:bg-card-hover focus:border-accent"
      >
        <option value="">전체</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {renderLabel ? renderLabel(o) : o}
          </option>
        ))}
      </select>
    </label>
  );
}

/** 아카이브/멤버 필터 바: 직무·도구·업무유형·난이도 셀렉트. 제어 컴포넌트. */
export function FilterBar({
  value,
  onChange,
  jobRoles = [],
  tools = [],
  workTypes = [],
  onReset,
  className,
}: FilterBarProps) {
  const hasActive =
    value.jobRole || value.tool || value.workType || value.difficulty;

  return (
    <div
      className={`flex flex-wrap items-end gap-3 rounded-[16px] border border-border bg-card p-4 shadow-soft ${className ?? ""}`.trim()}
    >
      {jobRoles.length > 0 && (
        <Select
          label="직무"
          value={value.jobRole}
          options={jobRoles}
          onChange={(v) => onChange({ ...value, jobRole: v })}
        />
      )}
      {tools.length > 0 && (
        <Select
          label="도구"
          value={value.tool}
          options={tools}
          onChange={(v) => onChange({ ...value, tool: v })}
        />
      )}
      {workTypes.length > 0 && (
        <Select
          label="업무유형"
          value={value.workType}
          options={workTypes}
          onChange={(v) => onChange({ ...value, workType: v })}
        />
      )}
      <Select
        label="난이도"
        value={value.difficulty}
        options={[...DIFFICULTIES]}
        onChange={(v) => onChange({ ...value, difficulty: v as Difficulty | null })}
        renderLabel={(v) => DIFFICULTY_LABEL[v as Difficulty]}
      />
      {hasActive && onReset && (
        <button
          onClick={onReset}
          className="ml-auto rounded-lg px-3 py-2 text-sm font-medium text-t3 transition-colors hover:text-t1"
        >
          초기화
        </button>
      )}
    </div>
  );
}
