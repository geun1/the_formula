import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata: Metadata = {
  title: "이용약관 · The Formula",
  description: "The Formula 서비스 이용약관.",
};

export default function TermsPage() {
  return (
    <PlaceholderPage
      eyebrow="안내"
      title="이용약관"
      description="이용약관을 준비하고 있어요. 정식 공개 전까지는 베타 운영 정책에 따라 서비스가 제공돼요."
    />
  );
}
