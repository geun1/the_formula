import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata: Metadata = {
  title: "개인정보 처리방침 · The Formula",
  description: "The Formula 개인정보 처리방침.",
};

export default function PrivacyPage() {
  return (
    <PlaceholderPage
      eyebrow="안내"
      title="개인정보 처리방침"
      description="개인정보 처리방침을 준비하고 있어요. 수집·이용 항목이 확정되면 이곳에서 안내드릴게요."
    />
  );
}
