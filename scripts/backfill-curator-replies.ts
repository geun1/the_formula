// =============================================================================
// 기존 발행 아티클(cardnews)의 마중물 페르소나 댓글에 'AI 큐레이터' 답글(대댓글) 소급 생성.
// =============================================================================
// 페르소나 댓글은 열린 질문으로 끝나는데 기존 글엔 답이 없어 공허하므로, 각 질문에
// 큐레이터 답글을 채운다. 이미 답이 있는 댓글은 건너뜀(멱등). 신규 발행은 파이프라인이
// 자동 처리하므로 이 스크립트는 1회용.
//
// 실행: npm run backfill:curator   (= node --env-file=.env.local --import tsx ...)
// 필요 env: DATABASE_URL(_UNPOOLED), GOOGLE_GENERATIVE_AI_API_KEY
// =============================================================================
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { posts, rawArticles, interactions } from "@/db/schema";
import { AGENT_CURATOR_ID, AGENT_PERSONAS } from "@/lib/contract";
import { generateCuratorReplies } from "@/lib/cardnews";

const PERSONA_IDS = AGENT_PERSONAS.map((p) => p.id);

async function main() {
  // cardnews 포스트 + 원문(rawContent) 조인
  const articles = await db
    .select({
      postId: posts.id,
      title: posts.title,
      rawContent: rawArticles.rawContent,
    })
    .from(posts)
    .innerJoin(rawArticles, eq(rawArticles.postId, posts.id))
    .where(eq(posts.postType, "cardnews"));

  console.log(`cardnews 아티클 ${articles.length}건 점검 시작…\n`);
  let processed = 0;
  let repliesAdded = 0;
  let skipped = 0;
  const seenPosts = new Set<string>(); // 한 post 가 여러 raw_article 과 조인돼도 1회만 처리

  for (const a of articles) {
    if (seenPosts.has(a.postId)) continue;
    seenPosts.add(a.postId);
    // 이 글의 페르소나 마중물 댓글(top-level)
    const personaComments = await db
      .select({
        id: interactions.id,
        userId: interactions.userId,
        body: interactions.body,
      })
      .from(interactions)
      .where(
        and(
          eq(interactions.postId, a.postId),
          eq(interactions.type, "comment"),
          inArray(interactions.userId, PERSONA_IDS),
          isNull(interactions.parentId),
        ),
      );
    if (personaComments.length === 0) continue;

    // 이미 큐레이터 답이 달린 페르소나 댓글 id
    const existing = await db
      .select({ parentId: interactions.parentId })
      .from(interactions)
      .where(
        and(
          eq(interactions.postId, a.postId),
          eq(interactions.userId, AGENT_CURATOR_ID),
          inArray(
            interactions.parentId,
            personaComments.map((c) => c.id),
          ),
        ),
      );
    const repliedSet = new Set(existing.map((r) => r.parentId));
    const need = personaComments.filter((c) => !repliedSet.has(c.id));
    if (need.length === 0) {
      skipped++;
      continue;
    }

    // 큐레이터 답글 생성(personaId = userId 로 매칭)
    const replies = await generateCuratorReplies({
      originalTitle: a.title,
      rawContent: a.rawContent ?? a.title,
      personaComments: need.map((c) => ({
        personaId: c.userId,
        body: c.body ?? "",
      })),
    });
    const replyBy = new Map(replies.map((r) => [r.personaId, r.body]));
    const toInsert = need
      .map((c) => ({ parentId: c.id, body: replyBy.get(c.userId)?.trim() }))
      .filter((r): r is { parentId: string; body: string } => !!r.body);

    if (toInsert.length) {
      await db.insert(interactions).values(
        toInsert.map((r) => ({
          postId: a.postId,
          userId: AGENT_CURATOR_ID,
          type: "comment" as const,
          body: r.body,
          parentId: r.parentId,
        })),
      );
      repliesAdded += toInsert.length;
    }
    processed++;
    console.log(
      `[${processed}] ${a.title.slice(0, 44)} — 답글 +${toInsert.length}/${need.length}`,
    );
  }

  console.log(
    `\n완료: ${processed}건 처리, 큐레이터 답글 ${repliesAdded}개 추가, ${skipped}건 스킵(이미 있음).`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error("백필 실패:", e);
  process.exit(1);
});
