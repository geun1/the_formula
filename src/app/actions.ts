"use server";
// =============================================================================
// 서버 액션 — 뮤테이션 (입력검증 + auth() 필수)
// =============================================================================
// 규칙(AGENTS.md / Next 16)
// - 모든 액션은 auth() 로 세션 확인. 비로그인 → { ok:false, error } 반환(throw X,
//   UI 가 매끄럽게 처리하도록). 단, 직접 POST 위조 대비 항상 서버에서 재검증.
// - 입력검증은 zod. revalidatePath 는 redirect 앞. redirect 는 throw 라 try/catch 밖.
// - 파생 카운트는 저장하지 않음(읽기 시 SQL 집계). 여기선 토글/append 만.
// =============================================================================
import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  posts,
  interactions,
  bookmarks,
  follows,
  activities,
  applications,
  users,
  conversations,
  messages,
  memberBookmarks,
  articlePermissionRequests,
  sessions,
  accounts,
} from "@/db/schema";
import { auth, signOut } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { canAddArticle } from "@/lib/article-permission";
import { findOrCreateConversation } from "@/lib/queries";
import { sanitizeRichHtml, richTextLength } from "@/lib/sanitize";
import type { FormulaBody } from "@/lib/contract";
import {
  AGENT_CURATOR_ID,
  ACTIVITY_TYPES,
  ACTIVITY_STATUSES,
  CATEGORIES,
  DIFFICULTIES,
  type ActivityType,
  type ActivityStatus,
} from "@/lib/contract";
import { generateCardNews } from "@/lib/cardnews";

// 표준 액션 반환형
export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const ok = <T>(data?: T): ActionResult<T> => ({ ok: true, data });
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

/** 세션 유저 정보(없으면 null). */
async function sessionUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name ?? "익명",
  };
}

// =============================================================================
// 저장(북마크) 토글
// =============================================================================
export async function toggleBookmark(
  postId: string,
): Promise<ActionResult<{ saved: boolean }>> {
  const user = await sessionUser();
  if (!user) return fail("로그인이 필요해요.");
  if (!postId || typeof postId !== "string") return fail("잘못된 요청이에요.");

  // 대상 post 존재 확인
  const [p] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);
  if (!p) return fail("공식을 찾을 수 없어요.");

  const [existing] = await db
    .select({ id: bookmarks.id })
    .from(bookmarks)
    .where(and(eq(bookmarks.userId, user.id), eq(bookmarks.postId, postId)))
    .limit(1);

  let saved: boolean;
  if (existing) {
    await db.delete(bookmarks).where(eq(bookmarks.id, existing.id));
    saved = false;
  } else {
    await db.insert(bookmarks).values({ userId: user.id, postId });
    saved = true;
  }

  revalidatePath(`/formula/${postId}`);
  revalidatePath("/saved");
  revalidatePath("/");
  return ok({ saved });
}

// =============================================================================
// 좋아요 토글 (interactions type='like')
// =============================================================================
export async function toggleLike(
  postId: string,
): Promise<ActionResult<{ liked: boolean }>> {
  const user = await sessionUser();
  if (!user) return fail("로그인이 필요해요.");
  if (!postId || typeof postId !== "string") return fail("잘못된 요청이에요.");

  const [p] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);
  if (!p) return fail("공식을 찾을 수 없어요.");

  const [existing] = await db
    .select({ id: interactions.id })
    .from(interactions)
    .where(
      and(
        eq(interactions.userId, user.id),
        eq(interactions.postId, postId),
        eq(interactions.type, "like"),
      ),
    )
    .limit(1);

  let liked: boolean;
  if (existing) {
    await db.delete(interactions).where(eq(interactions.id, existing.id));
    liked = false;
  } else {
    await db
      .insert(interactions)
      .values({ userId: user.id, postId, type: "like", body: null });
    liked = true;
  }

  revalidatePath(`/formula/${postId}`);
  return ok({ liked });
}

// =============================================================================
// 댓글 추가 (interactions type='comment')
// =============================================================================
const commentSchema = z.object({
  postId: z.string().min(1),
  body: z.string().trim().min(1, "내용을 입력해 주세요.").max(2000),
});

