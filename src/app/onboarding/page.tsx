import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getProfile } from "@/lib/queries";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = {
  title: "시작하기 · The Formula",
  description: "직무와 관심사를 골라 The Formula 피드를 맞춤화하세요.",
};

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/apply");
  }

  const profile = await getProfile("me", session.user.id);

  return (
    <div className="wrap">
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="eyebrow">환영해요 👋</div>
      <h1 className="page-title">
        {profile?.user.name
          ? `${profile.user.name}님, 거의 다 됐어요`
          : "거의 다 됐어요"}
      </h1>
      <p className="page-sub">
        두 가지만 알려주시면 The Formula가 딱 맞는 공식을 추천해 드려요.
      </p>

      <OnboardingForm
        initialJobRole={profile?.user.jobRole ?? null}
        initialInterests={profile?.user.interests ?? []}
      />
      </div>
    </div>
  );
}
