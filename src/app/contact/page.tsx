import type { Metadata } from "next";
import Link from "next/link";
import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata: Metadata = {
  title: "문의하기 · The Formula",
  description: "The Formula 문의 안내.",
};

export default function ContactPage() {
  return (
    <PlaceholderPage
      eyebrow="안내"
      title="문의하기"
      description="궁금한 점이나 제안이 있으신가요? 문의 채널을 준비하고 있어요. 그동안은 가입 신청을 통해 합류하실 수 있어요."
    >
      <div style={{ textAlign: "center", marginTop: 20 }}>
        <Link href="/apply" className="btn">
          가입 신청하기
        </Link>
      </div>
    </PlaceholderPage>
  );
}
