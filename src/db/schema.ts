// =============================================================================
// Drizzle 스키마 (Neon Postgres) — src/lib/contract.ts 와 1:1
// Auth.js(NextAuth) 표준 테이블(user/account/session/verificationToken) +
// 커뮤니티 확장(role/bio/interests/...) + post/interaction.
// =============================================================================
import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";
import type {
  CardNews,
  FormulaBody,
  Category,
  PostType,
  AuthorType,
  InteractionType,
  Difficulty,
  ActivityType,
  ActivityStatus,
  ApplicationStatus,
  EnrichmentStatus,
} from "@/lib/contract";

// ---- Auth.js: users (+ 커뮤니티 확장 컬럼) ----
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  // --- 커뮤니티 확장 ---
  role: text("role").notNull().default(""),
  company: text("company"),
  bio: text("bio").notNull().default(""),
  interests: jsonb("interests").$type<string[]>().notNull().default([]),
  // --- 외부 링크 (선택, nullable) ---
  github: text("github"),
  homepage: text("homepage"),
  blog: text("blog"),
  // --- IA 확장 (nullable / default 보장: 기존 데이터 존재) ---
  jobRole: text("jobRole"), // 직무 (JOB_ROLES 권장), nullable
  onboarded: boolean("onboarded").notNull().default(false),
  isAgent: boolean("isAgent").notNull().default(false),
  visitCountBase: integer("visitCountBase").notNull().default(0), // 시드 baseline
  projectCount: integer("projectCount").notNull().default(0), // 프로젝트 완주(관리값)
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

// ---- Auth.js: accounts ----
export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

// ---- Auth.js: sessions (database 세션 전략) ----
export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

// ---- Auth.js: verification tokens ----
export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

// ---- 커뮤니티: posts (카드뉴스 OR Formula) ----
export const posts = pgTable(
  "post",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    postType: text("postType").$type<PostType>().notNull(),
    title: text("title").notNull(),
    oneLiner: text("oneLiner"), // 한줄요약, nullable
    category: text("category").$type<Category>().notNull(),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    // --- IA 확장 (nullable / default 보장: 기존 데이터 존재) ---
    difficulty: text("difficulty")
      .$type<Difficulty>()
      .notNull()
      .default("intermediate"),
    workType: text("workType"), // 업무유형, nullable
    verified: boolean("verified").notNull().default(false),
    authorType: text("authorType").$type<AuthorType>().notNull(),
    authorId: text("authorId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    authorName: text("authorName").notNull(),
    sourceName: text("sourceName"),
    sourceUrl: text("sourceUrl"),
    collectedAt: timestamp("collectedAt", { mode: "date" }),
    cardnews: jsonb("cardnews").$type<CardNews | null>(),
    formula: jsonb("formula").$type<FormulaBody | null>(),
    // --- 아티클↔아카이브 연결 ---
    // 아카이브(formula)가 참고한 아티클(cardnews) post.id. 자기참조 FK.
    // 아티클은 null. 참조 post 삭제 시 set null(연결만 끊고 아카이브는 유지).
    relatedArticleId: text("relatedArticleId").references(
      (): AnyPgColumn => posts.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("post_createdAt_idx").on(t.createdAt),
    index("post_author_idx").on(t.authorId),
    index("post_category_idx").on(t.category),
    index("post_relatedArticle_idx").on(t.relatedArticleId),
  ],
);

// ---- 커뮤니티: interactions (view/like/comment append 로그) ----
export const interactions = pgTable(
  "interaction",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    postId: text("postId")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<InteractionType>().notNull(),
    body: text("body"), // comment 전용
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("interaction_post_idx").on(t.postId),
    index("interaction_user_idx").on(t.userId),
    index("interaction_type_idx").on(t.type),
  ],
);

// ---- IA: bookmarks (내 저장함 / saveCount 집계) ----
export const bookmarks = pgTable(
  "bookmark",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: text("postId")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("bookmark_user_post_uq").on(t.userId, t.postId),
    index("bookmark_user_idx").on(t.userId),
    index("bookmark_post_idx").on(t.postId),
  ],
);

// ---- IA: follows (팔로우 / followerCount·followingCount 집계) ----
export const follows = pgTable(
  "follow",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    followerId: text("followerId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: text("followingId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("follow_follower_following_uq").on(t.followerId, t.followingId),
    index("follow_follower_idx").on(t.followerId),
    index("follow_following_idx").on(t.followingId),
  ],
);

