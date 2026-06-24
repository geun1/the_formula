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
import { and, eq, sql } from "drizzle-orm";
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
} from "@/db/schema";
import { auth } from "@/auth";
import { findOrCreateConversation } from "@/lib/queries";
import { sanitizeRichHtml, richTextLength } from "@/lib/sanitize";
import type { FormulaBody } from "@/lib/contract";
import {
  AGENT_CURATOR_ID,
  ACTIVITY_TYPES,
  CATEGORIES,
  DIFFICULTIES,
  type ActivityType,
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
): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return fail("로그인이 필요해요.");

  const parsed = commentSchema.safeParse({ postId, body });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력이 올바르지 않아요.");
  }

  const [p] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.id, parsed.data.postId))
    .limit(1);
  if (!p) return fail("공식을 찾을 수 없어요.");

  await db.insert(interactions).values({
    userId: user.id,
    postId: parsed.data.postId,
    type: "comment",
    body: parsed.data.body,
  });

  revalidatePath(`/formula/${parsed.data.postId}`);
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

// =============================================================================
// 공식 복제(따라하기) — 원본을 내 초안 formula 로 복제
// =============================================================================
export async function duplicateFormula(
  postId: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await sessionUser();
  if (!user) return fail("로그인이 필요해요.");
  if (!postId || typeof postId !== "string") return fail("잘못된 요청이에요.");

  const [src] = await db
    .select()
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);
  if (!src) return fail("공식을 찾을 수 없어요.");
  if (src.postType !== "formula" || !src.formula) {
    return fail("복제할 수 있는 공식이 아니에요.");
  }

  const [row] = await db
    .insert(posts)
    .values({
      postType: "formula",
      title: `[복제] ${src.title}`,
      oneLiner: src.oneLiner,
      category: src.category,
      tags: (src.tags as string[]) ?? [],
      difficulty: src.difficulty,
      workType: src.workType,
      verified: false, // 복제본은 미검증 초안
      authorType: "user",
      authorId: user.id,
      authorName: user.name,
      sourceName: null,
      sourceUrl: null,
      collectedAt: null,
      cardnews: null,
      formula: src.formula,
      // 원본이 참고하던 아티클 연결을 복제본에도 승계
      relatedArticleId: src.relatedArticleId ?? null,
    })
    .returning({ id: posts.id });

  revalidatePath("/archive");
  revalidatePath("/profile/me");
  return ok({ id: row.id });
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
  // 작성 양식. guide=구조화 폼 / free=자유 에디터(HTML).
  format: z.enum(["guide", "free"]).default("guide"),
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