export async function addComment(
  postId: string,
  body: string,
  parentId?: string | null,
): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return fail("로그인이 필요해요.");

  const parsed = commentSchema.safeParse({ postId, body });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력이 올바르지 않아요.");
  }

  const [p] = await db
    .select({ id: posts.id, postType: posts.postType })
    .from(posts)
    .where(eq(posts.id, parsed.data.postId))
    .limit(1);
  if (!p) return fail("게시물을 찾을 수 없어요.");

  // 도배/중복 방지(라이트) — 최근 내 댓글 5건으로 10초 폭주 + 60초 내 동일 본문 차단.
  const now = Date.now();
  const recent = await db
    .select({ body: interactions.body, createdAt: interactions.createdAt })
    .from(interactions)
    .where(
      and(
        eq(interactions.userId, user.id),
        eq(interactions.postId, parsed.data.postId),
        eq(interactions.type, "comment"),
      ),
    )
    .orderBy(desc(interactions.createdAt))
    .limit(5);
  if (recent.filter((r) => now - r.createdAt.getTime() < 10_000).length >= 5) {
    return fail("댓글을 너무 빠르게 작성했어요. 잠시 후 다시 시도해주세요.");
  }
  if (
    recent.some(
      (r) =>
        (r.body ?? "") === parsed.data.body &&
        now - r.createdAt.getTime() < 60_000,
    )
  ) {
    return fail("방금 같은 댓글을 남겼어요.");
  }

  // 대댓글 — 부모가 같은 글의 comment 인지 검증 + 깊이 상한(stored-DoS 방지).
  // 무제한 중첩을 허용하되, 사람이 쓸 깊이를 훨씬 넘는 병적 체인(수천 단계)만 차단.
  const MAX_DEPTH = 8;
  let parent: string | null = null;
  if (parentId) {
    let cur: string | null = parentId;
    let depth = 0;
    let directOk = false;
    while (cur && depth <= MAX_DEPTH) {
      const [row] = await db
        .select({
          postId: interactions.postId,
          type: interactions.type,
          parentId: interactions.parentId,
        })
        .from(interactions)
        .where(eq(interactions.id, cur))
        .limit(1);
      if (!row) break;
      if (depth === 0) {
        if (row.postId !== parsed.data.postId || row.type !== "comment") break;
        directOk = true;
      }
      depth++;
      cur = row.parentId;
    }
    if (!directOk) return fail("답글 대상 댓글을 찾을 수 없어요.");
    if (depth > MAX_DEPTH) {
      return fail("답글이 너무 깊어요. 위쪽 댓글에 답글을 남겨주세요.");
    }
    parent = parentId;
  }

  await db.insert(interactions).values({
    userId: user.id,
    postId: parsed.data.postId,
    type: "comment",
    body: parsed.data.body,
    parentId: parent,
  });

  // cardnews=아티클(/article), 그 외=공식(/formula) — 올바른 경로 갱신.
  const path = p.postType === "cardnews" ? "/article/" : "/formula/";
  revalidatePath(`${path}${parsed.data.postId}`);
  return ok();
}

/**
 * 계정 소프트 탈퇴 — 작성 콘텐츠(공식·댓글·모임)와 표시 이름은 보존(유저 행 유지),
 * deactivatedAt 기록 + 세션 전체 삭제(즉시 로그아웃) + 멤버 디렉토리 제외.
 * 또한 소셜 계정 연결(account)을 끊어, 같은 소셜로 다시 로그인하면 어댑터가
 * '완전히 새 계정'을 만들도록 한다(이전 콘텐츠는 탈퇴 이름으로 남고 연결 안 됨).
 */
export async function deactivateAccount(): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return fail("로그인이 필요해요.");

  // 이메일도 비운다: Auth.js 는 계정 연결이 없어도 같은 이메일이면 OAuthAccountNotLinked
  // 로 막으므로, 이메일을 풀어줘야 같은 소셜로 '새 계정' 가입이 된다. 이름은 유지.
  await db
    .update(users)
    .set({ deactivatedAt: new Date(), email: null })
    .where(eq(users.id, user.id));
  await db.delete(sessions).where(eq(sessions.userId, user.id));
  // 소셜 계정 연결 해제 → 재로그인 시 새 유저 생성(=새 계정으로 재가입).
  await db.delete(accounts).where(eq(accounts.userId, user.id));

  // redirect(throw) — 마지막. 현재 세션 쿠키도 정리.
  await signOut({ redirectTo: "/" });
  return ok(); // 도달하지 않음(redirect)
}

