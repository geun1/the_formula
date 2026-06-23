// =============================================================================
// /api/articles — 아티클 수집 큐
// =============================================================================
// POST : 크롤러가 수집한 raw 아티클(단건/배치)을 큐에 적재 (API 키). AI 호출 X.
// GET  : 발행된(published) 아티클 목록 조회 (공개, 페이지네이션)
// 파이프라인: POST(큐) → GET /api/articles/pending(AI서버 클레임) → PATCH /api/articles/{id}(발행)
// 문서: /api-docs · 스펙: /api/openapi.json
// =============================================================================
import { NextRequest, NextResponse } from "next/server";
import { requireIngestKey } from "@/lib/api-auth";
import { articleInputSchema, ingestArticles, listArticles } from "@/lib/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 요청 바디 → 아티클 배열 정규화 (단건 / 배열 / {articles:[...]}) */
function normalizeBody(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  if (
    body &&
    typeof body === "object" &&
    Array.isArray((body as Record<string, unknown>).articles)
  ) {
    return (body as { articles: unknown[] }).articles;
  }
  return [body];
}

export async function POST(req: NextRequest) {
  const auth = requireIngestKey(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "JSON 본문을 파싱할 수 없어요." },
      { status: 400 },
    );
  }

  const rawItems = normalizeBody(body);
  if (rawItems.length === 0) {
    return NextResponse.json({ error: "수집할 아티클이 없어요." }, { status: 400 });
  }
  if (rawItems.length > 50) {
    return NextResponse.json(
      { error: "한 번에 최대 50건까지 보낼 수 있어요." },
      { status: 400 },
    );
  }

  const inputs = [];
  for (let i = 0; i < rawItems.length; i++) {
    const parsed = articleInputSchema.safeParse(rawItems[i]);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: `articles[${i}] 입력 오류: ${parsed.error.issues[0]?.path.join(".")} — ${parsed.error.issues[0]?.message}`,
        },
        { status: 400 },
      );
    }
    inputs.push(parsed.data);
  }

  try {
    const result = await ingestArticles(inputs);
    return NextResponse.json({ ok: true, ...result }, { status: 202 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "수집 실패" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? "20");
  const offset = Number(searchParams.get("offset") ?? "0");
  const category = searchParams.get("category") ?? undefined;

  try {
    const data = await listArticles({
      limit: Number.isFinite(limit) ? limit : 20,
      offset: Number.isFinite(offset) ? offset : 0,
      category,
    });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "조회 실패" },
      { status: 500 },
    );
  }
}