// ---- IA: activities (스터디/프로젝트 모임) ----
export const activities = pgTable(
  "activity",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    type: text("type").$type<ActivityType>().notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    description: text("description").notNull().default(""),
    status: text("status")
      .$type<ActivityStatus>()
      .notNull()
      .default("recruiting"),
    ownerId: text("ownerId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ownerName: text("ownerName").notNull(),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    capacity: integer("capacity").notNull().default(0),
    season: text("season"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("activity_type_idx").on(t.type),
    index("activity_status_idx").on(t.status),
    index("activity_owner_idx").on(t.ownerId),
    index("activity_createdAt_idx").on(t.createdAt),
  ],
);

// ---- IA: applications (모임 지원) ----
export const applications = pgTable(
  "application",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    activityId: text("activityId")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userName: text("userName").notNull(),
    message: text("message").notNull().default(""),
    status: text("status")
      .$type<ApplicationStatus>()
      .notNull()
      .default("pending"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("application_activity_user_uq").on(t.activityId, t.userId),
    index("application_activity_idx").on(t.activityId),
    index("application_user_idx").on(t.userId),
  ],
);

// ---- 채팅: conversations (1:1 DM 페어) ----
// user1Id/user2Id 는 항상 정규화(작은 id 가 user1) → UNIQUE(user1,user2) 로 중복 방지.
// lastMessageAt 은 받은함 정렬 키(메시지 전송 시 갱신).
export const conversations = pgTable(
  "conversation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    user1Id: text("user1Id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    user2Id: text("user2Id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    lastMessageAt: timestamp("lastMessageAt", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("conversation_pair_uq").on(t.user1Id, t.user2Id),
    index("conversation_user1_idx").on(t.user1Id),
    index("conversation_user2_idx").on(t.user2Id),
    index("conversation_lastMessageAt_idx").on(t.lastMessageAt),
  ],
);

// ---- 채팅: messages (대화 내 메시지) ----
// readAt nullable — 수신자가 읽으면 설정(미읽음 집계 기준).
export const messages = pgTable(
  "message",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    conversationId: text("conversationId")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: text("senderId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    readAt: timestamp("readAt", { mode: "date" }), // nullable: 미읽음
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("message_conversation_idx").on(t.conversationId),
    index("message_sender_idx").on(t.senderId),
    index("message_createdAt_idx").on(t.createdAt),
  ],
);

// ---- IA: member_bookmarks (멤버 저장 / 포뮬러 하트) ----
// userId 가 memberId(유저) 를 저장. UNIQUE(userId,memberId) 로 중복 방지.
export const memberBookmarks = pgTable(
  "member_bookmark",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    memberId: text("memberId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("member_bookmark_user_member_uq").on(t.userId, t.memberId),
    index("member_bookmark_user_idx").on(t.userId),
    index("member_bookmark_member_idx").on(t.memberId),
  ],
);

// ---- 수집 큐: raw_article (크롤러 적재 → 별도 AI 서버가 enrich → post 발행) ----
// 발행 전 원문은 여기 머무름(피드의 post 와 분리). sourceUrl 멱등 dedup.
export const rawArticles = pgTable(
  "raw_article",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sourceName: text("sourceName").notNull(),
    sourceUrl: text("sourceUrl").notNull().unique(), // 중복 제거 키
    originalTitle: text("originalTitle").notNull(),
    rawContent: text("rawContent").notNull(),
    // 원문 대표 이미지(og:image / RSS media). 발행 시 cardnews.coverImageUrl 로.
    coverImageUrl: text("coverImageUrl"),
    category: text("category").$type<Category>(), // nullable
    collectedAt: timestamp("collectedAt", { mode: "date" }),
    status: text("status")
      .$type<EnrichmentStatus>()
      .notNull()
      .default("pending"),
    attempts: integer("attempts").notNull().default(0),
    error: text("error"),
    // 발행된 post.id (enriched 시 설정). post 삭제 시 링크만 끊음.
    postId: text("postId").references((): AnyPgColumn => posts.id, {
      onDelete: "set null",
    }),
    claimedAt: timestamp("claimedAt", { mode: "date" }),
    processedAt: timestamp("processedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("raw_article_status_idx").on(t.status),
    index("raw_article_createdAt_idx").on(t.createdAt),
  ],
);

// ---- 크롤 소스 상태: 조건부 GET(etag/last-modified) + 소스 헬스 추적 ----
// 크롤러는 DB-free(순수 함수)라 이 상태를 직접 읽지 않는다. cron 이 매 실행마다
// 여기서 conditional 헤더를 읽어 crawlSources 에 넘기고, 결과를 다시 적재한다.
export const crawlSourceState = pgTable("crawl_source_state", {
  name: text("name").primaryKey(), // Source.name
  url: text("url"),
  etag: text("etag"), // 다음 요청의 If-None-Match
  lastModified: text("lastModified"), // 다음 요청의 If-Modified-Since
  lastStatus: integer("lastStatus"), // 마지막 HTTP 상태(200/304/...)
  lastSuccessAt: timestamp("lastSuccessAt", { mode: "date" }),
  lastItemDate: timestamp("lastItemDate", { mode: "date" }), // 최신 항목 발행일(stale 감지)
  consecutiveFailures: integer("consecutiveFailures").notNull().default(0),
  lastError: text("lastError"),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export type DbRawArticle = typeof rawArticles.$inferSelect;
export type DbCrawlSourceState = typeof crawlSourceState.$inferSelect;
export type DbUser = typeof users.$inferSelect;
export type DbPost = typeof posts.$inferSelect;
export type DbInteraction = typeof interactions.$inferSelect;
export type DbBookmark = typeof bookmarks.$inferSelect;
export type DbFollow = typeof follows.$inferSelect;
export type DbActivity = typeof activities.$inferSelect;
export type DbApplication = typeof applications.$inferSelect;
export type DbConversation = typeof conversations.$inferSelect;
export type DbMessage = typeof messages.$inferSelect;
export type DbMemberBookmark = typeof memberBookmarks.$inferSelect;