/** 댓글 삭제 — 작성자 본인만. 대댓글(자식)은 parentId FK cascade 로 함께 삭제된다. */
export async function deleteComment(
  commentId: string,
): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return fail("로그인이 필요해요.");
  if (!commentId) return fail("잘못된 요청이에요.");

  const [c] = await db
    .select({ userId: interactions.userId, postId: interactions.postId })
    .from(interactions)
    .where(
      and(eq(interactions.id, commentId), eq(interactions.type, "comment")),
    )
    .limit(1);
  if (!c) return fail("댓글을 찾을 수 없어요.");
  if (c.userId !== user.id) return fail("본인 댓글만 삭제할 수 있어요.");

  await db.delete(interactions).where(eq(interactions.id, commentId));

  const [p] = await db
    .select({ postType: posts.postType })
    .from(posts)
    .where(eq(posts.id, c.postId))
    .limit(1);
  const path = p?.postType === "cardnews" ? "/article/" : "/formula/";
  revalidatePath(`${path}${c.postId}`);
  return ok();
}

// =============================================================================
// 팔로우 토글
// =============================================================================
export async function toggleFollow(
  targetUserId: string,
): Promise<ActionResult<{ following: boolean }>> {
  const user = await sessionUser();
  if (!user) return fail("로그인이 필요해요.");
  if (!targetUserId || typeof targetUserId !== "string") {
    return fail("잘못된 요청이에요.");
  }
  if (targetUserId === user.id) return fail("자기 자신은 팔로우할 수 없어요.");

  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);
  if (!target) return fail("멤버를 찾을 수 없어요.");

  const [existing] = await db
    .select({ id: follows.id })
    .from(follows)
    .where(
      and(
        eq(follows.followerId, user.id),
        eq(follows.followingId, targetUserId),
      ),
    )
    .limit(1);

  let following: boolean;
  if (existing) {
    await db.delete(follows).where(eq(follows.id, existing.id));
    following = false;
  } else {
    await db
      .insert(follows)
      .values({ followerId: user.id, followingId: targetUserId });
    following = true;
  }

  revalidatePath(`/profile/${targetUserId}`);
  revalidatePath("/members");
  return ok({ following });
}

// =============================================================================
// 모임 지원
// =============================================================================
const applySchema = z.object({
  activityId: z.string().min(1),
  message: z.string().trim().min(1, "지원 메시지를 입력해 주세요.").max(1000),
});

export async function applyToActivity(
  activityId: string,
  message: string,
): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return fail("로그인이 필요해요.");

  const parsed = applySchema.safeParse({ activityId, message });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력이 올바르지 않아요.");
  }

  const [act] = await db
    .select({ id: activities.id, ownerId: activities.ownerId })
    .from(activities)
    .where(eq(activities.id, parsed.data.activityId))
    .limit(1);
  if (!act) return fail("모임을 찾을 수 없어요.");
  if (act.ownerId === user.id) {
    return fail("내가 만든 모임에는 지원할 수 없어요.");
  }

  // 중복 지원 방지(UNIQUE(activityId,userId) 와 이중 안전)
  const [existing] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(
      and(
        eq(applications.activityId, parsed.data.activityId),
        eq(applications.userId, user.id),
      ),
    )
    .limit(1);
  if (existing) return fail("이미 지원한 모임이에요.");

  await db.insert(applications).values({
    activityId: parsed.data.activityId,
    userId: user.id,
    userName: user.name,
    message: parsed.data.message,
    status: "pending",
  });

  revalidatePath(`/activities/${parsed.data.activityId}`);
  return ok();
}

// =============================================================================
// 모임 소유자 관리 — 지원 승인/반려 · 상태 전환 · 삭제 (모두 소유자 전용)
// =============================================================================

/** 모임 소유자 검증. 소유자면 activity row, 아니면 null. */
async function ownActivityOr(activityId: string, userId: string) {
  const [act] = await db
    .select({ id: activities.id, ownerId: activities.ownerId })
    .from(activities)
    .where(eq(activities.id, activityId))
    .limit(1);
  return act && act.ownerId === userId ? act : null;
}

