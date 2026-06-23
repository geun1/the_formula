import Link from "next/link";
import type { Metadata } from "next";
import { getMemberDirectory, currentUserId } from "@/lib/queries";
import { JOB_ROLES } from "@/lib/contract";
import { MemberDirGrid } from "./member-grid";
import { MemberSort } from "./member-sort";

export const metadata: Metadata = {
  title: "포뮬러 · The Formula",
  description: "AX를 실전에서 활용하는 동료(포뮬러)들을 만나보세요.",
};

/** 직무별 사이드바 아이콘(레퍼런스 dn-item SVG 스타일, stroke 2.2). */
function jobIcon(role: string | null) {
  // 전체
  if (role === null) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    );
  }
  switch (role) {
    case "개발":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
    case "기획":
    case "PM":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    case "디자인":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
        </svg>
      );
    case "마케팅":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
      );
    case "데이터":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      );
    case "AI/ML":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      );
    default:
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3l2.09 6.26L20.5 9.5l-5 4.1L17.2 20 12 16.3 6.8 20l1.7-6.4-5-4.1 6.41-.24z" />
        </svg>
      );
  }
}

const SORT_OPTIONS = [
  { value: "latest", label: "최신순" },
  { value: "popular", label: "인기순" },
  { value: "save", label: "저장순" },
] as const;

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; jobRole?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const jobRole = sp.jobRole ?? "";
  const sort = sp.sort ?? "latest";

  const viewerId = await currentUserId();
  const members = await getMemberDirectory({
    q: q || undefined,
    jobRole: jobRole || null,
    viewerId,
  });

  // 정렬(메모리) — 디렉토리는 기본 최신순(쿼리 정렬)이라 여기서 보정.
  const sorted = [...members].sort((a, b) => {
    if (sort === "popular") {
      return (
        b.followerCount - a.followerCount ||
        b.saveCount - a.saveCount ||
        b.formulaCount - a.formulaCount
      );
    }
    if (sort === "save") {
      return b.saveCount - a.saveCount || b.followerCount - a.followerCount;
    }
    return 0; // latest: 쿼리 순서 유지
  });

  /** 사이드바 항목 href 빌더(검색어/정렬 유지). */
  const buildHref = (role: string | null) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (role) params.set("jobRole", role);
    if (sort && sort !== "latest") params.set("sort", sort);
    const qs = params.toString();
    return qs ? `/members?${qs}` : "/members";
  };

  const catLabel = jobRole ? `${jobRole} 디렉토리` : "전체 디렉토리";

  return (
    <div className="wrap">
      <div className="dir-wrap">
        {/* 좌측 직무 카테고리 네비 */}
        <aside className="dir-nav">
          <div className="dir-nav-head">카테고리</div>
          <Link
            href={buildHref(null)}
            aria-current={!jobRole ? "page" : undefined}
            className={`dn-item${!jobRole ? " on" : ""}`}
          >
            {jobIcon(null)}전체
          </Link>
          {JOB_ROLES.map((role) => (
            <Link
              key={role}
              href={buildHref(role)}
              aria-current={jobRole === role ? "page" : undefined}
              className={`dn-item${jobRole === role ? " on" : ""}`}
            >
              {jobIcon(role)}
              {role}
            </Link>
          ))}
        </aside>

        {/* 메인 */}
        <div>
          <div className="dir-main-head">
            <div className="dir-title">
              <span>{catLabel}</span>
              <span className="dir-count">{sorted.length}명</span>
            </div>
            <MemberSort current={sort} options={SORT_OPTIONS} />
          </div>

          {sorted.length === 0 ? (
            <p className="page-sub">
              찾는 포뮬러가 없어요. 검색어나 직무 필터를 바꿔서 다시 찾아보세요.
            </p>
          ) : (
            <MemberDirGrid members={sorted} />
          )}
        </div>
      </div>
    </div>
  );
}
