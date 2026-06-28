// =============================================================================
// 준비 중 안내 페이지 (이용약관/개인정보/공지/문의 등 콘텐츠 미확정 라우트 공용)
// =============================================================================
// 레퍼런스 룩: .wrap 컨테이너 + .eyebrow/.page-title/.page-sub 헤더.
// 푸터 '안내' 링크가 404 나지 않도록 라우트는 제공하되, 실제 문구(법무/운영)는
// 확정 전까지 준비 중 상태로 노출한다.
// =============================================================================
import type { ReactNode } from "react";

export type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function PlaceholderPage({
  eyebrow,
  title,
  description,
  children,
}: PlaceholderPageProps) {
  return (
    <div className="wrap">
      <header style={{ textAlign: "center", marginBottom: 8 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          {eyebrow}
        </div>
        <h1 className="page-title" style={{ fontSize: 30 }}>
          {title}
        </h1>
        <p className="page-sub" style={{ maxWidth: 560, margin: "8px auto 0" }}>
          {description}
        </p>
      </header>
      {children}
    </div>
  );
}
