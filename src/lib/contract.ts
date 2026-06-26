// =============================================================================
// The Formula — 데이터 계약 (Day1 FREEZE)
// =============================================================================
// 이 파일은 전 팀(근일·민성·희·가희)의 단일 진실 소스입니다.
// 필드명/타입 변경은 전원 합의 후에만. 모든 timestamp = ISO-8601, id = 안정 문자열.
// 등급 산정 계수·함수는 신뢰 루프 소유자(가희)의 튜닝 파일 src/lib/trust.ts 참조.
// =============================================================================

// ---- 공통 enum ----
export const CATEGORIES = ["dev", "design", "pm", "marketing", "data", "ai", "insight"] as const;
export type Category = (typeof CATEGORIES)[number];

export type AuthorType = "agent" | "user"; // agent = 크롤러+카드뉴스(민성→희), user = 사람
export type PostType = "cardnews" | "formula";
export type InteractionType = "view" | "like" | "comment";
export type Tier = "sprout" | "contributor" | "activist" | "builder" | "master";

// ---- IA 확장 enum (DataModel 단계 동결) ----
/** 공식 난이도 */
export const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** 모임 종류 */
export const ACTIVITY_TYPES = ["study", "project"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** 모임 진행 상태 */
export const ACTIVITY_STATUSES = ["recruiting", "ongoing", "done"] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

/** 지원 상태 */
export const APPLICATION_STATUSES = ["pending", "accepted", "rejected"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** 아티클 수집 큐 상태 (별도 AI 서버가 enrich) */
export const ENRICHMENT_STATUSES = [
  "pending", // 수집됨, AI 가공 대기
  "processing", // AI 서버가 클레임(처리 중)
  "enriched", // 카드뉴스 생성 완료 → post 발행됨
  "failed", // 가공 실패
] as const;
export type EnrichmentStatus = (typeof ENRICHMENT_STATUSES)[number];

/** 직무(온보딩·멤버 필터 기준). 자유 문자열도 허용하되 표준 목록을 권장 */
export const JOB_ROLES = [
  "개발",
  "디자인",
  "PM",
  "마케팅",
  "데이터",
  "기획",
  "AI/ML",
  "기타",
] as const;
export type JobRole = (typeof JOB_ROLES)[number];

// ---- Post 본문 블록 ----
export interface CardNews {
  /** 2~3줄 요약 (피드 카드 + 상세 상단). DoD#2 — 희가 채움 */
  summary: string;
  /** 3~5개 키워드 칩 */
  keywords: string[];
  /** 카드뉴스 본문 (마크다운 허용) */
  body: string;
  /** 커버 비주얼. 결정론적 브랜드 그라데이션/OG로 시작, 실에셋은 URL 교체만 */
  coverImageUrl: string;
}

export interface FormulaBody {
  /** 문제 상황 */
  problem: string;
  /** 가설 */
  hypothesis: string;
  /** 사용한 도구 */
  tools: string[];
  /** 복사 가능한 프롬프트 자산 (선택) */
  prompt?: string;
  /** AI 적용 과정 */
  process: string;
  /** 전후 결과 */
  result: string;
  /** "3주 → 4일" 형태의 절감 효과 */
  timeSaved: string;
}

// ---- 핵심 엔티티 (DB: src/db/schema.ts 와 1:1) ----
export interface Post {
  id: string;
  postType: PostType;
  title: string;
  /** 한줄요약 (피드 카드·상세 상단). null 허용 */
  oneLiner: string | null;
  category: Category;
  tags: string[];
  /** 공식 난이도 (default 'intermediate') */
  difficulty: Difficulty;
  /** 업무유형 (예: '코드'/'문서'/'분석'/'기획'/'디자인'/'마케팅'). null 허용 */
  workType: string | null;
  /** 검증됨 뱃지 (default false) */
  verified: boolean;
  authorType: AuthorType;
  authorId: string;
  authorName: string; // 비정규화 스냅샷
  sourceName: string | null;
  sourceUrl: string | null;
  collectedAt: string | null; // 출처 수집 시각 (DoD#1·#4)
  cardnews: CardNews | null; // postType==='cardnews' 면 필수
  formula: FormulaBody | null; // postType==='formula' 면 필수
  /** 아카이브(formula)가 참고한 아티클(cardnews) post.id. 아티클은 null. */
  relatedArticleId?: string | null;
  // 파생 카운트 — DB에서 SQL 집계로 read-time 계산 (캐시 아님)
  likeCount: number;
  commentCount: number;
  viewCount: number;
  createdAt: string; // 피드 정렬 키 (desc)
}

export interface ActivityStats {
  visitCount: number; // visitCountBase + 본인이 만든 view 이벤트 수
  commentCount: number; // 본인이 작성한 댓글 수
  formulaCount: number; // 본인이 작성한 글(Formula) 수
  likesReceived: number; // 본인 글이 받은 좋아요 수
  projectCount: number; // 프로젝트 완주 (시드/관리값)
  // --- 신뢰 모델 확장 신호 (optional, 없으면 0/false 취급) ---
  verifiedFormulaCount?: number; // ✓검증된 공식 수
  articleFormulaCount?: number; // 아티클 참고해 만든 공식(relatedArticleId)
  completedActivityCount?: number; // 모임/스터디 완주(파생). 없으면 projectCount 대체
  appliedActivityCount?: number;  // 모임 지원 횟수(상태 무관)
  createdActivityCount?: number;  // 모임 개설 횟수
  followingCount?: number;        // 팔로잉 수
  savesReceived?: number; // 내 공식이 저장(북마크)된 수
  memberSaves?: number; // 멤버 하트(나를 저장)한 사람 수
  followerCount?: number; // 팔로워 수
  commentsReceived?: number; // 내 공식이 받은 댓글 수
  onboarded?: boolean; // 온보딩 완료
  hasCompany?: boolean; // 소속 기입
  externalLinkCount?: number; // 외부 링크 연결 수
}

export interface User {
  id: string;
  name: string;
  email: string | null;
  image: string | null; // Auth.js 아바타
  role: string;
  company: string | null;
  bio: string;
  interests: string[];
  /** 외부 링크 (선택, null 허용) */
  github: string | null;
  homepage: string | null;
  blog: string | null;
  /** 직무 (온보딩에서 선택, JOB_ROLES 권장). null 허용 */
  jobRole: string | null;
  /** 온보딩 완료 플래그 (default false) */
  onboarded: boolean;
  isAgent: boolean;
  authoredPostIds: string[];
  // 신뢰 루프 — read-time 파생
  activityStats: ActivityStats;
  trustScore: number; // 36.5 ~ 99
  tier: Tier;
  badgeLabel: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  body: string;
  authorName: string;
  authorImage: string | null;
  authorTier: Tier;
  createdAt: string;
}

export interface Interaction {
  id: string;
  postId: string;
  userId: string;
  type: InteractionType;
  body: string | null; // comment 전용
  createdAt: string;
}

// ---- IA 확장 엔티티 (DB: src/db/schema.ts 와 1:1) ----
export interface Bookmark {
  id: string;
  userId: string;
  postId: string;
  createdAt: string;
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  summary: string;
  description: string;
  status: ActivityStatus; // default 'recruiting'
  ownerId: string;
  ownerName: string; // 비정규화 스냅샷
  tags: string[];
  capacity: number;
  season: string | null;
  createdAt: string;
  // 파생 카운트 — read-time SQL 집계
  applicantCount?: number;
}

export interface Application {
  id: string;
  activityId: string;
  userId: string;
  userName: string; // 비정규화 스냅샷
  message: string;
  status: ApplicationStatus; // default 'pending'
  createdAt: string;
}

// ---- 채팅 / 1:1 DM (DB: conversation/message 와 1:1) ----
export interface Conversation {
  id: string;
  /** 정규화 페어(작은 id) */
  user1Id: string;
  /** 정규화 페어(큰 id) */
  user2Id: string;
  createdAt: string;
  lastMessageAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  /** 수신자가 읽은 시각. null = 미읽음 */
  readAt: string | null;
  createdAt: string;
}

/** 받은함(inbox) 한 줄 — 상대 + 마지막 메시지 + 미읽음수. */
export interface ConversationSummary {
  id: string;
  /** 뷰어 기준 상대방 */
  partner: {
    id: string;
    name: string;
    image: string | null;
    role: string;
  };
  lastMessageBody: string | null;
  lastMessageAt: string;
  /** 뷰어가 아직 읽지 않은 메시지 수 */
  unreadCount: number;
}

// ---- 멤버 저장(bookmark member) (DB: member_bookmark 와 1:1) ----
export interface MemberBookmark {
  id: string;
  userId: string;
  memberId: string;
  createdAt: string;
}

// ---- 통합지점 계약: 크롤러(민성) → 적재(근일) ----
export interface IngestPostInput {
  sourceName: string;
  sourceUrl: string;
  originalTitle: string;
  rawContent: string;
  collectedAt: string; // ISO-8601
  category?: Category;
  /** 희가 ingest 시 포함 OR 비우고 나중에 PATCH enrich (근일이 AI 생성) */
  cardnews?: CardNews;
}

// ---- 카테고리 색상 맵 (formulas.ts 계승 + ai/insight 추가) ----
export const categories: Record<Category, { label: string; color: string }> = {
  dev: { label: "개발", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  design: { label: "디자인", color: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
  pm: { label: "PM", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  marketing: { label: "마케팅", color: "bg-green-500/10 text-green-400 border-green-500/20" },
  data: { label: "데이터", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  ai: { label: "AI", color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  insight: { label: "인사이트", color: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
};

export function isCategory(v: unknown): v is Category {
  return typeof v === "string" && (CATEGORIES as readonly string[]).includes(v);
}

/** agent(크롤러/카드뉴스) 글의 작성자 — 시드 유저로 존재 */
export const AGENT_CURATOR_ID = "agent-curator";
