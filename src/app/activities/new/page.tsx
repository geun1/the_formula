import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { CreateActivityForm } from "./create-form";

export const metadata: Metadata = {
  title: "모집글 쓰기 — The Formula",
  description: "스터디나 프로젝트를 직접 열고 함께할 동료를 모아보세요.",
};

export default async function NewActivityPage() {
  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  return (
    <div className="wrap">
      <Link href="/activities" className="back">
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
        모임
      </Link>

      {viewerId ? (
        <CreateActivityForm />
      ) : (
        <div className="md-section" style={{ marginTop: "8px" }}>
          <h1 className="md-main-title">로그인이 필요해요</h1>
          <p className="md-section-body" style={{ marginBottom: "20px" }}>
            모집글을 쓰려면 먼저 로그인해 주세요. 잠깐이면 돼요.
          </p>
          <div className="md-apply">
            <Link href="/account" className="btn btn-primary">
              로그인하기
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
