// =============================================================================
// 크롤 소스 상태 — 조건부 GET 헤더 + 소스 헬스 영속화
// =============================================================================
// crawler.ts 는 DB-free(순수 함수)다. 이 모듈이 그 경계를 담당한다:
//  - loadSourceConditionals(): 저장된 etag/last-modified → crawlSources 에 주입할 Map
//  - recordCrawlOutcomes(perSource): 실행 결과(상태·검증자·최신항목일·실패횟수)를 upsert
// cron(/api/cron)에서만 호출. 둘 다 실패해도 수집은 진행되도록 호출부에서 격리.
// =============================================================================
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { crawlSourceState } from "@/db/schema";
import { SOURCES } from "@/lib/sources";
import type { SourceOutcome } from "@/lib/crawler";

/** 저장된 조건부 GET 검증자(소스명 → {etag,lastModified}). */
export async function loadSourceConditionals(): Promise<
  Map<string, { etag?: string; lastModified?: string }>
> {
  const rows = await db.select().from(crawlSourceState);
  const m = new Map<string, { etag?: string; lastModified?: string }>();
  for (const r of rows) {
    if (r.etag || r.lastModified) {
      m.set(r.name, {
        etag: r.etag ?? undefined,
        lastModified: r.lastModified ?? undefined,
      });
    }
  }
  return m;
}

const URL_BY_NAME = new Map(SOURCES.map((s) => [s.name, s.url]));

/** 크롤 실행 결과를 소스별로 upsert(헬스 + 다음 조건부 GET 검증자). */
export async function recordCrawlOutcomes(
  outcomes: SourceOutcome[],
): Promise<void> {
  const now = new Date();
  for (const o of outcomes) {
    const ok = !o.error;
    const [prev] = await db
      .select()
      .from(crawlSourceState)
      .where(eq(crawlSourceState.name, o.name))
      .limit(1);

    const values = {
      name: o.name,
      url: URL_BY_NAME.get(o.name) ?? prev?.url ?? null,
      // 304(미변경)면 헤더가 안 오므로 기존 검증자 유지, 200 이면 갱신.
      etag: o.notModified ? (prev?.etag ?? null) : (o.etag ?? null),
      lastModified: o.notModified
        ? (prev?.lastModified ?? null)
        : (o.lastModified ?? null),
      lastStatus: o.status ?? null,
      lastSuccessAt: ok ? now : (prev?.lastSuccessAt ?? null),
      lastItemDate: o.newestItemDate
        ? new Date(o.newestItemDate)
        : (prev?.lastItemDate ?? null),
      consecutiveFailures: ok ? 0 : (prev?.consecutiveFailures ?? 0) + 1,
      lastError: ok ? null : (o.error ?? "").slice(0, 300) || null,
      updatedAt: now,
    };

    await db
      .insert(crawlSourceState)
      .values(values)
      .onConflictDoUpdate({ target: crawlSourceState.name, set: values });
  }
}
