import Link from "next/link";

// 레퍼런스 .site-footer (view-09 line31-78) 그대로. go('feed'…) → next/link.
// 안내/소셜 항목은 레퍼런스상 정적(href 없음) → 우선 # 플레이스홀더로 두되 next/link 로 통일.
const COMMUNITY = [
  { href: "/", label: "아티클" },
  { href: "/archive", label: "아카이브" },
  { href: "/members", label: "포뮬러" },
  { href: "/activities", label: "모임" },
];
const GUIDE = [
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보 처리방침" },
  { href: "/notice", label: "공지사항" },
  { href: "/contact", label: "문의하기" },
];
const SOCIAL = [
  { href: "/", label: "인스타그램" },
  { href: "/", label: "링크드인" },
  { href: "/", label: "뉴스레터 구독" },
];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-logo" style={{ display: "flex", alignItems: "center" }}>
              <svg width="74" height="24" viewBox="0 0 59 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1.89613 8.58571H6.41548V10.2H1.89613V14H0V4H7V5.61429H1.89613V8.58571Z" fill="white" />
                <circle cx="13" cy="9" r="5" fill="#3182F6" />
                <path d="M29.1143 7.5L25.9415 12.8857H25.0435L21.8707 7.61429V14H20V4H21.6463L25.5224 10.5143L29.3388 4H30.985L31 14H29.1293L29.1143 7.5Z" fill="white" />
                <path d="M37.0068 14C35.7391 14 34.7521 13.6156 34.0458 12.8467C33.3486 12.0778 33 10.9761 33 9.54149V4H34.82V9.47117C34.82 11.3558 35.5535 12.2982 37.0204 12.2982C38.4782 12.2982 39.2071 11.3558 39.2071 9.47117V4H41V9.54149C41 10.9761 40.6469 12.0778 39.9406 12.8467C39.2434 13.6156 38.2654 14 37.0068 14Z" fill="white" />
                <path d="M44.9706 4V12.3571H50V14H43V4H44.9706Z" fill="white" />
                <path d="M50.0672 14L51.0329 11.7286L53.4925 5.98571L55.9218 11.7286L56.8875 14H59L54.4883 4H52.4966L48 14H50.0672Z" fill="white" />
                <circle cx="13.1924" cy="9.19216" r="5" transform="rotate(45 13.1924 9.19216)" fill="#3182F6" />
                <ellipse cx="13.1924" cy="9.19216" rx="2" ry="8" transform="rotate(45 13.1924 9.19216)" fill="#3182F6" />
              </svg>
            </div>
            <p>
              AI × 실무의 공식을 발견하고
              <br />
              나누는 커뮤니티
            </p>
          </div>

          <div className="footer-col">
            <h4>커뮤니티</h4>
            {COMMUNITY.map((l) => (
              <Link key={l.label} href={l.href}>
                {l.label}
              </Link>
            ))}
          </div>

          <div className="footer-col">
            <h4>안내</h4>
            {GUIDE.map((l) => (
              <Link key={l.label} href={l.href}>
                {l.label}
              </Link>
            ))}
          </div>

          <div className="footer-col">
            <h4>소셜</h4>
            {SOCIAL.map((l) => (
              <Link key={l.label} href={l.href}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 The Formula. All rights reserved.</span>
          <div className="footer-badges">
            <span className="footer-badge">AX Community</span>
            <span className="footer-badge">Beta v0.9</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
