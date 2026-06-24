"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { initialOf } from "@/lib/ref-style";

export type NavUser = { id: string; name: string | null; image: string | null } | null;

// 레퍼런스 nav: 아티클/아카이브/포뮬러/모임 (chrome-header.html line18-23)
const LINKS = [
  { href: "/", label: "아티클" },
  { href: "/archive", label: "아카이브" },
  { href: "/members", label: "포뮬러" },
  { href: "/activities", label: "모임" },
];

// 워드마크 SVG — chrome-header.html line7-16 그대로(스크롤 전엔 흰색, scrolled 시 reference.css 가 색 전환).
function Wordmark() {
  return (
    <svg width="88" height="28" viewBox="0 0 59 19" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1.89613 8.58571H6.41548V10.2H1.89613V14H0V4H7V5.61429H1.89613V8.58571Z" fill="currentColor" />
      <circle cx="13" cy="9" r="5" fill="#3182F6" />
      <path d="M29.1143 7.5L25.9415 12.8857H25.0435L21.8707 7.61429V14H20V4H21.6463L25.5224 10.5143L29.3388 4H30.985L31 14H29.1293L29.1143 7.5Z" fill="currentColor" />
      <path d="M37.0068 14C35.7391 14 34.7521 13.6156 34.0458 12.8467C33.3486 12.0778 33 10.9761 33 9.54149V4H34.82V9.47117C34.82 11.3558 35.5535 12.2982 37.0204 12.2982C38.4782 12.2982 39.2071 11.3558 39.2071 9.47117V4H41V9.54149C41 10.9761 40.6469 12.0778 39.9406 12.8467C39.2434 13.6156 38.2654 14 37.0068 14Z" fill="currentColor" />
      <path d="M44.9706 4V12.3571H50V14H43V4H44.9706Z" fill="currentColor" />
      <path d="M50.0672 14L51.0329 11.7286L53.4925 5.98571L55.9218 11.7286L56.8875 14H59L54.4883 4H52.4966L48 14H50.0672Z" fill="currentColor" />
      <circle cx="13.1924" cy="9.19216" r="5" transform="rotate(45 13.1924 9.19216)" fill="#3182F6" />
      <ellipse cx="13.1924" cy="9.19216" rx="2" ry="8" transform="rotate(45 13.1924 9.19216)" fill="#3182F6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function NavBar({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [q, setQ] = useState("");

  // 투명(흰 글씨) topbar 는 **홈 다크 히어로 위 + 최상단**에서만. 그 외(비홈 페이지,
  // 또는 스크롤 후)에는 항상 프로스티드 화이트(.scrolled). 레퍼런스 동작과 동일:
  // 비홈 뷰는 scrollY=0 에서도 topbar.scrolled (다크 로고). pathname 변경 시 재평가.
  const isHome = pathname === "/";
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  // 홈 최상단에서만 투명, 그 외엔 솔리드.
  const solid = !isHome || scrolled;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // 하단 탭바를 숨길 라우트(SSR 단계에서 결정 — FOUC 없음):
  //  · 채팅 스레드(/chat/[id]) — sticky 입력창이 탭바에 가리는 문제 해결(뒤로가기로 내비 복귀)
  //  · 비로그인 로그인 화면(/account) — 인증 카드 위에 탭바가 떠 폼을 가리는 문제 해결
  const hideTabbar =
    (pathname.startsWith("/chat/") && pathname !== "/chat") ||
    (pathname === "/account" && !user);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/search?q=${encodeURIComponent(term)}` : "/search");
  };

  return (
    <>
      <header className={`topbar${solid ? " scrolled" : ""}`}>
        <div className="topbar-inner">
          <Link href="/" className="logo" aria-label="The Formula 홈">
            <Wordmark />
          </Link>

          <nav className="nav">
            {LINKS.map((link) => (
              <button
                key={link.href}
                type="button"
                className={isActive(link.href) ? "on" : undefined}
                onClick={() => router.push(link.href)}
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="nav-search">
            <form className="nav-search-bar" onSubmit={submitSearch} role="search">
              <SearchIcon />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="공식, 포뮬러, 모임 검색"
                autoComplete="off"
                aria-label="검색"
              />
            </form>
          </div>

          <div className="topbar-right">
            {/* 모바일 전용 검색 진입(데스크탑은 헤더 .nav-search 가 담당, CSS 로 숨김) */}
            <button
              type="button"
              className="nav-search-m"
              aria-label="검색"
              onClick={() => router.push("/search")}
            >
              <SearchIcon />
            </button>
            {user ? (
              <>
                <Link href="/chat" className="icon-btn" aria-label="채팅">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                </Link>
                <Link href="/profile/me" className="me" aria-label="내 프로필">
                  {initialOf(user.name)}
                </Link>
              </>
            ) : (
              <>
                <button type="button" className="btn-text" onClick={() => router.push("/account")}>
                  로그인
                </button>
                <button type="button" className="btn-join" onClick={() => router.push("/account")}>
                  가입하기
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 모바일 하단 탭바 (reference.css .tabbar) — 채팅 스레드·로그인 화면에선 숨김 */}
      {!hideTabbar && (
        <nav className="tabbar" aria-label="모바일 내비게이션">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`tab${isActive(link.href) ? " on" : ""}`}
            >
              <span className="tl">{link.label}</span>
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
