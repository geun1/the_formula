// =============================================================================
// /article/new — 아티클 추가(URL → 크롤 → AI → 발행) + 권한 요청/승인
// =============================================================================
// 권한: admin(송근일)·approved → 추가 폼. pending → 검토중. none/rejected → 요청.
// 관리자(송근일)는 폼 아래에서 대기 중인 권한 요청을 승인/거절.
// =============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  getArticlePermission,
  listPendingArticleRequests,
} from "@/lib/article-permission";
import { AddArticleForm } from "./add-article-form";
import { RequestPermission } from "./request-permission";
import { PermissionRequests } from "./permission-requests";

export const metadata: Metadata = {
  title: "아티클 추가 · The Formula",
  robots: { index: false, follow: false },
};

export default async function NewArticlePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/account?callbackUrl=${encodeURIComponent("/article/new")}`);
  }

  const perm = await getArticlePermission(session.user.id);
  const canAdd = perm === "admin" || perm === "approved";
  const pending =
    perm === "admin" ? await listPendingArticleRequests() : [];

  return (
    <div className="wrap" style={{ maxWidth: 680 }}>
      <Link href="/" className="back">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        아티클 피드
      </Link>

      <div className="eyebrow">큐레이션{perm === "admin" ? " · 관리자" : ""}</div>
      <h1 className="page-title">아티클 추가</h1>

      {canAdd ? (
        <>
          <p className="page-sub">
            기사 URL 을 넣으면 본문을 크롤링해 AI 요약·카드뉴스로 가공한 뒤 피드에 발행해요.
            일일 자동수집과 똑같은 파이프라인이라, 발행 글은 ‘AI 큐레이터’ 작성으로 올라가요.
          </p>
          <AddArticleForm />
        </>
      ) : (
        <RequestPermission status={perm} />
      )}

      {perm === "admin" && <PermissionRequests requests={pending} />}
    </div>
  );
}