/** 지원자 수락/반려 — 해당 모임 소유자만. */
export async function reviewApplication(
  applicationId: string,
  decision: "accept" | "reject",
): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return fail("로그인이 필요해요.");
  if (!applicationId) return fail("잘못된 요청이에요.");

  const [app] = await db
    .select({ id: applications.id, activityId: applications.activityId })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!app) return fail("지원 내역을 찾을 수 없어요.");
  if (!(await ownActivityOr(app.activityId, user.id))) {
    return fail("이 모임을 관리할 권한이 없어요.");
  }

  await db
    .update(applications)
    .set({ status: decision === "accept" ? "accepted" : "rejected" })
    .where(eq(applications.id, applicationId));

  revalidatePath(`/activities/${app.activityId}`);
  return ok();
}

/** 모임 상태 전환(모집중 → 진행중 → 완료) — 소유자만. */
export async function updateActivityStatus(
  activityId: string,
  status: ActivityStatus,
): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return fail("로그인이 필요해요.");
  if (!ACTIVITY_STATUSES.includes(status)) return fail("잘못된 상태예요.");
  if (!(await ownActivityOr(activityId, user.id))) {
    return fail("이 모임을 관리할 권한이 없어요.");
  }

  await db
    .update(activities)
    .set({ status })
    .where(eq(activities.id, activityId));
  revalidatePath(`/activities/${activityId}`);
  revalidatePath("/activities");
  return ok();
}

/** 모임 삭제 — 소유자만. 지원 내역은 FK cascade 로 함께 삭제된다. */
export async function deleteActivity(
  activityId: string,
): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return fail("로그인이 필요해요.");
  if (!(await ownActivityOr(activityId, user.id))) {
    return fail("이 모임을 삭제할 권한이 없어요.");
  }

  await db.delete(activities).where(eq(activities.id, activityId));
  revalidatePath("/activities");
  return ok();
}

// =============================================================================
// 모임 생성 (작성 후 상세로 redirect)
// =============================================================================
const createActivitySchema = z.object({
  type: z.enum(ACTIVITY_TYPES),
  title: z.string().trim().min(2).max(120),
  summary: z.string().trim().min(2).max(200),
  description: z.string().trim().min(2).max(4000),
  tags: z.array(z.string().trim().min(1)).max(8).default([]),
  capacity: z.coerce.number().int().min(0).max(1000).default(0),
  season: z.string().trim().max(40).nullish(),
});

export type CreateActivityInput = {
  type: ActivityType;
  title: string;
  summary: string;
  description: string;
  tags?: string[];
  capacity?: number;
  season?: string | null;
};

/**
 * 모임 생성. 성공 시 /activities/[id] 로 redirect(throw 라 결과 반환 없음).
 * 검증 실패/비로그인은 ActionResult 로 반환.
 */
export async function createActivity(
  input: CreateActivityInput,
): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return fail("로그인이 필요해요.");

  const parsed = createActivitySchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력이 올바르지 않아요.");
  }

  const [row] = await db
    .insert(activities)
    .values({
      type: parsed.data.type,
      title: parsed.data.title,
      summary: parsed.data.summary,
      description: parsed.data.description,
      status: "recruiting",
      ownerId: user.id,
      ownerName: user.name,
      tags: parsed.data.tags,
      capacity: parsed.data.capacity,
      season: parsed.data.season ?? null,
    })
    .returning({ id: activities.id });

  revalidatePath("/activities");
  redirect(`/activities/${row.id}`); // throw — 아래 코드 실행 안 됨
}

// =============================================================================
// 온보딩 완료
// =============================================================================
const onboardingSchema = z.object({
  jobRole: z.string().trim().min(1, "직무를 선택해 주세요.").max(40),
  interests: z.array(z.string().trim().min(1)).max(20).default([]),
});

export async function completeOnboarding(input: {
  jobRole: string;
  interests: string[];
}): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return fail("로그인이 필요해요.");

  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력이 올바르지 않아요.");
  }

  await db
    .update(users)
    .set({
      jobRole: parsed.data.jobRole,
      interests: parsed.data.interests,
      onboarded: true,
    })
    .where(eq(users.id, user.id));

  revalidatePath("/");
  revalidatePath("/profile/me");
  return ok();
}

