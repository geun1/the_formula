// =============================================================================
// 크롤링 소스 — RSS/Atom 피드 목록 (뉴스레터 · 블로그 · 긱뉴스 · AI/AX)
// =============================================================================
// 백엔드 cron(/api/cron)이 여기 피드를 매일 fetch → raw_article 큐에 적재.
// 전부 2026-06 기준 RSS 응답 확인된 살아있는 피드만 등록(죽은 피드는 crawler 가
// 조용히 skip). 소스 추가/삭제는 이 배열만 편집하면 됨.
// category 는 폴백용(최종 분류는 Gemini enrich 가 결정).
// =============================================================================
import type { Category } from "@/lib/contract";

export type SourceKind = "newsletter" | "blog" | "geeknews";

export interface Source {
  /** 표시용 출처명 (post.sourceName) */
  name: string;
  /** RSS/Atom 피드 URL */
  url: string;
  kind: SourceKind;
  /** 폴백 카테고리(Gemini 가 분류 실패 시) */
  category: Category;
}

export const SOURCES: Source[] = [
  // ── 긱뉴스 / 한국 AI 뉴스 ──────────────────────────────────────────
  { name: "GeekNews", url: "https://news.hada.io/rss/news", kind: "geeknews", category: "insight" },
  { name: "AI타임스", url: "https://www.aitimes.com/rss/allArticle.xml", kind: "geeknews", category: "ai" },

  // ── 뉴스레터 ───────────────────────────────────────────────────────
  { name: "TLDR AI", url: "https://tldr.tech/api/rss/ai", kind: "newsletter", category: "ai" },
  { name: "Import AI", url: "https://importai.substack.com/feed", kind: "newsletter", category: "insight" },
  { name: "Ahead of AI", url: "https://magazine.sebastianraschka.com/feed", kind: "newsletter", category: "ai" },
  { name: "Latent Space", url: "https://www.latent.space/feed", kind: "newsletter", category: "dev" },
  { name: "One Useful Thing", url: "https://www.oneusefulthing.org/feed", kind: "newsletter", category: "insight" },

  // ── 블로그 ─────────────────────────────────────────────────────────
  { name: "Simon Willison", url: "https://simonwillison.net/atom/everything/", kind: "blog", category: "dev" },
  { name: "Hugging Face", url: "https://huggingface.co/blog/feed.xml", kind: "blog", category: "ai" },
  { name: "OpenAI", url: "https://openai.com/news/rss.xml", kind: "blog", category: "ai" },
  { name: "Google DeepMind", url: "https://deepmind.google/blog/rss.xml", kind: "blog", category: "ai" },
  { name: "Google AI", url: "https://blog.google/technology/ai/rss/", kind: "blog", category: "ai" },
  { name: "The Gradient", url: "https://thegradient.pub/rss/", kind: "blog", category: "ai" },
  { name: "VentureBeat AI", url: "https://venturebeat.com/category/ai/feed/", kind: "blog", category: "insight" },
  { name: "TechCrunch AI", url: "https://techcrunch.com/category/artificial-intelligence/feed/", kind: "blog", category: "insight" },
  { name: "Irrational Exuberance", url: "https://lethain.com/feeds/", kind: "blog", category: "pm" },
];
