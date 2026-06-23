import Link from "next/link";
import type { ReactNode } from "react";
import type { Activity, User } from "@/lib/contract";
import { Avatar } from "./avatar";
import { GradeBadge } from "./grade-badge";

// =============================================================================
// 사이드 위젯 (DESIGN §5-3 우측 컬럼) — 흰 카드 + 헤더 + 더보기
// =============================================================================

export type SideWidgetProps = {
  title: string;
  moreLabel?: string;
  moreHref?: string;
  children: ReactNode;
  className?: string;
};

/** 공통 사이드 위젯 셸: 흰 카드 · 제목 · 우측 더보기 링크. */
export function SideWidget({
  title,
  moreLabel = "더 보기",
  moreHref,
  children,
  className,
}: SideWidgetProps) {
  return (
    <section
      className={`rounded-[16px] border border-border bg-card p-5 shadow-soft ${className ?? ""}`.trim()}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-tight text-t1">{title}</h2>
        {moreHref && (
          <Link
            href={moreHref}
            className="text-xs font-medium text-t3 transition-colors hover:text-accent"
          >
            {moreLabel} →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

const ACTIVITY_TYPE_LABEL: Record<Activity["type"], string> = {
  study: "스터디",
  project: "프로젝트",
};

export type RecruitingActivitiesProps = {
  activities: Activity[];
  moreHref?: string;
  className?: string;
};

/** 모집 중인 모임 위젯 (프로젝트/스터디 칩 + 제목). */
export function RecruitingActivities({
  activities,
  moreHref = "/activities",
  className,
}: RecruitingActivitiesProps) {
  return (
    <SideWidget title="모집 중인 모임" moreHref={moreHref} className={className}>
      <ul className="space-y-3">
        {activities.slice(0, 4).map((a) => (
          <li key={a.id}>
            <Link
              href={`/activities/${a.id}`}
              className="group flex flex-col gap-1.5"
            >
              <span className="inline-flex w-fit items-center rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                {ACTIVITY_TYPE_LABEL[a.type]}
              </span>
              <span className="line-clamp-1 text-sm font-medium transition-colors group-hover:text-accent">
                {a.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </SideWidget>
  );
}

export type RecommendedFormulasProps = {
  /** 추천 멤버(포뮬러) */
  members: User[];
  moreHref?: string;
  className?: string;
};

/** 추천 포뮬러 위젯 (멤버 아바타 + 이름 + 직무). */
export function RecommendedFormulas({
  members,
  moreHref = "/members",
  className,
}: RecommendedFormulasProps) {
  return (
    <SideWidget title="추천 포뮬러" moreHref={moreHref} className={className}>
      <ul className="space-y-3.5">
        {members.slice(0, 5).map((m) => (
          <li key={m.id}>
            <Link href={`/profile/${m.id}`} className="group flex items-center gap-3">
              <Avatar id={m.id} name={m.name} src={m.image} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium transition-colors group-hover:text-accent">
                    {m.name}
                  </span>
                  <GradeBadge tier={m.tier} iconOnly />
                </div>
                <p className="truncate text-xs text-t3">
                  {m.jobRole ?? m.role}
                  {m.company ? ` · ${m.company}` : ""}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </SideWidget>
  );
}
