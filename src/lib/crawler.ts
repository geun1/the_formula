// =============================================================================
// RSS 크롤러 — 소스 피드 fetch → ArticleInput[] (raw_article 큐 입력)
// =============================================================================
// 서버리스 친화: jsdom/readability 없이 fetch + rss-parser + 정규식 HTML 제거.
// - 소스별 최근 N건, 룩백 일수 내, AI/AX 관련성 필터.
// - 피드 단위 try/catch — 하나 죽어도 전체는 진행(에러 수집).
// - 멱등은 ingestArticles(sourceUrl unique)가 담당하므로 여기선 dedup만 가볍게.
// =============================================================================
import Parser from "rss-parser";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { SOURCES, type Source } from "@/lib/sources";
import type { ArticleInput } from "@/lib/ingest";

// RSS 본문이 이 길이 미만이면 발췌로 보고 원문 URL 을 따라가 전문 추출.
const FULLTEXT_THRESHOLD = 1500;
// 가공에 넘길 본문 최대 길이(Gemini 3.5 Flash 는 대용량 컨텍스트 — 넉넉히).
const MAX_RAW = 40000;
// 관련성 판정에 쓸 리드(본문 앞부분) 길이. 장문 엔지니어링 블로그(2만자+)는
// 본문 깊숙이 "automation/agents" 같은 단어가 우연히 섞여 오탐이 나므로,
// "글이 실제로 AI 를 다루는가"를 제목 + 리드에서만 판정한다.
const RELEVANCE_LEAD = 700;

const UA = "Mozilla/5.0 (compatible; TheFormulaBot/1.0; +https://the-formula-silk.vercel.app)";

type MediaNode = { $?: { url?: string }; url?: string } | undefined;
type FeedItem = {
  title?: string;
  link?: string;
  isoDate?: string;
  pubDate?: string;
  content?: string;
  contentSnippet?: string;
  "content:encoded"?: string;
  summary?: string;
  enclosure?: { url?: string; type?: string };
  "media:content"?: MediaNode;
  "media:thumbnail"?: MediaNode;
};

const parser: Parser<unknown, FeedItem> = new Parser({
  timeout: 15000,
  headers: { "User-Agent": UA },
  customFields: {
    item: [
      "content:encoded",
      "content",
      "contentSnippet",
      "summary",
      "media:content",
      "media:thumbnail",
    ],
  },
});

/** RSS 항목에서 대표 이미지 추출(enclosure / media:* / content 내 첫 img). */
function rssImage(it: FeedItem): string | null {
  if (it.enclosure?.url && /^https?:/.test(it.enclosure.url) && /image|\.(jpe?g|png|webp|gif)/i.test(it.enclosure.type ?? it.enclosure.url)) {
    return it.enclosure.url;
  }
  const media = it["media:content"] ?? it["media:thumbnail"];
  const murl = media?.$?.url ?? media?.url;
  if (murl && /^https?:/.test(murl)) return murl;
  const html = it["content:encoded"] || it.content || "";
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  if (m && /^https?:/.test(m[1])) return m[1];
  return null;
}

/** HTML <head> 에서 og:image / twitter:image 추출(절대 URL 로 보정). */
function ogImage(html: string, baseUrl: string): string | null {
  const re = /<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const c = /content=["']([^"']+)["']/i.exec(m[0]);
    if (c?.[1]) {
      try {
        return new URL(c[1], baseUrl).toString();
      } catch {
        /* skip */
      }
    }
  }
  return null;
}

// AI/AX 관련성 판정. 짧은 영어 약어(ai/ax/llm…)는 **단어 경계**로 매칭해야
// email/again/available 같은 단어에 오탐하지 않음. 한국어/긴 영어는 substring.
// ASCII 약어 경계 매칭(\b 는 ASCII 토큰에 정확).
const LATIN_RE =
  /\b(a\.?i|ax|ml|llm|gpt|chatgpt|claude|gemini|anthropic|openai|deepmind|agentic|agents?|copilot|machine\s+learning|deep\s+learning|generative|transformers?|embeddings?|fine[- ]?tun\w*|reasoning|neural|vectors?|rag|mcp|automation|prompts?|recommend\w*|personaliz\w*|ranking|inference|classif\w*|diffusion)\b/i;
// 한국어 등은 부분 문자열로 충분(경계 이슈 없음).
const KO_TERMS = [
  "인공지능", "머신러닝", "딥러닝", "에이전트", "에이전틱", "프롬프트", "생성형",
  "트랜스포머", "임베딩", "파인튜닝", "코파일럿", "추론", "뉴럴", "벡터",
  "워크플로우", "자동화", "거대언어모델", "초거대",
];

