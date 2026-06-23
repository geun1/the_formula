// Auth.js v5 (NextAuth) — Drizzle 어댑터 + GitHub/Google OAuth + DB 세션.
// 보안 체크는 middleware/proxy 의존 대신 서버 컴포넌트·액션·라우트핸들러에서
// auth() 세션을 직접 확인한다(Next 16 권장: "데이터 소스 가까이서 검사").
import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";
import Naver from "next-auth/providers/naver";
import GitHub from "next-auth/providers/github";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";

// 환경변수가 설정된 provider 만 활성화. 소셜 로그인: 카카오 / 네이버 / 구글.
// (env 가 비어 있으면 해당 버튼/플로우는 비활성 — 키만 넣으면 즉시 켜짐)
const providers = [];
if (process.env.AUTH_KAKAO_ID) providers.push(Kakao);
if (process.env.AUTH_NAVER_ID) providers.push(Naver);
if (process.env.AUTH_GOOGLE_ID) providers.push(Google);
if (process.env.AUTH_GITHUB_ID) providers.push(GitHub);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers,
  session: { strategy: "database" },
  callbacks: {
    session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});