/** 공식/아티클 삭제 — 작성자 본인만. 댓글·북마크 등은 postId FK cascade 로 함께 삭제. */
export async function deletePost(postId: string): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return fail("로그인이 필요해요.");
  if (!postId || typeof postId !== "string") return fail("잘못된 요청이에요.");

  const [p] = await db
    .select({ authorId: posts.authorId })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);
  if (!p) return fail("게시물을 찾을 수 없어요.");
  if (p.authorId !== user.id) return fail("본인 글만 삭제할 수 있어요.");

  await db.delete(posts).where(eq(posts.id, postId));
  revalidatePath("/archive");
  revalidatePath("/");
  revalidatePath("/profile/me");
  return ok();
}

// =============================================================================
// 아카이브(공식) 작성 — postType='formula' + relatedArticleId(아티클 연결)
// =============================================================================
const createArchiveSchema = z.object({
  title: z.string().trim().min(2, "제목을 입력해 주세요.").max(120),
  oneLiner: z.string().trim().max(200).nullish(),
  category: z.enum(CATEGORIES),
  tags: z.array(z.string().trim().min(1)).max(8).default([]),
  difficulty: z.enum(DIFFICULTIES).default("intermediate"),
  workType: z.string().trim().max(40).nullish(),
  // 작성 양식. guide=구조화 폼 / free=자유 에디터(HTML) / ai=AI 작성(마크다운).
  format: z.enum(["guide", "free", "ai"]).default("guide"),
  formula: z.object({
    // guide 일 때만 필수 — 형식별 검증은 액션에서(아래) 수행.
    problem: z.string().trim().max(2000).default(""),
    hypothesis: z.string().trim().max(2000).default(""),
    tools: z.array(z.string().trim().min(1)).max(12).default([]),
    prompt: z.string().trim().max(4000).nullish(),
    process: z.string().trim().max(4000).default(""),
    result: z.string().trim().max(2000).default(""),
    timeSaved: z.string().trim().max(80).default(""),
    // free 일 때 자유 본문(HTML, 새니타이즈 전). 길이 여유.
    content: z.string().trim().max(60000).default(""),
  }),
  // 참고한 아티클(cardnews) post.id. 선택.
  relatedArticleId: z.string().trim().min(1).nullish(),
  // '따라하기'로 참고한 원본 공식(formula) post.id. 내용 복제 없이 출처만 연결. 선택.
  forkedFromId: z.string().trim().min(1).nullish(),
});

export type CreateArchiveInput = z.input<typeof createArchiveSchema>;

/**
 * 아카이브 작성. 성공 시 /formula/[id](라벨 '아카이브') 로 redirect.
 * relatedArticleId 가 오면 실제 cardnews 아티클인지 검증 후 연결한다.
 */