/** HTML → 플레인 텍스트(정규식). 스크립트/스타일 제거, 태그 제거, 엔티티 일부 복원. */
function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|br|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x?[0-9a-f]+;/gi, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** 추적 파라미터 제거로 sourceUrl 정규화(중복 제거 키 안정화). */
function cleanUrl(raw: string): string {
  try {
    const u = new URL(raw);
    [...u.searchParams.keys()].forEach((k) => {
      if (/^utm_|^ref$|^source$|fbclid|gclid|mc_cid|mc_eid/i.test(k)) {
        u.searchParams.delete(k);
      }
    });
    u.hash = "";
    return u.toString();
  } catch {
    return raw.trim();
  }
}

function isRelevant(text: string): boolean {
  if (LATIN_RE.test(text)) return true;
  return KO_TERMS.some((k) => text.includes(k));
}

export interface CrawlOptions {
  /** 소스별 최대 수집 건수 */
  maxPerSource?: number;
  /** 룩백 일수(이 기간 내 발행분만) */
  lookbackDays?: number;
  /** 전체 상한 */
  totalCap?: number;
  /** AI/AX 관련성 필터 적용(기본 true) */
  filterRelevance?: boolean;
  /** 발췌 RSS 의 경우 원문 URL 전문 추출(기본 true) */
  fullText?: boolean;
  /** 특정 소스만(이름) — 미지정시 전체 */
  only?: string[];
  /**
   * 소스별 조건부 GET 헤더(이전 실행에서 저장). 있으면 If-None-Match/
   * If-Modified-Since 로 보내 304(미변경)면 다운로드를 건너뜀.
   * crawler 는 DB-free — cron 이 source_state 에서 읽어 주입한다.
   */
  conditional?: Map<string, { etag?: string; lastModified?: string }>;
}

export interface SourceOutcome {
  name: string;
  fetched: number;
  kept: number;
  error?: string;
  /** 마지막 HTTP 상태(200/304). 에러면 undefined */
  status?: number;
  /** 304 — 미변경으로 다운로드 생략 */
  notModified?: boolean;
  /** 응답 ETag / Last-Modified (다음 실행 조건부 GET 용). 304 면 기존 값 에코 */
  etag?: string | null;
  lastModified?: string | null;
  /** 이 피드의 최신 항목 발행일(ISO) — stale 감지용 */
  newestItemDate?: string | null;
}

export interface CrawlResult {
  inputs: ArticleInput[];
  perSource: SourceOutcome[];
  /** 전문 추출에 성공한 항목 수 */
  fullFetched: number;
}

interface FeedFetch {
  items: FeedItem[];
  status: number;
  notModified: boolean;
  etag: string | null;
  lastModified: string | null;
}

async function fetchFeed(
  source: Source,
  cond?: { etag?: string; lastModified?: string },
): Promise<FeedFetch> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const headers: Record<string, string> = {
      "User-Agent": UA,
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
    };
    if (cond?.etag) headers["If-None-Match"] = cond.etag;
    if (cond?.lastModified) headers["If-Modified-Since"] = cond.lastModified;
    const res = await fetch(source.url, {
      headers,
      signal: ctrl.signal,
      // 조건부 GET 을 직접 다루므로 fetch 캐시는 끔.
      cache: "no-store",
    });
    // 304 — 미변경. 다운로드/파싱 생략, 기존 검증자(etag/lm)를 에코.
    if (res.status === 304) {
      return {
        items: [],
        status: 304,
        notModified: true,
        etag: cond?.etag ?? null,
        lastModified: cond?.lastModified ?? null,
      };
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const feed = await parser.parseString(xml);
    return {
      items: (feed.items ?? []) as FeedItem[],
      status: res.status,
      notModified: false,
      etag: res.headers.get("etag"),
      lastModified: res.headers.get("last-modified"),
    };
  } finally {
    clearTimeout(t);
  }
}

/**
 * 원문 URL 을 따라가 본문 전체를 추출(Readability + linkedom).
 * 발췌만 주는 RSS(긱뉴스/뉴스사이트 등) 대응 — 실패/비HTML/너무 짧으면 null.
 */
export async function fetchArticle(
  url: string,
  timeoutMs = 12000,
): Promise<{ text: string | null; image: string | null }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,*/*" },
      signal: ctrl.signal,
      cache: "no-store",
      redirect: "follow",
    });
    if (!res.ok) return { text: null, image: null };
    if (!(res.headers.get("content-type") || "").includes("html")) return { text: null, image: null };
    const html = await res.text();
    const image = ogImage(html, res.url || url);
    const { document } = parseHTML(html);
    const article = new Readability(document as unknown as Document, {
      charThreshold: 200,
    }).parse();
    const text = article?.textContent
      ? article.textContent.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim()
      : "";
    return { text: text.length > 200 ? text : null, image };
  } catch {
    return { text: null, image: null };
  } finally {
    clearTimeout(t);
  }
}

/** 본문 텍스트만(하위호환 — 재생성 스크립트 등). */
export async function fetchArticleText(
  url: string,
  timeoutMs = 12000,
): Promise<string | null> {
  return (await fetchArticle(url, timeoutMs)).text;
}

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

