// =============================================================================
// 아티클 수집 파이프라인 — 수집(큐) → [별도 AI 서버가 enrich] → 발행
// =============================================================================
// 동기 AI 생성을 제거하고 ingest 와 enrichment 를 분리한다.
//
//   크롤러 ──POST /api/articles──▶ raw_article(pending)  ──(webhook 알림, 선택)──▶ AI 서버
//                                         │                                          │
//   사이트 피드 ◀── post(cardnews) ◀──PATCH /api/articles/{id}(enriched)◀───────────┘
//                                   (또는 GET /api/articles/pending 으로 polling)
//
// - ingestArticles: raw_article 큐에 적재(멱등: sourceUrl unique). AI 호출 X.
// - claimPending : AI 서버가 대기 항목을 가져감(옵션: claim 시 processing 으로 lease).
// - publishArticle: AI 서버가 생성한 cardnews 로 post 발행 + 큐 enriched.
// - failArticle  : 가공 실패 기록.
// 서버 전용. 라우트핸들러(src/app/api/articles/**)에서 호출.
// =============================================================================
import { and, asc, count, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  rawArticles,
  posts,
  interactions,
  bookmarks,
  users,
  type DbRawArticle,
} from "@/db/schema";
import {
  AGENT_CURATOR_ID,
  AGENT_PERSONAS,
  CATEGORIES,
  type Category,
  type EnrichmentStatus,
  type InteractionType,
} from "@/lib/contract";

// ---- 입력 스키마 (크롤러가 보내는 1건의 raw 아티클) ----
export const articleInputSchema = z.object({
  sourceName: z.string().trim().min(1).describe("출처명 (예: Hacker News)"),
  sourceUrl: z.string().trim().url().describe("원문 URL — 중복 제거 키"),
  originalTitle: z.string().trim().min(1).describe("원문 제목"),
  rawContent: z.string().trim().min(1).describe("원문 본문(플레인 텍스트)"),
  collectedAt: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe("수집 시각 ISO-8601 (생략 시 현재 시각)"),
  coverImageUrl: z
    .string()
    .trim()
    .url()
    .optional()
    .describe("원문 대표 이미지 URL(og:image 등, 생략 가능)"),
  category: z.enum(CATEGORIES).optional().describe("카테고리(생략 가능)"),
});
export type ArticleInput = z.infer<typeof articleInputSchema>;

// ---- AI 서버가 발행 시 보내는 카드뉴스 ----
export const cardNewsInputSchema = z.object({
  summary: z.string().trim().min(1),
  keywords: z.array(z.string()).default([]),
  body: z.string().trim().min(1),
  coverImageUrl: z.string().default(""),
});
export const publishInputSchema = z.object({
  cardnews: cardNewsInputSchema,
  category: z.enum(CATEGORIES).optional(),
  tags: z.array(z.string()).optional(),
});
export type PublishInput = z.infer<typeof publishInputSchema>;

export interface IngestItemResult {
  sourceUrl: string;
  status: "queued" | "skipped";
  id?: string;
}
export interface IngestResult {
  received: number;
  queued: number;
  skipped: number;
  items: IngestItemResult[];
}

/** 선택적 webhook — 수집 직후 AI 서버에 push 알림(채널). 미설정 시 no-op. */
async function fireEnrichmentWebhook(
  items: { id: string; sourceUrl: string; originalTitle: string }[],
): Promise<void> {
  const url = process.env.ENRICHMENT_WEBHOOK_URL;
  if (!url || items.length === 0) return;
  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (process.env.ENRICHMENT_WEBHOOK_SECRET) {
      headers["authorization"] = `Bearer ${process.env.ENRICHMENT_WEBHOOK_SECRET}`;
    }
    await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ event: "articles.ingested", articles: items }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) {
    console.warn("[ingest] webhook 실패:", e instanceof Error ? e.message : e);
  }
}

