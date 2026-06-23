// =============================================================================
// 전역 404 (not-found) — 레퍼런스 토스 톤.
// =============================================================================
// .wrap 컨테이너 + .page-title/.page-sub + .btn 로 일관된 룩.
// =============================================================================
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap">
      <div
        style={{
          maxWidth: 480,
          margin: "40px auto",
          textAlign: "center",
          background: "var(--white)",
          borderRadius: "var(--r)",
          boxShadow: "var(--shadow)",
          padding: "48px 28px",
        }}
      >
        <div
          style={{
            fontSize: 40,
            fontWeight: 800,
            color: "var(--blue)",
            letterSpacing: "-.04em",
          }}
        >
          404
        </div>
        <h1 className="page-title" style={{ marginTop: 12 }}>
          페이지를 찾을 수 없어요
        </h1>
        <p className="page-sub">
          주소가 바뀌었거나 삭제된 페이지일 수 있어요. 홈에서 다시
          둘러봐주세요.
        </p>
        <div
          style={{
            marginTop: 24,
            display: "flex",
            gap: 10,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link href="/" className="btn btn-primary">
            홈으로
          </Link>
          <Link href="/archive" className="btn btn-ghost">
            아카이브 둘러보기
          </Link>
        </div>
      </div>
    </div>
  );
}
