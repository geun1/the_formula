// =============================================================================
// 아티클 추가 권한 — 관리자(송근일) 승인제
// =============================================================================
// 상태: admin(env ADMIN_USER_IDS — 추가+승인) / approved(추가) / pending(검토중)
//       / rejected(거절, 재요청 가능) / none(요청 전).
// "추가 가능" = admin || approved. 승인은 관리자(isAdmin)만.
// =============================================================================
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { articlePermissionRequests, users } from "@/db/schema";
import { isAdmin } from "@/lib/admin";

export type ArticlePermStatus =
  | "admin"
  | "approved"
  | "pending"
  | "rejected"
  | "none";

/** 사용자의 아티클 추가 권한 상태. */
export async function getArticlePermission(
  userId: string | null | undefined,
): Promise<ArticlePermStatus> {
  if (!userId) return "none";
  if (isAdmin(userId)) return "admin";
  const [r] = await db
    .select({ status: articlePermissionRequests.status })
    .from(articlePermissionRequests)
    .where(eq(articlePermissionRequests.userId, userId))
    .limit(1);
  return r?.status ?? "none";
}

/** 아티클 추가 가능 여부(admin 또는 승인됨). */
export async function canAddArticle(
  userId: string | null | undefined,
): Promise<boolean> {
  const s = await getArticlePermission(userId);
  return s === "admin" || s === "approved";
}

export interface PendingArticleRequest {
  userId: string;
  name: string;
  email: string | null;
  note: string | null;
  createdAt: string;
}

/** 대기 중인 권한 요청(관리자 심사용, 최신순). */
export async function listPendingArticleRequests(): Promise<
  PendingArticleRequest[]
> {
  const rows = await db
    .select({
      userId: articlePermissionRequests.userId,
      note: articlePermissionRequests.note,
      createdAt: articlePermissionRequests.createdAt,
      name: users.name,
      email: users.email,
    })
    .from(articlePermissionRequests)
    .innerJoin(users, eq(users.id, articlePermissionRequests.userId))
    .where(eq(articlePermissionRequests.status, "pending"))
    .orderBy(desc(articlePermissionRequests.createdAt));
  return rows.map((r) => ({
    userId: r.userId,
    name: r.name ?? "익명",
    email: r.email,
    note: r.note,
    createdAt: r.createdAt.toISOString(),
  }));
}