/** 크롤러 → raw_article 큐 적재(멱등). AI 호출 없음. */
export async function ingestArticles(
  inputs: ArticleInput[],
): Promise<IngestResult> {
  const items: IngestItemResult[] = [];

  // 배치 내 중복 제거(sourceUrl 첫 항목 유지)
  const seen = new Set<string>();
  const unique: ArticleInput[] = [];
  for (const a of inputs) {
    if (seen.has(a.sourceUrl)) {
      items.push({ sourceUrl: a.sourceUrl, status: "skipped" });
      continue;
    }
    seen.add(a.sourceUrl);
    unique.push(a);
  }

  if (unique.length === 0) {
    return { received: inputs.length, queued: 0, skipped: items.length, items };
  }

  // DB 적재 — sourceUrl unique 충돌은 onConflictDoNothing 으로 멱등 skip
  const now = new Date();
  const inserted = await db
    .insert(rawArticles)
    .values(
      unique.map((a) => ({
        sourceName: a.sourceName,
        sourceUrl: a.sourceUrl,
        originalTitle: a.originalTitle,
        rawContent: a.rawContent,
        coverImageUrl: a.coverImageUrl ?? null,
        category: (a.category ?? null) as Category | null,
        collectedAt: a.collectedAt ? new Date(a.collectedAt) : now,
        status: "pending" as EnrichmentStatus,
      })),
    )
    .onConflictDoNothing({ target: rawArticles.sourceUrl })
    .returning({
      id: rawArticles.id,
      sourceUrl: rawArticles.sourceUrl,
      originalTitle: rawArticles.originalTitle,
    });

  const queuedUrls = new Set(inserted.map((r) => r.sourceUrl));
  for (const a of unique) {
    if (!queuedUrls.has(a.sourceUrl)) {
      items.push({ sourceUrl: a.sourceUrl, status: "skipped" }); // 이미 수집됨
    }
  }
  for (const r of inserted) {
    items.push({ sourceUrl: r.sourceUrl, status: "queued", id: r.id });
  }

  // push 채널 알림(있으면)
  await fireEnrichmentWebhook(inserted);

  return {
    received: inputs.length,
    queued: inserted.length,
    skipped: items.length - inserted.length,
    items,
  };
}

export interface PendingArticle {
  id: string;
  sourceName: string;
  sourceUrl: string;
  originalTitle: string;
  rawContent: string;
  category: Category | null;
  collectedAt: string | null;
  attempts: number;
  status: EnrichmentStatus;
}

function toPending(r: DbRawArticle): PendingArticle {
  return {
    id: r.id,
    sourceName: r.sourceName,
    sourceUrl: r.sourceUrl,
    originalTitle: r.originalTitle,
    rawContent: r.rawContent,
    category: r.category,
    collectedAt: r.collectedAt ? r.collectedAt.toISOString() : null,
    attempts: r.attempts,
    status: r.status,
  };
}

/**
 * AI 서버가 대기 항목을 가져감.
 * claim=true 면 가져온 항목을 processing 으로 표시(lease)해 중복 처리 방지.
 */
export async function claimPending(opts: {
  limit?: number;
  claim?: boolean;
}): Promise<PendingArticle[]> {
  const limit = Math.min(Math.max(opts.limit ?? 10, 1), 50);

  // stale lease 회수 — enrich 도중 타임아웃/크래시로 processing 에 20분 넘게 멈춘 raw 를
  // pending 으로 되돌려 다음 실행이 이어받게 함(영구 stuck 방지).
  if (opts.claim) {
    const staleBefore = new Date(Date.now() - 20 * 60 * 1000);
    await db
      .update(rawArticles)
      .set({ status: "pending" })
      .where(
        and(
          eq(rawArticles.status, "processing"),
          lt(rawArticles.claimedAt, staleBefore),
        ),
      );
  }

  const candidates = await db
    .select({ id: rawArticles.id })
    .from(rawArticles)
    .where(eq(rawArticles.status, "pending"))
    .orderBy(asc(rawArticles.createdAt))
    .limit(limit);
  const ids = candidates.map((c) => c.id);
  if (ids.length === 0) return [];

  if (opts.claim) {
    await db
      .update(rawArticles)
      .set({
        status: "processing",
        attempts: sql`${rawArticles.attempts} + 1`,
        claimedAt: new Date(),
      })
      .where(inArray(rawArticles.id, ids));
  }

  const rows = await db
    .select()
    .from(rawArticles)
    .where(inArray(rawArticles.id, ids))
    .orderBy(asc(rawArticles.createdAt));
  return rows.map(toPending);
}

export interface PublishResult {
  ok: boolean;
  postId?: string;
  url?: string;
  status?: "published" | "already_published";
  error?: string;
}

