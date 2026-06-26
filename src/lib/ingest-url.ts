// =============================================================================
// 단일 URL → 크롤 → 큐 → Gemini 가공 → 발행 (수동 '아티클 추가')
// =============================================================================
// 일일 크론(api/cron)과 "똑같은 함수들"을 재사용하되, 임의 URL 한 건을 동기로 처리한다.
//   fetchArticleForIngest(크롤) → ingestArticles(큐, 멱등) → enrichArticle(Gemini)
//   → generatePersonaComments → publishArticle(발행)
// 차이: (1) RSS 가 아닌 임의 URL 이라 제목까지 직접 추출, (2) 관련성 필터 미적용
//      (사용자가 직접 고른 글이므로), (3) 한 건 동기 실행(즉시 결과 반환).
// =============================================================================
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { posts, rawArticles } from "@/db/schema";
import {
  fetchArticleForIngest,
  cleanUrl,
  MAX_RAW_CONTENT,
} from "@/lib/crawler";
import {
  ingestArticles,
  publishArticle,
  failArticle,
  type ArticleInput,
} from "@/lib/ingest";
import { enrichArticle, generatePersonaComments } from "@/lib/cardnews";

export interface AddUrlResult {
  ok: boolean;
  status?: "published" | "already_published";
  postId?: string;
  url?: string;
  title?: string;
  error?: string;
}

/** URL 호스트명을 출처명으로(예: netflixtechblog.com). */
function sourceNameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "웹";
  }
}

/**
 * SSRF 방어(defense-in-depth) — 루프백/사설/링크로컬 호스트 차단.
 * admin 전용이라 위험은 낮으나, 메타데이터(169.254.169.254)·내부망 접근의 1차 표면을 막는다.
 * (리터럴 IP/localhost 차단. DNS 리바인딩·리다이렉트 우회는 잔여 리스크로 남김.)
 */
function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, ""); // ipv6 대괄호 제거
  if (h === "localhost" || h.endsWith(".localhost") || h === "0.0.0.0" || h === "::1") {
    return true;
  }
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 0 || a === 127 || a === 10) return true; // 0.0.0.0/8, loopback, 10/8
    if (a === 169 && b === 254) return true; // 링크로컬(클라우드 메타데이터)
    if (a === 192 && b === 168) return true; // 192.168/16
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
  }
  if (h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80")) return true; // IPv6 ULA/링크로컬
  return false;
}

/**
 * 임의 기사 URL 을 크론과 동일한 파이프라인으로 한 건 발행한다.
 * 이미 발행된 URL 이면 기존 아티클 링크를 반환(멱등).
 */
export async function ingestAndPublishUrl(rawUrl: string): Promise<AddUrlResult> {
  // 0) URL 정규화 + 스킴 검증
  let url: string;
  try {
    const u = new URL(rawUrl.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return { ok: false, error: "http/https URL 만 추가할 수 있어요." };
    }
    if (isBlockedHost(u.hostname)) {
      return { ok: false, error: "내부/사설 주소는 추가할 수 없어요." };
    }
    url = cleanUrl(u.toString());
  } catch {
    return { ok: false, error: "올바른 URL 이 아니에요." };
  }

  // 1) 이미 발행된 아티클이면 그 링크 반환(멱등)
  const [existingPost] = await db
    .select({ id: posts.id, title: posts.title })
    .from(posts)
    .where(and(eq(posts.sourceUrl, url), eq(posts.postType, "cardnews")))
    .limit(1);
  if (existingPost) {
    return {
      ok: true,
      status: "already_published",
      postId: existingPost.id,
      url: `/article/${existingPost.id}`,
      title: existingPost.title,
    };
  }

  // 2) 크롤 — 제목/본문/대표이미지 추출
  const got = await fetchArticleForIngest(url);
  if (!got || got.text.length < 200) {
    return {
      ok: false,
      error:
        "본문을 추출하지 못했어요. 로그인 전용이거나 JS 로 렌더되는 페이지일 수 있어요.",
    };
  }

  // 3) 큐 적재(멱등) — 크론과 동일한 ingestArticles
  const input: ArticleInput = {
    sourceName: sourceNameFromUrl(url),
    sourceUrl: url,
    originalTitle: got.title,
    rawContent: `${got.title}\n\n${got.text}`.slice(0, MAX_RAW_CONTENT),
    coverImageUrl: got.image ?? undefined,
    collectedAt: new Date().toISOString(),
  };
  const ingest = await ingestArticles([input]);

  // 큐에서 이 URL 의 raw id 확보(신규면 items 에 queued, 이미 raw 에 있으면 재조회)
  let rawId = ingest.items.find((i) => i.sourceUrl === url && i.id)?.id;
  if (!rawId) {
    const [r] = await db
      .select({
        id: rawArticles.id,
        status: rawArticles.status,
        postId: rawArticles.postId,
      })
      .from(rawArticles)
      .where(eq(rawArticles.sourceUrl, url))
      .limit(1);
    if (r?.status === "enriched" && r.postId) {
      return {
        ok: true,
        status: "already_published",
        postId: r.postId,
        url: `/article/${r.postId}`,
      };
    }
    rawId = r?.id;
  }
  if (!rawId) return { ok: false, error: "큐 적재에 실패했어요." };

  // 4) 원자적 lease — pending/failed 인 raw 만 processing 으로 점유.
  //    크론(claimPending)·동일 URL 동시 제출과의 레이스에서 한 워커만 발행하도록 보장
  //    (publishArticle 은 enriched 일 때만 멱등이라, 발행 직전 점유로 이중 insert 차단).
  const claimed = await db
    .update(rawArticles)
    .set({
      status: "processing",
      claimedAt: new Date(),
      attempts: sql`${rawArticles.attempts} + 1`,
    })
    .where(
      and(
        eq(rawArticles.id, rawId),
        inArray(rawArticles.status, ["pending", "failed"]),
      ),
    )
    .returning({ id: rawArticles.id });
  if (claimed.length === 0) {
    // 다른 워커가 선점(processing/enriched) — 상태 재확인 후 안내.
    const [r2] = await db
      .select({ status: rawArticles.status, postId: rawArticles.postId })
      .from(rawArticles)
      .where(eq(rawArticles.id, rawId))
      .limit(1);
    if (r2?.status === "enriched" && r2.postId) {
      return {
        ok: true,
        status: "already_published",
        postId: r2.postId,
        url: `/article/${r2.postId}`,
      };
    }
    return {
      ok: false,
      error: "이미 처리 중인 아티클이에요. 잠시 후 피드에서 확인해주세요.",
    };
  }

  // 5) 가공(Gemini) + 다관점 마중물 댓글 + 발행 — 크론과 동일
  try {
    const enr = await enrichArticle({
      originalTitle: input.originalTitle,
      rawContent: input.rawContent,
      sourceName: input.sourceName,
      fallbackCategory: "ai",
    });
    const persona = await generatePersonaComments({
      originalTitle: input.originalTitle,
      rawContent: input.rawContent,
    });
    const pub = await publishArticle(
      rawId,
      { cardnews: enr.cardnews, category: enr.category, tags: enr.tags },
      persona,
    );
    if (!pub.ok) {
      await failArticle(rawId, pub.error ?? "publish 실패");
      return { ok: false, error: pub.error ?? "발행에 실패했어요." };
    }
    return {
      ok: true,
      status: pub.status,
      postId: pub.postId,
      url: pub.url,
      title: input.originalTitle,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await failArticle(rawId, msg);
    return { ok: false, error: `AI 가공 중 오류가 발생했어요: ${msg.slice(0, 200)}` };
  }
}
