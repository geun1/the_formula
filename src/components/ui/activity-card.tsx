import Link from "next/link";
import type { Activity, ActivityStatus, ActivityType } from "@/lib/contract";

const TYPE_META: Record<ActivityType, { label: string; icon: string }> = {
  study: { label: "스터디", icon: "📚" },
  project: { label: "프로젝트", icon: "🚀" },
};

const STATUS_META: Record<
  ActivityStatus,
  { label: string; bg: string; color: string }
> = {
  recruiting: { label: "모집 중", bg: "#E6F8EF", color: "#13B864" },
  ongoing: { label: "진행 중", bg: "rgba(49,130,246,0.1)", color: "#3182F6" },
  done: { label: "완료", bg: "var(--bg-2, #f2f4f6)", color: "var(--t3, #8b95a1)" },
};

const clamp2: React.CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

export type ActivityCardProps = {
  activity: Activity;
  /** href override (기본 /activities/[id]) */
  href?: string;
  className?: string;
};

/**
 * 모임 카드 (study/project). 상태 뱃지 + 정원/지원자 + 태그.
 * 여백은 인라인으로 지정 — reference.css 전역 리셋(*{padding/margin:0})이
 * Tailwind 여백 유틸(@layer)을 덮어버려 인라인으로 안전하게 처리한다.
 */
export function ActivityCard({ activity, href, className }: ActivityCardProps) {
  const type = TYPE_META[activity.type];
  const status = STATUS_META[activity.status];
  const url = href ?? `/activities/${activity.id}`;
  const applicants = activity.applicantCount ?? 0;

  return (
    <Link
      href={url}
      className={`card-lift ${className ?? ""}`.trim()}
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "18px 20px",
        border: "1px solid var(--border, #eaedf0)",
        borderRadius: 16,
        background: "var(--card, #fff)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 500,
            color: "var(--t3, #8b95a1)",
          }}
        >
          <span aria-hidden>{type.icon}</span>
          {type.label}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "3px 10px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            background: status.bg,
            color: status.color,
          }}
        >
          {status.label}
        </span>
      </div>

      <h3
        style={{
          margin: "12px 0 0",
          fontSize: 16,
          fontWeight: 700,
          lineHeight: 1.4,
          color: "var(--t1, #191f28)",
          ...clamp2,
        }}
      >
        {activity.title}
      </h3>
      {activity.summary && (
        <p
          style={{
            margin: "6px 0 0",
            fontSize: 14,
            lineHeight: 1.5,
            color: "var(--t2, #4e5968)",
            ...clamp2,
          }}
        >
          {activity.summary}
        </p>
      )}

      {activity.tags.length > 0 && (
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}
        >
          {activity.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              style={{
                fontSize: 12,
                color: "var(--t3, #8b95a1)",
                background: "var(--bg-2, #f2f4f6)",
                padding: "3px 8px",
                borderRadius: 6,
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginTop: 16,
          paddingTop: 12,
          borderTop: "1px solid var(--border, #eaedf0)",
          fontSize: 13,
          color: "var(--t3, #8b95a1)",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {activity.ownerName}
        </span>
        <span style={{ flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
          지원 {applicants}
          {activity.capacity > 0 ? ` / ${activity.capacity}명` : "명"}
        </span>
      </div>
    </Link>
  );
}