export async function createArchive(
  input: CreateArchiveInput,
): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return fail("로그인이 필요해요.");

  const parsed = createArchiveSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력이 올바르지 않아요.");
  }

  // relatedArticleId 검증 — 존재하고 cardnews(아티클)여야 연결.
  let relatedArticleId: string | null = null;
  if (parsed.data.relatedArticleId) {
    const [art] = await db
      .select({ id: posts.id, postType: posts.postType })
      .from(posts)
      .where(eq(posts.id, parsed.data.relatedArticleId))
      .limit(1);
    if (!art) return fail("참고할 아티클을 찾을 수 없어요.");
    if (art.postType !== "cardnews") {
      return fail("아티클(카드뉴스)만 참고로 연결할 수 있어요.");
    }
    relatedArticleId = art.id;
  }

  // forkedFromId 검증 — 존재하고 공식(formula)이어야 출처로 연결.
  let forkedFromId: string | null = null;
  if (parsed.data.forkedFromId) {
    const [src] = await db
      .select({ id: posts.id, postType: posts.postType })
      .from(posts)
      .where(eq(posts.id, parsed.data.forkedFromId))
      .limit(1);
    if (src && src.postType === "formula") forkedFromId = src.id;
  }

  // ── 형식별 검증 + formula 본문 구성 ──────────────────────────────
  const f = parsed.data.formula;
  let formulaBody: FormulaBody;
  if (parsed.data.format === "free") {
    const content = sanitizeRichHtml(f.content); // XSS 차단
    if (richTextLength(content) < 1) return fail("내용을 입력해 주세요.");
    formulaBody = {
      format: "free",
      content,
      problem: "",
      hypothesis: "",
      tools: [],
      process: "",
      result: "",
      timeSaved: "",
    };
  } else if (parsed.data.format === "ai") {
    // AI 작성 — 권한 필요(송근일/승인). 마크다운 그대로 저장(Markdown 컴포넌트가 XSS-safe 렌더).
    if (!(await canAddArticle(user.id))) {
      return fail("AI 작성은 권한이 필요해요. 권한을 먼저 요청해주세요.");
    }
    const md = (f.content ?? "").trim();
    if (md.length < 1) return fail("초안을 생성하거나 내용을 입력해 주세요.");
    formulaBody = {
      format: "ai",
      content: md,
      problem: "",
      hypothesis: "",
      tools: [],
      process: "",
      result: "",
      timeSaved: "",
    };
  } else {
    if (!f.problem) return fail("문제 상황을 입력해 주세요.");
    if (!f.hypothesis) return fail("가설을 입력해 주세요.");
    if (!f.process) return fail("적용 과정을 입력해 주세요.");
    if (!f.result) return fail("결과를 입력해 주세요.");
    formulaBody = {
      format: "guide",
      problem: f.problem,
      hypothesis: f.hypothesis,
      tools: f.tools,
      prompt: f.prompt ?? undefined,
      process: f.process,
      result: f.result,
      timeSaved: f.timeSaved,
    };
  }

  const [row] = await db
    .insert(posts)
    .values({
      postType: "formula",
      title: parsed.data.title,
      oneLiner: parsed.data.oneLiner ?? null,
      category: parsed.data.category,
      tags: parsed.data.tags,
      difficulty: parsed.data.difficulty,
      workType: parsed.data.workType ?? null,
      verified: false,
      authorType: "user",
      authorId: user.id,
      authorName: user.name,
      sourceName: null,
      sourceUrl: null,
      collectedAt: null,
      cardnews: null,
      formula: formulaBody,
      relatedArticleId,
      forkedFromId,
    })
    .returning({ id: posts.id });

  revalidatePath("/archive");
  revalidatePath("/profile/me");
  if (relatedArticleId) revalidatePath(`/article/${relatedArticleId}`);
  redirect(`/formula/${row.id}`); // throw — 아래 코드 실행 안 됨
}

// =============================================================================
// 데모 수동 수집 — 목업 소스 1건을 카드뉴스로 가공·적재 (agent-curator 작성)
// =============================================================================
const MOCK_SOURCES = [
  {
    sourceName: "The Pragmatic Engineer",
    sourceUrl: "https://newsletter.pragmaticengineer.com/",
    originalTitle: "How AI agents plan multi-step engineering tasks",
    category: "ai" as const,
    rawContent:
      "AI coding agents increasingly decompose large tasks into smaller, verifiable steps. " +
      "The most effective loops combine planning, tool use, and self-review. " +
      "Teams that codify conventions in a shared file see far more consistent agent output, " +
      "because the agent can re-read constraints instead of re-deriving them each session.",
  },
  {
    sourceName: "Smashing Magazine",
    sourceUrl: "https://www.smashingmagazine.com/",
    originalTitle: "Designing with AI: keeping taste in the loop",
    category: "design" as const,
    rawContent:
      "Designers are automating repetitive production work — token extraction, asset resizing, " +
      "copy variants — while keeping brand judgment and final taste in human hands. " +
      "The result is faster iteration without losing craft.",
  },
];

/**
 * 데모용 수동 수집 트리거. 목업 소스 1건을 골라 카드뉴스 생성 후 적재.
 * 인증: 로그인 유저만(데모 운영자). agent-curator 가 작성자가 된다.
 */
export async function runManualIngest(): Promise<
  ActionResult<{ id: string; title: string }>
> {
  const user = await sessionUser();
  if (!user) return fail("로그인이 필요해요.");

  const src = MOCK_SOURCES[Math.floor(Math.random() * MOCK_SOURCES.length)];
  const cardnews = await generateCardNews({
    originalTitle: src.originalTitle,
    rawContent: src.rawContent,
    sourceName: src.sourceName,
  });

  const [row] = await db
    .insert(posts)
    .values({
      postType: "cardnews",
      title: src.originalTitle,
      oneLiner: cardnews.summary.slice(0, 120),
      category: src.category,
      tags: cardnews.keywords.slice(0, 5),
      difficulty: "intermediate",
      workType: "분석",
      verified: false,
      authorType: "agent",
      authorId: AGENT_CURATOR_ID,
      authorName: "AI 큐레이터",
      sourceName: src.sourceName,
      sourceUrl: src.sourceUrl,
      collectedAt: new Date(),
      cardnews,
      formula: null,
    })
    .returning({ id: posts.id, title: posts.title });

  revalidatePath("/");
  return ok({ id: row.id, title: row.title });
}

