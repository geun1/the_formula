// =============================================================================
// /api/openapi.json — OpenAPI 3.1 스펙 (아티클 수집 파이프라인)
// Swagger UI: /api-docs
// =============================================================================
import { NextResponse } from "next/server";
import { CATEGORIES } from "@/lib/contract";

export const dynamic = "force-dynamic";

const PROD = "https://the-formula-silk.vercel.app";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "The Formula — 아티클 수집 파이프라인 API",
    version: "2.0.0",
    description:
      "매일 크롤링으로 수집한 외부 AI 아티클을 적재하고, **별도 AI 서버**가 카드뉴스를 생성해 발행하는 분리형 파이프라인입니다.\n\n" +
      "```\n" +
      "크롤러 ─POST /api/articles─▶ raw_article(pending) ─(webhook, 선택)─▶ AI 서버\n" +
      "                                    │                                  │\n" +
      "사이트 피드 ◀─ post(발행) ◀─PATCH /api/articles/{id}─◀──────────────────┘\n" +
      "                            (또는 GET /api/articles/pending 폴링)\n" +
      "```\n\n" +
      "1. **POST /api/articles** — 크롤러가 raw 아티클을 큐에 적재 (AI 호출 없음). `sourceUrl` 멱등 dedup.\n" +
      "2. **GET /api/articles/pending** — AI 서버가 대기 항목을 가져감(`claim=true` 시 lease).\n" +
      "3. **PATCH /api/articles/{id}** — AI 서버가 생성한 카드뉴스로 발행(또는 실패 보고).\n" +
      "4. **GET /api/articles** — 발행된 아티클 목록(공개).\n\n" +
      "머신 API(1·2·3)는 `Authorization: Bearer <INGEST_API_KEY>` 또는 `x-api-key` 헤더가 필요합니다.",
  },
  servers: [
    { url: PROD, description: "Production" },
    { url: "/", description: "Same origin" },
  ],
  tags: [
    { name: "Ingest", description: "크롤러 → 수집 큐 적재" },
    { name: "Enrichment", description: "별도 AI 서버 → 클레임/발행" },
    { name: "Public", description: "발행된 아티클 조회(공개)" },
  ],
  paths: {
    "/api/articles": {
      post: {
        tags: ["Ingest"],
        summary: "아티클 수집(큐 적재)",
        description:
          "크롤러가 수집한 raw 아티클을 큐에 적재합니다. 단건 객체, 객체 배열, `{ \"articles\": [...] }` 모두 허용(최대 50건). AI 생성은 하지 않고 `pending` 상태로 큐에 넣습니다. 같은 `sourceUrl`은 중복 적재되지 않습니다.",
        security: [{ bearerAuth: [] }, { apiKeyHeader: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                oneOf: [
                  { $ref: "#/components/schemas/ArticleInput" },
                  { type: "array", items: { $ref: "#/components/schemas/ArticleInput" } },
                  {
                    type: "object",
                    required: ["articles"],
                    properties: {
                      articles: { type: "array", items: { $ref: "#/components/schemas/ArticleInput" } },
                    },
                  },
                ],
              },
              example: {
                articles: [
                  {
                    sourceName: "Hacker News",
                    sourceUrl: "https://news.ycombinator.com/item?id=123456",
                    originalTitle: "How coding agents keep context",
                    rawContent: "Long-running coding agents retain context via summarization and external memory…",
                    collectedAt: "2026-06-22T08:00:00.000Z",
                    category: "ai",
                  },
                ],
              },
            },
          },
        },
        responses: {
          "202": {
            description: "큐 적재 결과",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/IngestResult" },
                example: {
                  ok: true,
                  received: 1,
                  queued: 1,
                  skipped: 0,
                  items: [
                    { sourceUrl: "https://news.ycombinator.com/item?id=123456", status: "queued", id: "raw_9f1c…" },
                  ],
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/Error" },
          "401": { $ref: "#/components/responses/Error" },
          "503": { $ref: "#/components/responses/Error" },
        },
      },
      get: {
        tags: ["Public"],
        summary: "발행된 아티클 목록 조회",
        description: "카드뉴스 생성이 끝나 발행된 아티클을 최신순으로 조회합니다. (공개)",
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", default: 20, minimum: 1, maximum: 100 } },
          { name: "offset", in: "query", schema: { type: "integer", default: 0, minimum: 0 } },
          { name: "category", in: "query", schema: { type: "string", enum: [...CATEGORIES] } },
        ],
        responses: {
          "200": {
            description: "아티클 목록",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ArticleListResponse" } } },
          },
        },
      },
    },
    "/api/articles/pending": {
      get: {
        tags: ["Enrichment"],
        summary: "대기 아티클 가져오기(클레임)",
        description:
          "별도 AI 서버가 가공할 `pending` 아티클을 가져옵니다. `claim=true` 면 가져온 항목을 `processing` 으로 표시(lease)해 중복 처리를 막습니다. 응답에 큐 상태 카운트(`queue`)도 포함됩니다.",
        security: [{ bearerAuth: [] }, { apiKeyHeader: [] }],
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", default: 10, minimum: 1, maximum: 50 } },
          { name: "claim", in: "query", schema: { type: "boolean", default: false }, description: "true 면 processing 으로 lease" },
        ],
        responses: {
          "200": {
            description: "대기 항목 + 큐 상태",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PendingResponse" },
                example: {
                  queue: { pending: 3, processing: 1, enriched: 12, failed: 0 },
                  claimed: true,
                  count: 1,
                  items: [
                    {
                      id: "raw_9f1c…",
                      sourceName: "Hacker News",
                      sourceUrl: "https://news.ycombinator.com/item?id=123456",
                      originalTitle: "How coding agents keep context",
                      rawContent: "Long-running coding agents…",
                      category: "ai",
                      collectedAt: "2026-06-22T08:00:00.000Z",
                      attempts: 1,
                      status: "processing",
                    },
                  ],
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Error" },
          "503": { $ref: "#/components/responses/Error" },
        },
      },
    },
    "/api/articles/{id}": {
      patch: {
        tags: ["Enrichment"],
        summary: "가공 결과 제출(발행/실패)",
        description:
          "별도 AI 서버가 생성한 카드뉴스로 아티클을 **발행**하거나 **실패**를 보고합니다. `{id}` 는 raw_article id. 발행은 멱등(이미 발행됐으면 기존 post 반환).",
        security: [{ bearerAuth: [] }, { apiKeyHeader: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "raw_article id" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                oneOf: [
                  { $ref: "#/components/schemas/PublishInput" },
                  { $ref: "#/components/schemas/FailInput" },
                ],
              },
              examples: {
                "발행(성공)": {
                  value: {
                    cardnews: {
                      summary: "긴 작업에서도 길을 잃지 않는 비결은 컨텍스트 압축과 외부 메모리예요.",
                      keywords: ["컨텍스트 압축", "외부 메모리", "에이전트 루프"],
                      body: "## 핵심 요약\n\n- 요약으로 토큰 절약\n- 결정은 파일 메모리에 영속화",
                      coverImageUrl: "",
                    },
                    category: "ai",
                  },
                },
                "실패 보고": { value: { status: "failed", error: "LLM 타임아웃" } },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "발행 완료",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PublishResult" },
                example: { ok: true, postId: "385f…", url: "/article/385f…", status: "published" },
              },
            },
          },
          "200": { description: "이미 발행됨(멱등) 또는 실패 처리됨" },
          "400": { $ref: "#/components/responses/Error" },
          "401": { $ref: "#/components/responses/Error" },
          "404": { $ref: "#/components/responses/Error" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", description: "Authorization: Bearer <INGEST_API_KEY>" },
      apiKeyHeader: { type: "apiKey", in: "header", name: "x-api-key", description: "x-api-key: <INGEST_API_KEY>" },
    },
    responses: {
      Error: {
        description: "에러",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
    },
    schemas: {
      ArticleInput: {
        type: "object",
        required: ["sourceName", "sourceUrl", "originalTitle", "rawContent"],
        properties: {
          sourceName: { type: "string", description: "출처명 (예: Hacker News)" },
          sourceUrl: { type: "string", format: "uri", description: "원문 URL — 중복 제거 키" },
          originalTitle: { type: "string", description: "원문 제목" },
          rawContent: { type: "string", description: "원문 본문(플레인 텍스트)" },
          collectedAt: { type: "string", format: "date-time", description: "수집 시각 ISO-8601 (생략 시 현재)" },
          category: { type: "string", enum: [...CATEGORIES], description: "카테고리(생략 가능)" },
        },
      },
      CardNews: {
        type: "object",
        required: ["summary", "body"],
        properties: {
          summary: { type: "string", description: "2~3문장 요약" },
          keywords: { type: "array", items: { type: "string" }, description: "3~5개 키워드" },
          body: { type: "string", description: "마크다운 본문" },
          coverImageUrl: { type: "string", default: "", description: "비우면 브랜드 그라데이션" },
        },
      },
      PublishInput: {
        type: "object",
        required: ["cardnews"],
        properties: {
          cardnews: { $ref: "#/components/schemas/CardNews" },
          category: { type: "string", enum: [...CATEGORIES] },
          tags: { type: "array", items: { type: "string" } },
        },
      },
      FailInput: {
        type: "object",
        required: ["status"],
        properties: {
          status: { type: "string", enum: ["failed"] },
          error: { type: "string" },
        },
      },
      IngestItemResult: {
        type: "object",
        properties: {
          sourceUrl: { type: "string" },
          status: { type: "string", enum: ["queued", "skipped"] },
          id: { type: "string" },
        },
      },
      IngestResult: {
        type: "object",
        properties: {
          ok: { type: "boolean" },
          received: { type: "integer" },
          queued: { type: "integer", description: "신규 큐 적재 건수" },
          skipped: { type: "integer", description: "중복으로 건너뛴 건수" },
          items: { type: "array", items: { $ref: "#/components/schemas/IngestItemResult" } },
        },
      },
      QueueStats: {
        type: "object",
        properties: {
          pending: { type: "integer" },
          processing: { type: "integer" },
          enriched: { type: "integer" },
          failed: { type: "integer" },
        },
      },
      PendingArticle: {
        type: "object",
        properties: {
          id: { type: "string", description: "raw_article id" },
          sourceName: { type: "string" },
          sourceUrl: { type: "string" },
          originalTitle: { type: "string" },
          rawContent: { type: "string" },
          category: { type: "string", nullable: true },
          collectedAt: { type: "string", format: "date-time", nullable: true },
          attempts: { type: "integer" },
          status: { type: "string", enum: ["pending", "processing", "enriched", "failed"] },
        },
      },
      PendingResponse: {
        type: "object",
        properties: {
          queue: { $ref: "#/components/schemas/QueueStats" },
          claimed: { type: "boolean" },
          count: { type: "integer" },
          items: { type: "array", items: { $ref: "#/components/schemas/PendingArticle" } },
        },
      },
      PublishResult: {
        type: "object",
        properties: {
          ok: { type: "boolean" },
          postId: { type: "string" },
          url: { type: "string", description: "앱 내 상세 경로" },
          status: { type: "string", enum: ["published", "already_published"] },
        },
      },
      ArticleDTO: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          summary: { type: "string" },
          keywords: { type: "array", items: { type: "string" } },
          category: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          sourceName: { type: "string", nullable: true },
          sourceUrl: { type: "string", nullable: true },
          collectedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          url: { type: "string" },
          likeCount: { type: "integer" },
          commentCount: { type: "integer" },
          saveCount: { type: "integer" },
        },
      },
      ArticleListResponse: {
        type: "object",
        properties: {
          total: { type: "integer" },
          items: { type: "array", items: { $ref: "#/components/schemas/ArticleDTO" } },
        },
      },
      Error: { type: "object", properties: { error: { type: "string" } } },
    },
  },
} as const;

export function GET() {
  return NextResponse.json(spec);
}
