// =============================================================================
// PATCH /api/articles/{id} — 별도 AI 서버가 가공 결과를 제출
// =============================================================================
// {id} = raw_article id.
//  - 발행(성공): body = { cardnews:{summary,keywords,body,coverImageUrl?}, category?, tags? }
//    → post(cardnews) 발행 + 큐 enriched (멱등)
//  - 실패: body = { status:"failed", error:"..." } → 큐 failed
// API 키 필요.
// =============================================================================
import { NextRequest, NextResponse } from "next/server";
import { requireIngestKey } from "@/lib/api-auth";
import { publishArticle, failArticle, publishInputSchema } from "@/lib/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = requireIngestKey(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "JSON 본문을 파싱할 수 없어요." },
      { status: 400 },
    );
  }

  const b = (body ?? {}) as Record<string, unknown>;

  // 실패 보고
  if (b.status === "failed" || (typeof b.error === "string" && !b.cardnews)) {
    const ok = await failArticle(id, String(b.error ?? "가공 실패"));
    if (!ok) {
      return NextResponse.json(
        { error: "raw_article 를 찾을 수 없어요." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, id, status: "failed" });
  }

  // 발행
  const parsed = publishInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: `입력 오류: ${parsed.error.issues[0]?.path.join(".")} — ${parsed.error.issues[0]?.message}`,
      },
      { status: 400 },
    );
  }

  try {
    const result = await publishArticle(id, parsed.data);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json(result, {
      status: result.status === "already_published" ? 200 : 201,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "발행 실패" },
      { status: 500 },
    );
  }
}
