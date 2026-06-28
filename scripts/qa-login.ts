// =============================================================================
// QA 전용 로그인 헬퍼 — OAuth 없이 자동 QA 세션을 시드한다.
// =============================================================================
// session 전략이 "database" 이므로, session 행을 직접 만들고 그 sessionToken 을
// 브라우저 쿠키(authjs.session-token)로 심으면 해당 유저로 로그인된 상태가 된다.
//
// 사용:  node --env-file=.env.local --import tsx scripts/qa-login.ts <role>
//        role = normal | approved | admin   (기본 normal)
//
// 출력: JSON { cookieName, cookieValue, userId, email, role, expires }
//  - Playwright MCP 가 이 쿠키를 context 에 주입하면 즉시 로그인 상태가 됨.
//  - admin 은 ADMIN_USER_IDS env 기반이므로 userId 를 .env.local 에 추가 후 재기동 필요.
// =============================================================================
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { users, sessions, articlePermissionRequests } from "../src/db/schema";

type Role = "normal" | "approved" | "admin";

const ROLE_EMAILS: Record<Role, string> = {
  normal: "qa.normal@formula.test",
  approved: "qa.approved@formula.test",
  admin: "qa.admin@formula.test",
};

const SESSION_DAYS = 30;
// Auth.js v5 + http(localhost) 기본 세션 쿠키명.
const COOKIE_NAME = "authjs.session-token";

async function ensureUser(role: Role) {
  const email = ROLE_EMAILS[role];
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(users)
    .values({
      name: `QA ${role}`,
      email,
      emailVerified: new Date(),
      onboarded: true,
      role: "member",
    })
    .returning();
  return created;
}

async function seedApproved(userId: string) {
  await db
    .insert(articlePermissionRequests)
    .values({ userId, status: "approved", note: "QA seed" })
    .onConflictDoUpdate({
      target: articlePermissionRequests.userId,
      set: { status: "approved" },
    });
}

async function main() {
  const role = (process.argv[2] as Role) ?? "normal";
  if (!ROLE_EMAILS[role]) {
    throw new Error(`알 수 없는 role: ${role} (normal|approved|admin)`);
  }

  const user = await ensureUser(role);
  if (role === "approved") await seedApproved(user.id);

  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ sessionToken, userId: user.id, expires });

  const out = {
    cookieName: COOKIE_NAME,
    cookieValue: sessionToken,
    userId: user.id,
    email: user.email,
    role,
    expires: expires.toISOString(),
    note:
      role === "admin"
        ? `admin 권한을 켜려면 .env.local 의 ADMIN_USER_IDS 에 "${user.id}" 추가 후 dev 서버 재기동`
        : undefined,
  };
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