// =============================================================================
// 채팅 / 1:1 DM
// =============================================================================
/**
 * 대상 유저와의 1:1 대화를 가져오거나(없으면) 생성. 성공 시 conversationId 반환.
 * 실제 조회/생성은 렌더-세이프 헬퍼(findOrCreateConversation)에 위임하고,
 * 액션에서는 캐시 무효화(revalidatePath)만 추가로 수행해요.
 * (서버 컴포넌트 렌더 중에는 이 액션이 아니라 헬퍼를 직접 호출 — revalidatePath 금지)
 */
export async function startOrGetConversation(
  targetUserId: string,
): Promise<ActionResult<{ conversationId: string }>> {
  const user = await sessionUser();
  if (!user) return fail("로그인이 필요해요.");

  const res = await findOrCreateConversation(user.id, targetUserId);
  if (!res.ok) return fail(res.error);

  revalidatePath("/chat");
  return ok({ conversationId: res.conversationId });
}

const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  body: z.string().trim().min(1, "메시지를 입력해 주세요.").max(2000),
});

/**
 * 메시지 전송. auth + 입력검증 + 권한확인(참여자만) + 대화 lastMessageAt 갱신.
 */
export async function sendMessage(
  conversationId: string,
  body: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await sessionUser();
  if (!user) return fail("로그인이 필요해요.");

  const parsed = sendMessageSchema.safeParse({ conversationId, body });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력이 올바르지 않아요.");
  }

  // 권한 확인: 참여자만 전송 가능
  const [conv] = await db
    .select({
      id: conversations.id,
      user1Id: conversations.user1Id,
      user2Id: conversations.user2Id,
    })
    .from(conversations)
    .where(eq(conversations.id, parsed.data.conversationId))
    .limit(1);
  if (!conv) return fail("대화를 찾을 수 없어요.");
  if (conv.user1Id !== user.id && conv.user2Id !== user.id) {
    return fail("이 대화에 접근할 수 없어요.");
  }

  const now = new Date();
  const [row] = await db
    .insert(messages)
    .values({
      conversationId: parsed.data.conversationId,
      senderId: user.id,
      body: parsed.data.body,
      createdAt: now,
    })
    .returning({ id: messages.id });

  // 받은함 정렬 키 갱신
  await db
    .update(conversations)
    .set({ lastMessageAt: now })
    .where(eq(conversations.id, parsed.data.conversationId));

  revalidatePath(`/chat/${parsed.data.conversationId}`);
  revalidatePath("/chat");
  return ok({ id: row.id });
}

/**
 * 대화 읽음 처리. 내가 수신자인(상대가 보낸) 미읽음 메시지의 readAt 을 채운다.
 * 참여자만 가능.
 */
export async function markRead(
  conversationId: string,
): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return fail("로그인이 필요해요.");
  if (!conversationId || typeof conversationId !== "string") {
    return fail("잘못된 요청이에요.");
  }

  const [conv] = await db
    .select({
      id: conversations.id,
      user1Id: conversations.user1Id,
      user2Id: conversations.user2Id,
    })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  if (!conv) return fail("대화를 찾을 수 없어요.");
  if (conv.user1Id !== user.id && conv.user2Id !== user.id) {
    return fail("이 대화에 접근할 수 없어요.");
  }

  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messages.conversationId, conversationId),
        sql`${messages.senderId} <> ${user.id}`,
        sql`${messages.readAt} is null`,
      ),
    );

  revalidatePath(`/chat/${conversationId}`);
  revalidatePath("/chat");
  return ok();
}

