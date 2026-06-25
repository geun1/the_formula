// =============================================================================
// GET /api/cron — 매일 자동 수집·가공·발행 (Vercel Cron)
// =============================================================================
// 1) crawlSources(): 뉴스레터/블로그/긱뉴스 RSS → ingestArticles() (raw 큐, 멱등)
// 2) claimPending → enrichArticle(Gemini) → publishArticle (시간/건수 캡 내)
//
// 인증: Vercel Cron 은 'Authorization: Bearer ${CRON_SECRET}' 헤더를 보냄.
//       수동 호출은 ?secret=<CRON_SECRET> 또는 동일 Bearer 로 가능.
// 단발 함수라 maxDuration 까지 안에서 가능한 만큼 처리하고, 남은 pending 은
// 다음 실행이 이어받음(큐 기반 — 멱등/이어처리 안전).
// =============================================================================
import { NextRequest, NextResponse } from "next/server";
import { crawlSources } from "@/lib/crawler";
import {
  ingestArticles,
  claimPending,
  publishArticle,
  failArticle,
  getQueueStats,
} from "@/lib/ingest";
import { enrichArticle } from "@/lib/cardnews";
import { loadSourceConditionals, recordCrawlOutcomes } from "@/lib/source-state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const q = req.nextUrl.searchParams.get("secret");
  return q === secret;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const collectOnly = sp.get("mode") === "collect";
  const enrichOnly = sp.get("mode") === "enrich";
  // 한 실행에서 가공·발행할 최대 건수(시간 예산 보호)
  const publishCap = Math.min(Math.max(Number(sp.get("cap") ?? 24), 1), 60);
  const deadline = Date.now() + 250_000; // ~250s 안에서만 가공

  const started = Date.now();
  const result: Record<string, unknown> = { ok: true };

  // ── 1) 수집 → 큐 ─────────────────────────────────────────────────
  if (!enrichOnly) {
    try {
      // 이전 실행의 조건부 GET 검증자 로드(실패해도 전체 fetch 로 진행).
      const conditional = await loadSourceConditionals().catch(() => undefined);
      const crawl = await crawlSources({
        maxPerSource: Number(sp.get("perSource") ?? 8),
        lookbackDays: Number(sp.get("lookbackDays") ?? 4),
        totalCap: Number(sp.get("totalCap") ?? 60),
        filterRelevance: sp.get("filter") !== "0",
        conditional,
      });
      // 소스 헬스 + 다음 검증자 적재(실패해도 수집 결과엔 영향 없음).
      await recordCrawlOutcomes(crawl.perSource).catch((e) =>
        console.warn("[cron] source-state 저장 실패:", e instanceof Error ? e.message : e),
      );
      const ingest = await ingestArticles(crawl.inputs);
      const notModified = crawl.perSource.filter((p) => p.notModified).length;
      result.collect = {
        crawled: crawl.inputs.length,
        fullFetched: crawl.fullFetched,
        notModified,
        queued: ingest.queued,
        skipped: ingest.skipped,
        perSource: crawl.perSource,
      };
    } catch (e) {
      result.collectError = e instanceof Error ? e.message : String(e);
    }
  }

  // ── 2) 큐 → 가공(Gemini) → 발행 ──────────────────────────────────
  const published: { id: string; postId?: string; title?: string }[] = [];
  const failed: { id: string; error: string }[] = [];
  if (!collectOnly) {
    let processed = 0;
    while (processed < publishCap && Date.now() < deadline) {
      const batch = await claimPending({ limit: 4, claim: true });
      if (batch.length === 0) break;
      for (const raw of batch) {
        if (processed >= publishCap || Date.now() >= deadline) break;
        processed++;
        try {
          const enr = await enrichArticle({
            originalTitle: raw.originalTitle,
            rawContent: raw.rawContent,
            sourceName: raw.sourceName,
            fallbackCategory: raw.category ?? "ai",
          });
          const pub = await publishArticle(raw.id, {
            cardnews: enr.cardnews,
            category: enr.category,
            tags: enr.tags,
          });
          if (pub.ok) {
            published.push({ id: raw.id, postId: pub.postId, title: raw.originalTitle });
          } else {
            await failArticle(raw.id, pub.error ?? "publish 실패");
            failed.push({ id: raw.id, error: pub.error ?? "publish 실패" });
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          await failArticle(raw.id, msg);
          failed.push({ id: raw.id, error: msg });
        }
      }
    }
  }

  result.enrich = { published: published.length, failed: failed.length, publishedItems: published, failedItems: failed };
  result.queue = await getQueueStats();
  result.tookMs = Date.now() - started;

  return NextResponse.json(result);
}
