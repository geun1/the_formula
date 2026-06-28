import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ProfileForm } from "./profile-form";
import { SocialButtons } from "./social-buttons";
import { DeactivateSection } from "./deactivate-section";

export const metadata: Metadata = {
  title: "내 계정 — The Formula",
  description: "프로필 편집 · 알림 · 설정",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const userId = session?.user?.id;

  // 로그인 성공 후 돌아갈 곳. 기본 홈(/). 로그인 화면 자체(/account)나 외부 URL은
  // 홈으로 보정 — 가입 완료 회원이 로그인 후 프로필 편집으로 튕기던 문제 해결.
  const cb = sp.callbackUrl;
  const loginCallback =
    cb && cb.startsWith("/") && !cb.startsWith("//") && !cb.startsWith("/account")
      ? cb
      : "/";

  // 비로그인 — 로그인 화면(view-07-login). .auth-card 마크업 그대로.
  if (!userId) {
    return (
      <div className="wrap">
        {/* 비로그인 로그인 화면 — 모바일 하단 탭바는 NavBar 가 라우트 기준으로 숨김 */}
        <section className="view auth on">
          <div className="auth-card">
            <div className="auth-logo">
              <span className="mark">F</span>The Formula
            </div>
            <h1 className="auth-title">다시 오셨네요</h1>
            <p className="auth-sub">멈춘 자리에서, 공식을 이어 쌓아볼까요?</p>
            <SocialButtons callbackUrl={loginCallback} mode="login" />
            <p className="auth-switch">
              아직 포뮬러가 아니신가요? <Link href="/apply">가입하기</Link>
            </p>
          </div>
        </section>
      </div>
    );
  }

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const me = rows[0];

  // 로그인 — 프로필 편집(레퍼런스 폼 클래스).
  // 폼은 .wrap(max 1280) 안에서 읽기 좋은 폭으로 제한 — 2열 form-grid가 과하게 퍼지지 않게.
  return (
    <div className="wrap">
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <Link href="/profile/me" className="back">
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
        내 프로필
      </Link>

      <div className="eyebrow">계정</div>
      <h1 className="page-title">프로필 편집</h1>
      <p className="page-sub">
        {me?.email
          ? `${me.email} 으로 로그인했어요.`
          : "공개 프로필에 보이는 정보를 다듬어 보세요."}
      </p>

      <ProfileForm
        initial={{
          name: me?.name ?? "",
          role: me?.role ?? "",
          jobRole: me?.jobRole ?? null,
          company: me?.company ?? null,
          bio: me?.bio ?? "",
          interests: me?.interests ?? [],
          github: me?.github ?? null,
          homepage: me?.homepage ?? null,
          blog: me?.blog ?? null,
        }}
      />

      <div className="sec">
        <h2>알림 · 설정</h2>
      </div>
      <p className="page-sub" style={{ marginTop: 0 }}>
        알림 설정은 곧 제공될 예정이에요.
      </p>
      <p className="page-sub" style={{ marginTop: 10 }}>
        {me?.onboarded
          ? "관심사·직무를 다시 고르고 싶나요? "
          : "아직 온보딩을 마치지 않았어요. "}
        <Link href="/onboarding" style={{ color: "var(--blue)", fontWeight: 600 }}>
          {me?.onboarded ? "온보딩 다시 하기" : "온보딩 완료하기"}
        </Link>
      </p>
      <DeactivateSection />
      </div>
    </div>
  );
}
