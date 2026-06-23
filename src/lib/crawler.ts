// =============================================================================
// RSS 크롤러 — 소스 피드 fetch → ArticleInput[] (raw_article 큐 입력)
// =============================================================================
// 서버리스 친화: jsdom/readability 없이 fetch + rss-parser + 정규식 HTML 제거.
// - 소스별 최근 N건, 룩백 일수 내, AI/AX 관련성 필터.
// - 피드 단위 try/catch — 하나 죽어도 전체는 진행(에러 수집).
// - 멱등은 ingestArticles(sourceUrl unique)가 담당하므로 여기선 dedup만 가볍게.
// =============================================================================
import Parser from "rss-parser";
import { SOURCES, type Source } from "@/lib/sources";
import type { ArticleInput } from "@/lib/ingest";

const UA = "Mozilla/5.0 (compatible; TheFormulaBot/1.0; +https://the-formula-silk.vercel.app)";

type FeedItem = {
  title?: string;
  link?: string;
  isoDate?: string;
  pubDate?: string;
  content?: string;
  contentSnippet?: string;
  "content:encoded"?: string;
  summary?: string;
};

const parser: Parser<unknown, FeedItem> = new Parser({
  timeout: 15000,
  headers: { "User-Agent": UA },
  customFields: {
    item: ["content:encoded", "content", "contentSnippet", "summary"],
  },
});

// AI/AX 관련성 판정. 짧은 영어 약어(ai/ax/llm…)는 **단어 경계**로 매칭해야
// email/again/available 같은 단어에 오탐하지 않음. 한국어/긴 영어는 substring.
// ASCII 약어 경계 매칭(\b 는 ASCII 토큰에 정확).
const LATIN_RE =
  /\b(a\.?i|ax|llm|gpt|chatgpt|claude|gemini|anthropic|openai|deepmind|agentic|agents?|copilot|machine\s+learning|deep\s+learning|generative|transformers?|embeddings?|fine[- ]?tun\w*|reasoning|neural|vectors?|rag|mcp|automation|prompts?)\b/i;
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
  /** 특정 소스만(이름) — 미지정시 전체 */
  only?: string[];
}

export interface CrawlResult {
  inputs: ArticleInput[];
  perSource: { name: string; fetched: number; kept: number; error?: string }[];
}

async function fetchFeed(source: Source): Promise<FeedItem[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(source.url, {
      headers: { "User-Agent": UA, Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" },
      signal: ctrl.signal,
      // 캐시 무력화 — 매번 최신
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const feed = await parser.parseString(xml);
    return (feed.items ?? []) as FeedItem[];
  } finally {
    clearTimeout(t);
  }
}

/** 모든 소스 크롤 → ArticleInput[] (큐 입력). */
export async function crawlSources(opts: CrawlOptions = {}): Promise<CrawlResult> {
  const {
    maxPerSource = 8,
    lookbackDays = 4,
    totalCap = 60,
    filterRelevance = true,
    only,
  } = opts;

  const since = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;
  const sources = only?.length
    ? SOURCES.filter((s) => only.includes(s.name))
    : SOURCES;

  const perSource: CrawlResult["perSource"] = [];
  const inputs: ArticleInput[] = [];
  const seenUrls = new Set<string>();

  // 소스 병렬 fetch(개별 실패 격리)
  const settled = await Promise.allSettled(
    sources.map(async (s) => ({ s, items: await fetchFeed(s) })),
  );

  for (let i = 0; i < settled.length; i++) {
    const r = settled[i];
    const s = sources[i];
    if (r.status === "rejected") {
      perSource.push({ name: s.name, fetched: 0, kept: 0, error: String(r.reason).slice(0, 120) });
      continue;
    }
    const items = r.value.items;
    let kept = 0;
    for (const it of items) {
      if (kept >= maxPerSource || inputs.length >= totalCap) break;
      const link = it.link && cleanUrl(it.link);
      const title = (it.title ?? "").trim();
      if (!link || !title) continue;
      if (seenUrls.has(link)) continue;

      // 룩백 필터(날짜 없으면 통과 — 일부 피드는 날짜 누락)
      const dateStr = it.isoDate ?? it.pubDate;
      if (dateStr) {
        const ts = new Date(dateStr).getTime();
        if (!Number.isNaN(ts) && ts < since) continue;
      }

      const rawHtml =
        it["content:encoded"] || it.content || it.summary || it.contentSnippet || "";
      let body = htmlToText(rawHtml);
      if (body.length < 40) body = it.contentSnippet?.trim() || title;
      // 원문 충실 재구성을 위해 본문을 넉넉히 보존(전문 RSS 대비).
      const rawContent = `${title}\n\n${body}`.slice(0, 16000);

      if (filterRelevance && !isRelevant(`${title} ${body}`)) continue;

      seenUrls.add(link);
      inputs.push({
        sourceName: s.name,
        sourceUrl: link,
        originalTitle: title.slice(0, 300),
        rawContent,
        category: s.category,
        collectedAt: dateStr ?? undefined,
      });
      kept++;
    }
    perSource.push({ name: s.name, fetched: items.length, kept });
  }

  return { inputs, perSource };
}
