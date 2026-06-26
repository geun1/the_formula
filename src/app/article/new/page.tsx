// =============================================================================
// /article/new — 관리자 전용 '아티클 추가'(URL → 크롤 → AI → 발행)
// =============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { AddArticleForm } from "./add-article-form";

export const metadata: Metadata = {
  title: "아티클 추가 · The Formula",
  robots: { index: false, follow: false },
};

export default async function NewArticlePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/account?callbackUrl=${encodeURIComponent("/article/new")}`);
  }
  // 관리자만 — 그 외에는 존재 자체를 숨김(404).
  if (!isAdmin(session.user.id)) notFound();

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

      <div className="eyebrow">큐레이션 · 관리자</div>
      <h1 className="page-title">아티클 추가</h1>
      <p className="page-sub">
        기사 URL 을 넣으면 본문을 크롤링해 AI 요약·카드뉴스로 가공한 뒤 피드에 발행해요.
        일일 자동수집과 똑같은 파이프라인이라, 발행 글은 ‘AI 큐레이터’ 작성으로 올라가요.
      </p>

      <AddArticleForm />
    </div>
  );
}
