import Link from "next/link";
import type { Activity, ActivityStatus, ActivityType } from "@/lib/contract";
import { Tag } from "./tag";

const TYPE_META: Record<ActivityType, { label: string; icon: string }> = {
  study: { label: "스터디", icon: "📚" },
  project: { label: "프로젝트", icon: "🚀" },
};

const STATUS_META: Record<
  ActivityStatus,
  { label: string; className: string }
> = {
  recruiting: {
    label: "모집 중",
    className: "border-transparent bg-green-soft text-green",
  },
  ongoing: {
    label: "진행 중",
    className: "border-transparent bg-accent-soft text-accent",
  },
  done: {
    label: "완료",
    className: "border-transparent bg-bg-2 text-t3",
  },
};

export type ActivityCardProps = {
  activity: Activity;
  /** href override (기본 /activities/[id]) */
  href?: string;
  className?: string;
};

/** 모임 카드 (study/project). 상태 뱃지 + 정원/지원자 + 태그. */
export function ActivityCard({ activity, href, className }: ActivityCardProps) {
  const type = TYPE_META[activity.type];
  const status = STATUS_META[activity.status];
  const url = href ?? `/activities/${activity.id}`;
  const applicants = activity.applicantCount ?? 0;

  return (
    <Link
      href={url}
      className={`card-lift group flex flex-col rounded-[16px] border border-border bg-card p-5 shadow-soft hover:border-accent/30 ${className ?? ""}`.trim()}
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
          <span aria-hidden>{type.icon}</span>
          {type.label}
        </span>
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      <h3 className="mt-3 line-clamp-2 text-base font-semibold leading-snug transition-colors group-hover:text-accent">
        {activity.title}
      </h3>
      {activity.summary && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">
          {activity.summary}
        </p>
      )}

      {activity.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {activity.tags.slice(0, 3).map((t) => (
            <Tag key={t} label={t} />
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-border-soft pt-3 text-xs text-muted">
        <span className="truncate">{activity.ownerName}</span>
        <span className="shrink-0 tabular-nums">
          지원 {applicants}
          {activity.capacity > 0 ? ` / ${activity.capacity}명` : "명"}
        </span>
      </div>
    </Link>
  );
}
