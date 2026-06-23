// =============================================================================
// POST /api/posts — 카드뉴스 ingest (크롤러(민성) → 적재(근일))
// =============================================================================
// IngestPostInput → cardnews 없으면 AI 생성 → DB insert(작성자 agent-curator).
// GET 은 캐시 안 함(라우트핸들러 기본). 입력검증 zod.
// =============================================================================
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { AGENT_CURATOR_ID, CATEGORIES } from "@/lib/contract";
import { generateCardNews } from "@/lib/cardnews";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const cardNewsSchema = z.object({
  summary: z.string().min(1),
  keywords: z.array(z.string()),
  body: z.string().min(1),
  coverImageUrl: z.string().default(""),
});

const ingestSchema = z.object({
  sourceName: z.string().trim().min(1),
  sourceUrl: z.string().trim().url(),
  originalTitle: z.string().trim().min(1),
  rawContent: z.string().trim().min(1),
  collectedAt: z.string().trim().min(1),
  category: z.enum(CATEGORIES).optional(),
  cardnews: cardNewsSchema.optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = ingestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "invalid input" },
        { status: 400 },
      );
    }
    const input = parsed.data;

    // cardnews 없으면 AI 생성 (실패 시 cardnews.ts 내부 폴백)
    const cardnews =
      input.cardnews ??
      (await generateCardNews({
        originalTitle: input.originalTitle,
        rawContent: input.rawContent,
        sourceName: input.sourceName,
      }));

    const collectedAt = new Date(input.collectedAt);
    const [row] = await db
      .insert(posts)
      .values({
        postType: "cardnews",
        title: input.originalTitle,
        oneLiner: cardnews.summary.slice(0, 120),
        category: input.category ?? "ai",
        tags: cardnews.keywords.slice(0, 5),
        difficulty: "intermediate",
        workType: "분석",
        verified: false,
        authorType: "agent",
        authorId: AGENT_CURATOR_ID,
        authorName: "AI 큐레이터",
        sourceName: input.sourceName,
        sourceUrl: input.sourceUrl,
        collectedAt: isNaN(collectedAt.getTime()) ? new Date() : collectedAt,
        cardnews,
        formula: null,
      })
      .returning({ id: posts.id, title: posts.title });

    return NextResponse.json({ ok: true, item: row }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "ingest failed" },
      { status: 500 },
    );
  }
}
