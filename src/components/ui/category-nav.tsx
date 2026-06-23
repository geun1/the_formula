import Link from "next/link";
import { CATEGORIES, categories, type Category } from "@/lib/contract";

export type CategoryNavItem = {
  /** null = 전체 */
  value: Category | null;
  label: string;
  href: string;
};

export type CategoryNavProps = {
  /** 현재 선택된 카테고리 (null = 전체) */
  active?: Category | null;
  /** href 빌더 (기본 ?category=<value>) */
  hrefFor?: (value: Category | null) => string;
  /**
   * 레퍼런스 스킨:
   * - feed = 홈 피드 좌측 세로 칩(.feed-cats > .cat)
   * - dir  = 아카이브/멤버 좌측 네비(.dir-nav > .dn-item)
   */
  variant?: "feed" | "dir";
  /** "전체" 항목 라벨 */
  allLabel?: string;
  /** dir 변형 헤더 라벨(.dir-nav-head) */
  title?: string;
  className?: string;
};

const DN_ICON = (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 2.8 12V4.8A2 2 0 0 1 4.8 2.8H12a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.8z" />
    <path d="M7.5 7.5h.01" />
  </svg>
);

/**
 * 카테고리 네비. reference.css 의 .feed-cats(.cat) / .dir-nav(.dn-item) 스킨.
 * 활성 = .on(블루 틴트).
 */
export function CategoryNav({
  active = null,
  hrefFor,
  variant = "feed",
  allLabel = "전체",
  title = "카테고리",
  className,
}: CategoryNavProps) {
  const build = hrefFor ?? ((v: Category | null) => (v ? `/?category=${v}` : "/"));

  const items: CategoryNavItem[] = [
    { value: null, label: allLabel, href: build(null) },
    ...CATEGORIES.map((c) => ({
      value: c,
      label: categories[c].label,
      href: build(c),
    })),
  ];

  if (variant === "dir") {
    return (
      <nav className={["dir-nav", className].filter(Boolean).join(" ")}>
        {title && <div className="dir-nav-head">{title}</div>}
        {items.map((it) => {
          const on = (active ?? null) === it.value;
          return (
            <Link
              key={it.label}
              href={it.href}
              aria-current={on ? "page" : undefined}
              className={["dn-item", on ? "on" : ""].filter(Boolean).join(" ")}
            >
              {DN_ICON}
              {it.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  // feed
  return (
    <nav className={["feed-cats", className].filter(Boolean).join(" ")}>
      {items.map((it) => {
        const on = (active ?? null) === it.value;
        return (
          <Link
            key={it.label}
            href={it.href}
            aria-current={on ? "page" : undefined}
            className={["cat", on ? "on" : ""].filter(Boolean).join(" ")}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