type Candidate = {
  s: Source;
  link: string;
  title: string;
  rssBody: string;
  rssImg: string | null;
  dateStr?: string;
};

/** 모든 소스 크롤 → ArticleInput[] (큐 입력). 발췌 RSS 는 원문 전문 추출로 보강. */
export async function crawlSources(opts: CrawlOptions = {}): Promise<CrawlResult> {
  const {
    maxPerSource = 8,
    lookbackDays = 4,
    totalCap = 60,
    filterRelevance = true,
    fullText = true,
    only,
    conditional,
  } = opts;

  const since = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;
  const sources = only?.length
    ? SOURCES.filter((s) => only.includes(s.name))
    : SOURCES;

  const perSource: CrawlResult["perSource"] = [];
  const seenUrls = new Set<string>();
  const candidates: Candidate[] = [];

  // 1) 소스 병렬 RSS fetch(개별 실패 격리) → 후보 수집(관련성 필터까지)
  //    이전 실행의 etag/last-modified 가 있으면 조건부 GET → 304 면 스킵.
  const settled = await Promise.allSettled(
    sources.map(async (s) => ({
      s,
      res: await fetchFeed(s, conditional?.get(s.name)),
    })),
  );

  for (let i = 0; i < settled.length; i++) {
    const r = settled[i];
    const s = sources[i];
    if (r.status === "rejected") {
      perSource.push({ name: s.name, fetched: 0, kept: 0, error: String(r.reason).slice(0, 120) });
      continue;
    }
    const { items, status, notModified, etag, lastModified } = r.value.res;
    // 304 — 미변경. 새 후보 없음, 검증자만 그대로 보존.
    if (notModified) {
      perSource.push({ name: s.name, fetched: 0, kept: 0, status, notModified: true, etag, lastModified });
      continue;
    }
    // 최신 항목 발행일(stale 감지) — 관련성과 무관하게 전체 항목 기준.
    let newestTs = 0;
    for (const it of items) {
      const ds = it.isoDate ?? it.pubDate;
      const ts = ds ? new Date(ds).getTime() : NaN;
      if (!Number.isNaN(ts) && ts > newestTs) newestTs = ts;
    }
    let kept = 0;
    for (const it of items) {
      if (kept >= maxPerSource || candidates.length >= totalCap) break;
      const link = it.link && cleanUrl(it.link);
      const title = (it.title ?? "").trim();
      if (!link || !title) continue;
      if (seenUrls.has(link)) continue;

      const dateStr = it.isoDate ?? it.pubDate;
      if (dateStr) {
        const ts = new Date(dateStr).getTime();
        if (!Number.isNaN(ts) && ts < since) continue;
      }

      const rawHtml =
        it["content:encoded"] || it.content || it.summary || it.contentSnippet || "";
      let body = htmlToText(rawHtml);
      if (body.length < 40) body = it.contentSnippet?.trim() || title;

      // 제목 + 리드만으로 관련성 판정(장문 본문의 우연 매칭 오탐 방지).
      if (filterRelevance && !isRelevant(`${title}\n${body.slice(0, RELEVANCE_LEAD)}`))
        continue;

      seenUrls.add(link);
      candidates.push({ s, link, title, rssBody: body, rssImg: rssImage(it), dateStr });
      kept++;
    }
    perSource.push({
      name: s.name,
      fetched: items.length,
      kept,
      status,
      etag,
      lastModified,
      newestItemDate: newestTs ? new Date(newestTs).toISOString() : null,
    });
  }

  // 2) 전문 + 이미지 보강 — RSS 본문이 짧으면(발췌) 원문 URL 따라가 전체/og:image 추출(동시성 5)
  let fullFetched = 0;
  const enriched = await mapLimit(candidates, 5, async (c) => {
    let body = c.rssBody;
    let image = c.rssImg;
    if (fullText && c.rssBody.length < FULLTEXT_THRESHOLD) {
      const got = await fetchArticle(c.link);
      if (got.text && got.text.length > c.rssBody.length) {
        body = got.text;
        fullFetched++;
      }
      if (!image && got.image) image = got.image;
    }
    return { body, image };
  });

  // 3) ArticleInput 으로 마감
  const inputs: ArticleInput[] = candidates.map((c, i) => ({
    sourceName: c.s.name,
    sourceUrl: c.link,
    originalTitle: c.title.slice(0, 300),
    rawContent: `${c.title}\n\n${enriched[i].body}`.slice(0, MAX_RAW),
    coverImageUrl: enriched[i].image ?? undefined,
    category: c.s.category,
    collectedAt: c.dateStr ?? undefined,
  }));

  return { inputs, perSource, fullFetched };
}
