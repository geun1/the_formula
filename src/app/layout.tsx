import type { Metadata } from "next";
import "./globals.css";
import "./reference.css"; // formula-one-blond 원본 디자인 시스템(클래스 기반) — globals 다음 로드
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "The Formula — AX 실전 스터디",
  description:
    "AI를 도구로 쓰는 시대는 끝났습니다. 당신만의 업무 공식을 설계할 때입니다. AX 실전 스터디 The Formula.",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "The Formula — AX 실전 스터디",
    description:
      "AI를 도구로 쓰는 시대는 끝났습니다. 당신만의 업무 공식을 설계할 때입니다.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        {/* Pretendard Variable (토스 폰트) — CDN */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Navigation />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
