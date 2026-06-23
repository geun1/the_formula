// =============================================================================
// 카드뉴스 생성 — AI SDK v6 generateObject + Google Gemini (gemini-3.5-flash)
// =============================================================================
// - 텍스트(summary/keywords/body/category)만 AI 생성. 커버 이미지는 생성하지 않음
//   (coverImageUrl = "" → UI 가 결정론적 브랜드 그라데이션으로 렌더).
// - @ai-sdk/google 가 GOOGLE_GENERATIVE_AI_API_KEY 로 직접 인증(게이트웨이 불필요).
// - 호출 실패 시 결정론적 폴백으로 graceful degrade.
// =============================================================================
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import type { CardNews, Category } from "@/lib/contract";
import { CATEGORIES, categories } from "@/lib/contract";

/** 기본 모델 — Gemini 3.5 Flash. 환경변수 CARDNEWS_MODEL 로 오버라이드 가능. */
const CARDNEWS_MODEL = process.env.CARDNEWS_MODEL ?? "gemini-3.5-flash";

// AI 가 채울 텍스트 + 분류 스키마 (coverImageUrl 제외)
const cardNewsTextSchema = z.object({
  summary: z
    .string()
    .min(20)
    .max(400)
    .describe("2~3문장 한국어 요약(피드 카드용 티저). 해요체. 핵심 인사이트 위주."),
  keywords: z
    .array(z.string().min(1).max(20))
    .min(3)
    .max(5)
    .describe("3~5개 핵심 키워드(한국어 권장)."),
  body: z
    .string()
    .min(80)
    .describe(
      "원문을 한국어로 **충실히 재구성한 본문**. 단순 2~3문장 요약 금지. " +
        "원문의 구조(소제목·순서)를 유지하고 구체적 수치·예시·인용·고유명사를 보존하세요. " +
        "원문이 길면 원문 분량에 맞춰 충분히 길게(여러 섹션). **읽기 좋게** 구조화하세요:\n" +
        "- '## 소제목'으로 구획, 핵심은 **굵게**, 나열은 불릿(-), 인용은 '> ', 코드는 ```fenced```.\n" +
        "- **여러 항목을 비교/정리할 땐 마크다운 표**를 적극 사용: `| 항목 | 값 |` 헤더 + `| --- | --- |` 구분행 + 데이터행.\n" +
        "- **수치 비교(성능·점유율·증감 등 2~6개 항목)가 있으면 차트**를 넣으세요. 코드펜스 ```chart 안에 JSON 한 줄: " +
        '```chart\\n{"title":"제목","unit":"%","data":[{"label":"A","value":88},{"label":"B","value":91}]}\\n``` ' +
        "(value 는 숫자만). 원문에 수치가 없으면 차트를 만들지 마세요.\n" +
        "표·차트는 맥락에 맞을 때만 — 억지로 넣지 말 것. 해요체. 발췌만 있으면 있는 내용만 충실히 정리(없는 내용 창작 금지).",
    ),
  category: z
    .enum(CATEGORIES)
    .describe(
      "다음 중 하나로 분류: dev(개발), design(디자인), pm(기획/PM), " +
        "marketing(마케팅), data(데이터), ai(AI 모델·연구·도구), insight(산업·인사이트).",
    ),
});

export type CardNewsText = z.infer<typeof cardNewsTextSchema>;

export interface GenerateCardNewsInput {
  originalTitle: string;
  rawContent: string;
  sourceName?: string;
  /** 폴백 카테고리(AI 분류 실패 시) */
  fallbackCategory?: Category;
  /** 모델 오버라이드(Gemini 모델 ID). */
  model?: string;
}

export interface Enrichment {
  cardnews: CardNews;
  category: Category;
  tags: string[];
}

const CATEGORY_GUIDE = CATEGORIES.map(
  (c) => `${c}=${categories[c].label}`,
).join(", ");

/**
 * rawContent → 카드뉴스(summary/keywords/body) + 카테고리 분류.
 * AI 호출 실패 시 결정론적 폴백.
 */
export async function enrichArticle(
  input: GenerateCardNewsInput,
): Promise<Enrichment> {
  const {
    originalTitle,
    rawContent,
    sourceName,
    fallbackCategory = "ai",
    model = CARDNEWS_MODEL,
  } = input;

  try {
    const { object } = await generateObject({
      model: google(model),
      schema: cardNewsTextSchema,
      // 본문이 길어 출력이 잘리지 않도록 충분히 크게(표·차트 포함).
      maxOutputTokens: 16384,
      system:
        "당신은 해외/국내 AI·AX 아티클을 한국 실무자용으로 옮기는 AI 에디터입니다. " +
        "요약가가 아니라 **번역·재구성 에디터**입니다 — 원문의 내용을 압축해 버리지 말고, " +
        "원문이 담은 핵심 정보·맥락·수치·예시를 거의 빠짐없이 한국어로 충실히 옮깁니다. " +
        "다만 자연스러운 한국어 해요체로 읽기 좋게 다듬고, 소제목으로 구조화합니다. " +
        `카테고리는 다음 중 하나로 정확히 분류하세요: ${CATEGORY_GUIDE}.`,
      prompt:
        `다음 아티클을 한국어로 충실히 재구성해줘(요약 아님 — 원문 내용을 거의 유지). ` +
        `summary 는 짧은 티저, body 는 원문 분량에 맞춰 충분히 길고 자세하게.\n\n` +
        `제목: ${originalTitle}\n` +
        (sourceName ? `출처: ${sourceName}\n` : "") +
        `\n본문:\n${rawContent.slice(0, 30000)}`,
    });

    return {
      cardnews: {
        summary: object.summary,
        keywords: object.keywords,
        body: object.body,
        coverImageUrl: "",
      },
      category: object.category,
      tags: object.keywords.slice(0, 5),
    };
  } catch (err) {
    console.warn(
      "[cardnews] Gemini 생성 실패, 폴백 사용:",
      err instanceof Error ? err.message : err,
    );
    const cardnews = fallbackCardNews(input);
    return {
      cardnews,
      category: fallbackCategory,
      tags: cardnews.keywords.slice(0, 5),
    };
  }
}

/** 하위호환 — CardNews 만 필요할 때. */
export async function generateCardNews(
  input: GenerateCardNewsInput,
): Promise<CardNews> {
  return (await enrichArticle(input)).cardnews;
}

/** 결정론적 폴백(AI 없이도 적재 가능하게). */
export function fallbackCardNews(input: GenerateCardNewsInput): CardNews {
  const { originalTitle, rawContent, sourceName } = input;
  const firstSentences = rawContent.replace(/\s+/g, " ").trim().slice(0, 240);
  const keywords = deriveKeywords(`${originalTitle} ${rawContent}`);
  return {
    summary:
      firstSentences || `${originalTitle} 에 대한 핵심을 정리한 카드뉴스예요.`,
    keywords,
    body:
      `## 핵심 요약\n\n${firstSentences}\n\n` +
      (sourceName ? `> 출처: ${sourceName}\n` : ""),
    coverImageUrl: "",
  };
}

/** 아주 단순한 키워드 추출(폴백 전용). 길이순 상위 토큰 3~5개. */
function deriveKeywords(text: string): string[] {
  const tokens = text
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
  const seen = new Set<string>();
  const uniq: string[] = [];
  for (const t of tokens.sort((a, b) => b.length - a.length)) {
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(t);
    if (uniq.length >= 5) break;
  }
  return uniq.length >= 3 ? uniq : ["AX", "AI", "워크플로우"];
}
