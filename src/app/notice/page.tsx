import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata: Metadata = {
  title: "공지사항 · The Formula",
  description: "The Formula 공지사항.",
};

export default function NoticePage() {
  return (
    <PlaceholderPage
      eyebrow="안내"
      title="공지사항"
      description="아직 등록된 공지가 없어요. 새로운 소식이 생기면 이곳에 가장 먼저 알려드릴게요."
    />
  );
}