// =============================================================================
// 멤버 저장(bookmark member) 토글
// =============================================================================
export async function toggleMemberBookmark(
  memberId: string,
): Promise<ActionResult<{ saved: boolean }>> {
  const user = await sessionUser();
  if (!user) return fail("로그인이 필요해요.");
  if (!memberId || typeof memberId !== "string") {
    return fail("잘못된 요청이에요.");
  }
  if (memberId === user.id) return fail("자기 자신은 저장할 수 없어요.");

  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, memberId))
    .limit(1);
  if (!target) return fail("멤버를 찾을 수 없어요.");

  const [existing] = await db
    .select({ id: memberBookmarks.id })
    .from(memberBookmarks)
    .where(
      and(
        eq(memberBookmarks.userId, user.id),
        eq(memberBookmarks.memberId, memberId),
      ),
    )
    .limit(1);

  let saved: boolean;
  if (existing) {
    await db.delete(memberBookmarks).where(eq(memberBookmarks.id, existing.id));
    saved = false;
  } else {
    await db.insert(memberBookmarks).values({ userId: user.id, memberId });
    saved = true;
  }

  revalidatePath("/members");
  revalidatePath(`/profile/${memberId}`);
  return ok({ saved });
}

// =============================================================================
// 조회수(view) 누적 — 상세 진입 시 1건. 로그인 유저만 누적(비로그인은 no-op).
// =============================================================================
// interactions.userId 가 NOT NULL(FK) 이므로 익명 누적은 스키마상 불가.
// 비로그인은 조용히 no-op( ok ) 처리해 UI 흐름을 막지 않는다.
export async function incrementView(
  postId: string,
): Promise<ActionResult<{ counted: boolean }>> {
  if (!postId || typeof postId !== "string") return fail("잘못된 요청이에요.");

  const user = await sessionUser();
  if (!user) return ok({ counted: false }); // 익명: 누적 불가, 흐름은 유지

  const [p] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);
  if (!p) return fail("공식을 찾을 수 없어요.");

  await db
    .insert(interactions)
    .values({ userId: user.id, postId, type: "view", body: null });

  revalidatePath(`/formula/${postId}`);
  revalidatePath(`/article/${postId}`);
  return ok({ counted: true });
}

// =============================================================================
// 아티클 추가 권한 — 요청 / 심사(관리자=송근일)
// =============================================================================

/** 로그인 사용자가 아티클 추가 권한을 요청(재요청 시 pending 으로 리셋). */
export async function requestArticlePermission(
  note?: string,
): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return fail("로그인이 필요해요.");
  if (isAdmin(user.id)) return ok(); // 관리자는 이미 권한 보유

  const trimmed = (note ?? "").trim().slice(0, 500);
  const [existing] = await db
    .select({ status: articlePermissionRequests.status })
    .from(articlePermissionRequests)
    .where(eq(articlePermissionRequests.userId, user.id))
    .limit(1);

  // 이미 승인됨 → no-op. 재요청으로 자기 권한을 pending 으로 강등하는 자해 차단.
  if (existing?.status === "approved") return ok();

  if (existing?.status === "pending") {
    // 검토 중 — 메모만 갱신(createdAt 유지: 반복 요청으로 심사 큐 상단 점프 방지).
    await db
      .update(articlePermissionRequests)
      .set({ note: trimmed || null })
      .where(eq(articlePermissionRequests.userId, user.id));
  } else {
    // 미요청(none) 또는 거절됨(rejected) → 새 pending 요청.
    await db
      .insert(articlePermissionRequests)
      .values({ userId: user.id, status: "pending", note: trimmed || null })
      .onConflictDoUpdate({
        target: articlePermissionRequests.userId,
        set: {
          status: "pending",
          note: trimmed || null,
          reviewedBy: null,
          reviewedAt: null,
          createdAt: new Date(),
        },
      });
  }

  revalidatePath("/article/new");
  return ok();
}

/** 관리자(송근일)가 권한 요청을 승인/거절. */
export async function reviewArticlePermission(
  targetUserId: string,
  decision: "approve" | "reject",
): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return fail("로그인이 필요해요.");
  if (!isAdmin(user.id)) return fail("승인 권한이 없어요.");
  if (!targetUserId || typeof targetUserId !== "string") {
    return fail("잘못된 요청이에요.");
  }

  const res = await db
    .update(articlePermissionRequests)
    .set({
      status: decision === "approve" ? "approved" : "rejected",
      reviewedBy: user.id,
      reviewedAt: new Date(),
    })
    .where(
      and(
        eq(articlePermissionRequests.userId, targetUserId),
        eq(articlePermissionRequests.status, "pending"),
      ),
    )
    .returning({ userId: articlePermissionRequests.userId });
  if (res.length === 0) return fail("이미 처리됐거나 없는 요청이에요.");

  revalidatePath("/article/new");
  return ok();
}
