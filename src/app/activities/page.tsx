import type { Metadata } from "next";
import Link from "next/link";
import { getActivities } from "@/lib/queries";
import type { Activity, ActivityType } from "@/lib/contract";
import { ACTIVITY_TYPES } from "@/lib/contract";
import { MoimSortSelect } from "./moim-sort-select";

export const metadata: Metadata = {
  title: "모임 — The Formula",
  description:
    "함께 성장하는 AX 스터디와 프로젝트를 찾아보세요. 모집 중인 모임에 지원하거나 직접 모임을 열 수 있어요.",
};

type SortKey = "latest" | "popular" | "save";

const TYPE_LABEL: Record<ActivityType, string> = {
  study: "스터디",
  project: "프로젝트",
};

function isActivityType(v: string | undefined): v is ActivityType {
  return !!v && (ACTIVITY_TYPES as readonly string[]).includes(v);
}

function isSortKey(v: string | undefined): v is SortKey {
  return v === "latest" || v === "popular" || v === "save";
}

/** 생성 24시간 이내면 "따끈따끈 새글". */
function isNew(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000;
}

/** createdAt → "N시간 전 / N일 전 / 방금 전". */
function timeAgo(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const h = Math.floor(diff / (60 * 60 * 1000));
  if (h < 1) return "방금 전";
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

/** 마감/모집 상태 라벨(mp-due). */
function dueLabel(a: Activity): string {
  if (a.season) return a.season;
  if (a.status === "recruiting") return "모집 중";
  if (a.status === "ongoing") return "진행 중";
  return "마감";
}

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; sort?: string; only?: string }>;
}) {
  const sp = await searchParams;
  const activeType = isActivityType(sp.type) ? sp.type : null; // null = 전체
  const sort: SortKey = isSortKey(sp.sort) ? sp.sort : "latest";
  const openOnly = sp.only === "1";

  // 타입은 SQL 필터(전체면 미지정), 정렬·모집중만은 메모리에서.
  let activities = await getActivities(
    activeType ? { type: activeType } : {},
  );
  if (openOnly) {
    activities = activities.filter((a) => a.status === "recruiting");
  }
  if (sort === "popular" || sort === "save") {
    activities = [...activities].sort(
      (a, b) => (b.applicantCount ?? 0) - (a.applicantCount ?? 0),
    );
  }
  // latest: getActivities 가 이미 createdAt desc.

  const typeLabel = activeType ? TYPE_LABEL[activeType] : "전체 모임";

  /** 사이드/정렬 href 빌더(필터 상태 유지). */
  const buildHref = (next: {
    type?: ActivityType | null;
    sort?: SortKey;
    only?: boolean;
  }) => {
    const params = new URLSearchParams();
    const t = next.type === undefined ? activeType : next.type;
    const s = next.sort === undefined ? sort : next.sort;
    const o = next.only === undefined ? openOnly : next.only;
    if (t) params.set("type", t);
    if (s !== "latest") params.set("sort", s);
    if (o) params.set("only", "1");
    const qs = params.toString();
    return qs ? `/activities?${qs}` : "/activities";
  };

  return (
    <div className="wrap">
      <div className="dir-wrap">
        <aside className="dir-nav">
          <div className="dir-nav-head">모집 구분</div>

          <Link
            href={buildHref({ type: null })}
            className={`dn-item${activeType === null ? " on" : ""}`}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            전체
          </Link>

          <Link
            href={buildHref({ type: "project" })}
            className={`dn-item${activeType === "project" ? " on" : ""}`}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            프로젝트
          </Link>

          <Link
            href={buildHref({ type: "study" })}
            className={`dn-item${activeType === "study" ? " on" : ""}`}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            스터디
          </Link>

          <Link
            href={buildHref({ only: !openOnly })}
            className={`dn-item dn-toggle${openOnly ? " on" : ""}`}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            모집 중만
          </Link>
        </aside>

        <div>
          <div className="dir-main-head">
            <div className="dir-title">
              <span>{typeLabel}</span>
              <span className="dir-count">{activities.length}개</span>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <MoimSortSelect
                value={sort}
                options={[
                  { value: "latest", label: "최신순", href: buildHref({ sort: "latest" }) },
                  { value: "popular", label: "인기순", href: buildHref({ sort: "popular" }) },
                  { value: "save", label: "저장순", href: buildHref({ sort: "save" }) },
                ]}
              />
              <Link href="/activities/new" className="write-btn">
                ＋ 모집글 쓰기
              </Link>
            </div>
          </div>

          <div id="moim-list">
            {activities.length === 0 ? (
              <p
                style={{
                  color: "var(--t3)",
                  fontSize: "14px",
                  padding: "24px 4px",
                }}
              >
                조건에 맞는 모집글이 없어요.
              </p>
            ) : (
              activities.map((a) => {
                const open = a.status === "recruiting";
                return (
                  <Link
                    key={a.id}
                    href={`/activities/${a.id}`}
                    className="moim-post"
                    style={{ display: "block", textDecoration: "none" }}
                  >
                    <div className="mp-badges">
                      <span
                        className={`mp-badge ${
                          a.type === "project" ? "proj" : "study"
                        }`}
                      >
                        {TYPE_LABEL[a.type]}
                      </span>
                      {isNew(a.createdAt) && (
                        <span className="mp-badge new">따끈따끈 새글</span>
                      )}
                      {!open && <span className="mp-badge closed">마감</span>}
                    </div>
                    <h3 className="mp-title">{a.title}</h3>
                    {a.tags.length > 0 && (
                      <div className="mp-tools">
                        {a.tags.slice(0, 6).map((t) => (
                          <span key={t} className="tool-chip">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mp-foot">
                      <div className="mp-roles">
                        <span className="role">
                          지원 {a.applicantCount ?? 0}명
                        </span>
                      </div>
                      <div className="mp-dates">
                        <span>{timeAgo(a.createdAt)}</span>
                        <span className="mp-due">{dueLabel(a)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