/** AI 페르소나 user 행 보장(없으면 생성). 댓글 적재 전 FK 안전 확보. */
async function ensurePersonaUsers(): Promise<void> {
  await db
    .insert(users)
    .values([
      // AI 큐레이터 — 대댓글(답글) 작성자 FK 보장.
      {
        id: AGENT_CURATOR_ID,
        name: "AI 큐레이터",
        role: "AI 에디터",
        isAgent: true,
        image: `https://avatar.vercel.sh/${AGENT_CURATOR_ID}?text=AI`,
      },
      ...AGENT_PERSONAS.map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        isAgent: true,
        image: `https://avatar.vercel.sh/${p.id}?text=AI`,
      })),
    ])
    .onConflictDoNothing();
}

const PERSONA_IDS = new Set(AGENT_PERSONAS.map((p) => p.id));

/** AI 서버 → 생성한 cardnews 로 post 발행 + 큐 enriched (멱등). */
export async function publishArticle(
  rawId: string,
  payload: PublishInput,
  /** 수집 글 다관점 마중물 댓글(원형 페르소나) + 각 댓글에 대한 AI 큐레이터 답글.
   *  신규 발행 시에만 적재. curatorReply 가 있으면 해당 페르소나 댓글의 대댓글로 달림. */
  personaComments: {
    personaId: string;
    body: string;
    curatorReply?: string;
  }[] = [],
): Promise<PublishResult> {
  const [raw] = await db
    .select()
    .from(rawArticles)
    .where(eq(rawArticles.id, rawId))
    .limit(1);
  if (!raw) return { ok: false, error: "raw_article 를 찾을 수 없어요." };

  // 이미 발행됨 → 멱등 반환
  if (raw.status === "enriched" && raw.postId) {
    return {
      ok: true,
      postId: raw.postId,
      url: `/article/${raw.postId}`,
      status: "already_published",
    };
  }

  const cn = payload.cardnews;
  const cardnews = {
    summary: cn.summary,
    keywords: cn.keywords ?? [],
    body: cn.body,
    // AI 가 커버를 안 주면(="") 크롤 시 추출한 원문 대표 이미지를 사용.
    coverImageUrl: cn.coverImageUrl || raw.coverImageUrl || "",
  };

  const [post] = await db
    .insert(posts)
    .values({
      postType: "cardnews",
      title: raw.originalTitle,
      oneLiner: cardnews.summary.slice(0, 120),
      category: (payload.category ?? raw.category ?? "ai") as Category,
      tags: (payload.tags ?? cardnews.keywords).slice(0, 5),
      difficulty: "intermediate",
      workType: "분석",
      verified: false,
      authorType: "agent",
      authorId: AGENT_CURATOR_ID,
      authorName: "AI 큐레이터",
      sourceName: raw.sourceName,
      sourceUrl: raw.sourceUrl,
      collectedAt: raw.collectedAt ?? new Date(),
      cardnews,
      formula: null,
      relatedArticleId: null,
    })
    .returning({ id: posts.id });

  await db
    .update(rawArticles)
    .set({
      status: "enriched",
      postId: post.id,
      processedAt: new Date(),
      error: null,
    })
    .where(eq(rawArticles.id, rawId));

  // 다관점 페르소나 마중물 댓글 + AI 큐레이터 답글(대댓글) 적재(신규 발행 시에만).
  // 실패해도 발행은 유지.
  const valid = personaComments.filter((c) => PERSONA_IDS.has(c.personaId));
  if (valid.length) {
    try {
      // 멱등 — 이미 이 post 에 페르소나 마중물 댓글이 있으면 재적재 skip(재발행 중복 방지).
      const [existing] = await db
        .select({ id: interactions.id })
        .from(interactions)
        .where(
          and(
            eq(interactions.postId, post.id),
            eq(interactions.type, "comment"),
            inArray(interactions.userId, [...PERSONA_IDS]),
          ),
        )
        .limit(1);
      if (!existing) {
        await ensurePersonaUsers();
        // 페르소나 댓글 — userId 도 반환받아 personaId 로 매칭(RETURNING 순서 비의존).
        const inserted = await db
          .insert(interactions)
          .values(
            valid.map((c) => ({
              postId: post.id,
              userId: c.personaId,
              type: "comment" as InteractionType,
              body: c.body,
            })),
          )
          .returning({ id: interactions.id, userId: interactions.userId });
        const idByPersona = new Map(inserted.map((r) => [r.userId, r.id]));
        // AI 큐레이터가 각 페르소나의 열린 질문에 답하는 대댓글(parentId = 그 페르소나 댓글).
        const replies = valid
          .map((c) => ({
            parentId: idByPersona.get(c.personaId),
            body: c.curatorReply?.trim(),
          }))
          .filter(
            (r): r is { parentId: string; body: string } =>
              !!r.parentId && !!r.body,
          );
        if (replies.length) {
          await db.insert(interactions).values(
            replies.map((r) => ({
              postId: post.id,
              userId: AGENT_CURATOR_ID,
              type: "comment" as InteractionType,
              body: r.body,
              parentId: r.parentId,
            })),
          );
        }
      }
    } catch (e) {
      console.warn(
        "[persona] 댓글/답글 적재 실패(발행은 완료):",
        e instanceof Error ? e.message : e,
      );
    }
  }

  return {
    ok: true,
    postId: post.id,
    url: `/article/${post.id}`,
    status: "published",
  };
}

