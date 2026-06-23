// =============================================================================
// GET /api/articles/pending — 별도 AI 서버가 대기 아티클을 가져감(클레임)
// =============================================================================
// ?limit=N (기본 10, 최대 50) · ?claim=true → 가져온 항목을 processing 으로 lease
// 응답에 큐 상태 카운트(queue)도 함께 반환. API 키 필요.
// =============================================================================
import { NextRequest, NextResponse } from "next/server";
import { requireIngestKey } from "@/lib/api-auth";
import { claimPending, getQueueStats } from "@/lib/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = requireIngestKey(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? "10");
  const claim = searchParams.get("claim") === "true";

  try {
    const [items, queue] = await Promise.all([
      claimPending({ limit: Number.isFinite(limit) ? limit : 10, claim }),
      getQueueStats(),
    ]);
    return NextResponse.json({
      queue,
      claimed: claim,
      count: items.length,
      items,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "조회 실패" },
      { status: 500 },
    );
  }
}
