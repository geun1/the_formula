// =============================================================================
// POST /api/archive/draft — 'AI와 함께 써보기' 초안 생성 (송근일/승인자 전용)
// =============================================================================
// 로그인 + canAddArticle(admin||approved) 필수. 방향성(+연결 아티클 맥락)으로
// 마크다운 초안을 생성해 반환. Gemini 호출이 길어 maxDuration 300.
// =============================================================================
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { canAddArticle } from "@/lib/article-permission";
import { generateArchiveDraft } from "@/lib/cardnews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }
  if (!(await canAddArticle(session.user.id))) {
    return NextResponse.json(
      { error: "AI 작성 권한이 없어요. 권한을 먼저 요청해주세요." },
      { status: 403 },
    );
  }

  let direction = "";
  let articleId: string | null = null;
  try {
    const body = (await req.json()) as { direction?: unknown; articleId?: unknown };
    direction = typeof body?.direction === "string" ? body.direction : "";
    articleId =
      typeof body?.articleId === "string" && body.articleId
        ? body.articleId
        : null;
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }
  if (direction.trim().length < 5) {
    return NextResponse.json(
      { error: "어떤 글을 쓰고 싶은지 방향을 5자 이상 적어주세요." },
      { status: 400 },
    );
  }
  if (direction.length > 2000) {
    return NextResponse.json(
      { error: "방향성은 2000자 이내로 적어주세요." },
      { status: 400 },
    );
  }

  // 연결된 아티클 맥락(있으면) — 제목 + 카드뉴스 요약/본문.
  let articleTitle: string | undefined;
  let articleContent: string | undefined;
  if (articleId) {
    const [a] = await db
      .select({
        title: posts.title,
        postType: posts.postType,
        cardnews: posts.cardnews,
      })
      .from(posts)
      .where(eq(posts.id, articleId))
      .limit(1);
    // createArchive 와 대칭 — 카드뉴스(아티클)만 맥락으로 사용.
    if (a && a.postType === "cardnews") {
      articleTitle = a.title;
      articleContent = [a.cardnews?.summary, a.cardnews?.body]
        .filter(Boolean)
        .join("\n\n");
    }
  }

  try {
    const draft = await generateArchiveDraft({
      direction: direction.trim(),
      articleTitle,
      articleContent,
    });
    if (!draft) {
      return NextResponse.json(
        { error: "초안 생성에 실패했어요. 다시 시도해주세요." },
        { status: 502 },
      );
    }
    return NextResponse.json({ draft });
  } catch (e) {
    return NextResponse.json(
      {
        error: `AI 초안 생성 중 오류가 발생했어요: ${
          e instanceof Error ? e.message.slice(0, 150) : ""
        }`,
      },
      { status: 502 },
    );
  }
}