/** AI 서버 → 가공 실패 기록. */
export async function failArticle(
  rawId: string,
  error: string,
): Promise<boolean> {
  const res = await db
    .update(rawArticles)
    .set({
      status: "failed",
      error: String(error).slice(0, 500),
      processedAt: new Date(),
    })
    .where(eq(rawArticles.id, rawId))
    .returning({ id: rawArticles.id });
  return res.length > 0;
}

/** 큐 상태 카운트 */
export async function getQueueStats(): Promise<
  Record<EnrichmentStatus, number>
> {
  const rows = await db
    .select({ status: rawArticles.status, n: count() })
    .from(rawArticles)
    .groupBy(rawArticles.status);
  const out: Record<EnrichmentStatus, number> = {
    pending: 0,
    processing: 0,
    enriched: 0,
    failed: 0,
  };
  for (const r of rows) out[r.status] = Number(r.n);
  return out;
}

// =============================================================================
// 발행된(published) 아티클 조회 — 사이트 피드/공개 API 용
// =============================================================================
export interface ArticleDTO {
  id: string;
  title: string;
  summary: string;
  keywords: string[];
  category: Category;
  tags: string[];
  sourceName: string | null;
  sourceUrl: string | null;
  collectedAt: string | null;
  createdAt: string;
  url: string;
  likeCount: number;
  commentCount: number;
  saveCount: number;
}

export async function listArticles(opts: {
  limit?: number;
  offset?: number;
  category?: string;
}): Promise<{ total: number; items: ArticleDTO[] }> {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);

  const where = opts.category
    ? and(
        eq(posts.postType, "cardnews"),
        eq(posts.category, opts.category as Category),
      )
    : eq(posts.postType, "cardnews");

  const rows = await db
    .select()
    .from(posts)
    .where(where)
    .orderBy(desc(posts.createdAt))
    .limit(limit)
    .offset(offset);

  const ids = rows.map((r) => r.id);
  const counts = new Map<
    string,
    { like: number; comment: number; save: number }
  >();
  if (ids.length) {
    const ix = await db
      .select({ postId: interactions.postId, type: interactions.type })
      .from(interactions)
      .where(inArray(interactions.postId, ids));
    const bm = await db
      .select({ postId: bookmarks.postId })
      .from(bookmarks)
      .where(inArray(bookmarks.postId, ids));
    for (const id of ids) counts.set(id, { like: 0, comment: 0, save: 0 });
    for (const i of ix) {
      const c = counts.get(i.postId);
      if (!c) continue;
      if (i.type === "like") c.like++;
      else if (i.type === "comment") c.comment++;
    }
    for (const b of bm) {
      const c = counts.get(b.postId);
      if (c) c.save++;
    }
  }

  const items: ArticleDTO[] = rows.map((r) => {
    const c = counts.get(r.id) ?? { like: 0, comment: 0, save: 0 };
    return {
      id: r.id,
      title: r.title,
      summary: r.cardnews?.summary ?? r.oneLiner ?? "",
      keywords: r.cardnews?.keywords ?? r.tags ?? [],
      category: r.category,
      tags: r.tags ?? [],
      sourceName: r.sourceName,
      sourceUrl: r.sourceUrl,
      collectedAt: r.collectedAt ? r.collectedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      url: `/article/${r.id}`,
      likeCount: c.like,
      commentCount: c.comment,
      saveCount: c.save,
    };
  });

  return { total: items.length, items };
}
