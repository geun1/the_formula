import type { Metadata, Viewport } from "next";
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

// 모바일 뷰포트·상태바 정책을 명시적으로 고정.
// - width/initialScale: 반응형 기본(줌은 접근성 위해 막지 않음 — iOS 자동줌은 입력 16px로 해결).
// - 앱은 라이트 전용(reference.css 에 다크 토큰 없음)이라 colorScheme·themeColor 모두 라이트로 일관.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        {/* 폰트 CDN(jsdelivr) — 모바일 폰트 다운로드 지연 완화를 위해 미리 연결 */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
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
