// =============================================================================
// 기존 cardnews 아티클 전체에 마중물 페르소나 댓글 + AI 큐레이터 대댓글을 소급 생성.
// =============================================================================
// 발행 파이프라인(publishArticle)과 동일 시퀀스: generatePersonaComments →
// generateCuratorReplies → 페르소나 댓글 insert(returning id,userId) → 큐레이터
// 답글을 personaId 매칭으로 대댓글 적재. 이미 페르소나 댓글이 있는 글은 skip(멱등).
//
// 실행: npm run backfill:seed
// 필요 env: DATABASE_URL(_UNPOOLED), GOOGLE_GENERATIVE_AI_API_KEY
// =============================================================================
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { posts, rawArticles, interactions, users } from "@/db/schema";
import { AGENT_CURATOR_ID, AGENT_PERSONAS } from "@/lib/contract";
import {
  generatePersonaComments,
  generateCuratorReplies,
} from "@/lib/cardnews";

const PERSONA_IDS = AGENT_PERSONAS.map((p) => p.id);
const CONCURRENCY = 4;

/** 동시성 제한 병렬 매핑. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, i: number) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let idx = 0;
  const worker = async () => {
    while (idx < items.length) {
      const i = idx++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker),
  );
  return out;
}

/** 페르소나/큐레이터 user 행 보장(FK). */
async function ensureAgents() {
  await db
    .insert(users)
    .values([
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

async function processArticle(a: {
  postId: string;
  title: string;
  rawContent: string;
}): Promise<{ status: string; persona: number; curator: number }> {
  // 이미 페르소나 마중물 댓글이 있으면 skip(멱등)
  const [has] = await db
    .select({ id: interactions.id })
    .from(interactions)
    .where(
      and(
        eq(interactions.postId, a.postId),
        eq(interactions.type, "comment"),
        inArray(interactions.userId, PERSONA_IDS),
        isNull(interactions.parentId),
      ),
    )
    .limit(1);
  if (has) return { status: "skip", persona: 0, curator: 0 };

  // 1) 마중물 페르소나 댓글
  const persona = await generatePersonaComments({
    originalTitle: a.title,
    rawContent: a.rawContent,
  });
  if (persona.length === 0) return { status: "no-persona", persona: 0, curator: 0 };

  // 2) 각 페르소나 질문에 대한 큐레이터 답글
  const curator = await generateCuratorReplies({
    originalTitle: a.title,
    rawContent: a.rawContent,
    personaComments: persona,
  });
  const replyBy = new Map(curator.map((r) => [r.personaId, r.body]));

  // 3) 페르소나 댓글 insert(returning id,userId) → personaId 매칭으로 대댓글 적재
  const inserted = await db
    .insert(interactions)
    .values(
      persona.map((c) => ({
        postId: a.postId,
        userId: c.personaId,
        type: "comment" as const,
        body: c.body,
      })),
    )
    .returning({ id: interactions.id, userId: interactions.userId });
  const idByPersona = new Map(inserted.map((r) => [r.userId, r.id]));
  const replies = persona
    .map((c) => ({
      parentId: idByPersona.get(c.personaId),
      body: replyBy.get(c.personaId)?.trim(),
    }))
    .filter(
      (r): r is { parentId: string; body: string } => !!r.parentId && !!r.body,
    );
  if (replies.length) {
    await db.insert(interactions).values(
      replies.map((r) => ({
        postId: a.postId,
        userId: AGENT_CURATOR_ID,
        type: "comment" as const,
        body: r.body,
        parentId: r.parentId,
      })),
    );
  }
  return { status: "ok", persona: persona.length, curator: replies.length };
}

async function main() {
  await ensureAgents();

  // cardnews 글 + rawContent (post 당 1행으로 dedup)
  const rows = await db
    .select({
      postId: posts.id,
      title: posts.title,
      rawContent: rawArticles.rawContent,
    })
    .from(posts)
    .innerJoin(rawArticles, eq(rawArticles.postId, posts.id))
    .where(eq(posts.postType, "cardnews"));
  const seen = new Set<string>();
  const articles = rows.filter((r) =>
    seen.has(r.postId) ? false : (seen.add(r.postId), true),
  );

  console.log(`cardnews 아티클 ${articles.length}건 — 마중물 댓글+대댓글 백필 시작 (동시성 ${CONCURRENCY})\n`);
  let done = 0;
  const results = await mapLimit(articles, CONCURRENCY, async (a) => {
    const r = await processArticle({
      postId: a.postId,
      title: a.title,
      rawContent: a.rawContent ?? a.title,
    });
    done++;
    console.log(
      `[${done}/${articles.length}] ${r.status.padEnd(10)} persona+${r.persona} curator+${r.curator} | ${a.title.slice(0, 40)}`,
    );
    return r;
  });

  const ok = results.filter((r) => r.status === "ok").length;
  const skip = results.filter((r) => r.status === "skip").length;
  const noP = results.filter((r) => r.status === "no-persona").length;
  const personaTotal = results.reduce((n, r) => n + r.persona, 0);
  const curatorTotal = results.reduce((n, r) => n + r.curator, 0);
  console.log(
    `\n완료: ${ok}건 생성(skip ${skip}, 페르소나 실패 ${noP}) — 페르소나 댓글 ${personaTotal}, 큐레이터 답글 ${curatorTotal} 추가.`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error("백필 실패:", e);
  process.exit(1);
});
