# The Formula — 1주 MVP 기획 문서

> 근일 담당: 데이터 계약 + 백엔드 3종 API + 모바일 3화면 (전체 파이프라인 통합 허브)
> 작성: 2026-06-21 · PRD + 코드베이스 분석 + Next 16 문서 검증 + 벤치마크 + 적대적 검증을 합성한 단일 기획서
> 사용자(근일)가 결정할 전략 사항은 §10 「열린 의사결정」, 검증이 잡은 필수 수정은 §11 「검증 반영」 참조.

---

## 0. 확정 결정 (v2 · 2026-06-21 사용자 승인)

> §10의 열린 결정이 모두 확정됨. **워크플로우 권고보다 스코프가 큰 "제대로 짓는" 경로**를 선택 — 1주 데모를 넘어 실제 제품 토대를 구축. 검증(§11)의 일정 슬립 경고가 더 커지므로, P0(피드/상세/프로필+로그인+DB+AI생성)에 집중하고 작성 에디터·복잡 인터랙션은 후순위 유지.

| # | 결정 | 확정값 | 영향 |
|---|---|---|---|
| D1+피드위치 | 방향 | **extend, 단 피드를 루트(`/`)로 / 기존 스터디 홈은 `/study`로 이동** | 기존 archive·members·curriculum·apply는 `/study` 영역으로 보존. 공개 커뮤니티(신규)는 루트. 두 시스템 분리 → **6인 union 버그는 /study/archive 내부에만 갇혀 무해화**(신규 유저는 DB+Auth 경로) |
| D4 | 스토리지 | **Neon Postgres (Vercel Marketplace) + Drizzle ORM** | 신규 Post/User/Interaction/Comment는 **Neon 테이블**. 기존 archive PDF·members 사진은 **Blob 그대로 유지**(이원). 등급/카운트 집계는 **SQL**(원자적·정확) → §11 "append=race-immune 거짓"·"카운트 드리프트" **DB로 근본 해결** |
| D-auth | 인증 | **실제 로그인 — Auth.js v5 (NextAuth) + @auth/drizzle-adapter + OAuth(GitHub+Google)** | 좋아요/댓글 쓰기 = 로그인 유저. DoD#5 활동기반 등급이 **진짜** 동작. `/profile/me` = 세션 유저. 세션은 DB 전략 |
| D2 | 카드뉴스 | **근일이 AI SDK(v6) + Vercel AI Gateway로 텍스트(summary/keywords/body) 생성** + **브랜드 그라데이션/OG 커버(결정론적, 이미지생성 없음)** | `src/lib/cardnews.ts`의 `generateObject(zod schema)`. AI Gateway는 `"provider/model"` 문자열. 커버는 키워드/카테고리 기반 SVG/OG 비주얼(비용·지연 0) |
| D3 | 자동수집 | **데모용 수동 트리거(정직 표기)** | 관리자 전용 "수집 실행" 액션 + `npm run ingest` 스크립트가 크롤러(민성, 초기 목업/HackerNews) → AI 카드뉴스 생성(근일) → DB 적재. UI에 '수동 수집'으로 명시. 크론 없음 |

### 0-1. 확정 기술 스택
- **런타임**: Next.js 16.2.3 (App Router) · React 19.2.4 · Tailwind v4 · TypeScript
- **DB/ORM**: Neon Postgres + Drizzle ORM + drizzle-kit(마이그레이션). 드라이버 `@neondatabase/serverless`(drizzle neon-http)
- **인증**: Auth.js v5(`next-auth@beta`) + `@auth/drizzle-adapter` · GitHub/Google OAuth · DB 세션
- **AI**: AI SDK v6(`ai`) + Vercel AI Gateway(`provider/model`) + `zod`(generateObject 스키마)
- **레거시 보존(Blob)**: archive PDF, members 사진 업로드는 `@vercel/blob` 유지

### 0-2. 당신(근일)이 해야 할 프로비저닝 (시크릿 — 코드와 병렬 가능)
> 아래는 대시보드/CLI 액션이라 내가 대신 못 함. 코드 파운데이션(스키마·구조·UI)은 시크릿 없이 먼저 짓고, 아래가 준비되면 `vercel env pull`로 연결 후 마이그레이션·실행.
1. **Neon DB**: Vercel 대시보드 → Storage → Neon 추가(또는 `vercel`). `DATABASE_URL` 발급 → `vercel env pull .env.local`.
2. **OAuth 앱**: GitHub OAuth App + Google OAuth Client 생성 → `AUTH_GITHUB_ID/SECRET`, `AUTH_GOOGLE_ID/SECRET`. 콜백 `…/api/auth/callback/{github,google}`.
3. **AUTH_SECRET**: `! npx auth secret` (자동으로 .env에 기록).
4. **AI Gateway**: Vercel 프로젝트 연결 시 OIDC 자동, 로컬은 `AI_GATEWAY_API_KEY` 발급.
> 진행 시 각 단계를 `! <command>`로 안내하겠습니다.

### 0-3. 갱신된 빌드 순서 (이 결정 반영)
1. **파운데이션**(시크릿 불필요): 의존성 설치 → `src/lib/contract.ts`(타입·enum·trust) → `src/db/schema.ts`(Drizzle) → `drizzle.config.ts` → `src/db/index.ts` → 폴더 구조.
2. **인증 스캐폴드**: `auth.ts`(Auth.js) + `/api/auth/[...nextauth]` + 미들웨어 + 로그인 UI.
3. **IA 이동**: 기존 `/`(스터디 홈) → `/study`로, 루트는 피드.
4. **DB API 3종**: posts(list/ingest/detail) · users(profile+등급 SQL집계) · interactions(좋아요/댓글 INSERT).
5. **AI 카드뉴스**: `src/lib/cardnews.ts` + 수동 수집 트리거.
6. **3화면**: 피드(`/`) · 상세(`/post/[id]`) · 프로필(`/profile/[id]`) + 시드.
7. **통합·QA·시드검증 게이트**(§11) → 데모.

---

## 1. 배경 및 방향 전환 요약 (현 상태 → 새 방향)

### 1-1. 현 상태 (이미 구현됨)
- **정체성**: 6인 비공개 AX 스터디 그룹 사이트 (송근일·고민성·김희·이가희·유민혁·신은지).
- **스택**: Next.js 16.2.3 (App Router) · React 19.2.4 · Tailwind v4 · `@vercel/blob` 2.3.3. **DB 없음, 인증 없음**. `next.config.ts`에 `cacheComponents` 플래그 없음(= 이전 캐싱 모델).
- **기존 페이지**: `/`(정적 Hero), `/archive`(5주×6명 PDF 드릴다운), `/members`(Blob `registry.json` 단일 소스), `/curriculum`(정적), `/apply`(구글폼 모집).
- **고아(orphan) 자산** — 어떤 화면에도 연결 안 됐지만 실은 **PRD 스키마를 미리 써둔 것**:
  - `src/data/formulas.ts`: `Formula{problem,hypothesis,tools[],process,result,timeSaved,tags[]}` → PRD `[문제→AI적용→프롬프트/도구→전후결과]`와 1:1 일치.
  - `src/data/members.ts`: `Member{...,formulaId?,cohort,avatar}` → User 모델의 원형.
- **디자인 토큰**(globals.css): `--accent #6d28d9`(라이트)/`#a78bfa`(다크), `.gradient-text`, `.glow`, `fade-up`, Geist Sans/Mono, 라이트/다크 토글 = 토스 테크블로그 톤의 완성된 시각 언어.

### 1-2. 새 방향 (PRD)
**공개 AX 실전 활용 커뮤니티**. 모든 지식·경험의 기본 단위 = **Formula**. 비공개 6인 → 직군 무관 개방형 전환.

### 1-3. 전환의 핵심 (orphan 부활 = 신규 설계 0)
> 두 orphan 파일은 죽은 코드가 아니라 **미리 써둔 계약**. "재설계"가 아니라 **"승격 + 영속화"**.
- `formulas.ts Formula` → 통합 `Post` 타입으로 승격(`postType`, `authorId`, `createdAt`, `cardnews` 추가).
- `members.ts Member` + `member-storage.ts MemberRecord` → 단일 `User` 타입 병합 + 신뢰루프 필드(`trustScore`, `tier`, `activityStats`).
- `Interaction`(append 이벤트 로그)만 신규.

### 1-4. 반드시 제거할 것 (개방형과 충돌)
- `src/lib/archive-shared.ts`의 **6명 하드코딩 union + `SLUG_BY_MEMBER`** — write-validation에 load-bearing이라 신규 유저를 설계상 거부. **패치가 아니라 삭제**.
- `cohort`/`week` 시간축 → 연속 피드의 `createdAt`로 대체.
- PDF=지식단위 모델, 구글폼 모집 게이트("낮은 참여 문턱"과 상충).

---

## 2. 제품 정의 (Formula 중심 · 3루프)

### 2-1. 비전
Formula = 커뮤니티 내 모든 지식·경험이 축적되는 기본 단위. 단순 게시글이 아니라 **작성자 이력이 연결되는 지식 자산**이며 프로필에 누적.

### 2-2. 해결할 문제
AI 정보는 넘치지만 (1) 실제 업무 적용법을 알기 어렵고 (2) 믿을 사람을 찾기 어렵고 (3) 함께 성장할 커뮤니티가 없다.

### 2-3. 3루프와 MVP 경계
| 루프 | 벤치마크 | MVP 포함 | MVP 제외/축소 |
|---|---|---|---|
| **콘텐츠 (Curation & Asset)** | 파이토치KR, 지피터스 | 해외 소스 1곳 자동수집(민성) → AI 카드뉴스 생성(희) → 카드 피드+상세+원문링크(근일) | 다중 소스, 작성 에디터(시드 대체), 검색·복제 UI(스키마만) |
| **신뢰 (Trust & Networking)** | 데보션·노트폴리오·당근 매너온도 | 이력서 없는 프로필, 활동 기반 등급 뱃지 산정·표시 | 정밀 기여도, 실시간 decay, 팔로우/DM |
| **UX/UI** | 토스 테크블로그·벨로그 | 넓은 여백·강한 타이포(보라 토큰), 모바일 3화면, 좋아요/댓글 **표시** | 벨로그식 에디터, 좋아요/댓글 **쓰기**(stretch) |

### 2-4. 1주 MVP 단일 사이클
`[해외 트렌드 자동공급 → AI 카드뉴스 가공 → 유저 소비 → 신뢰 프로필 축적]`
**실행 원칙**: "Day 1에 계약(JSON 스키마+목업 fixture) 동결 → 끝까지 독립 병렬 → 늦게 통합."

---

## 3. 정보설계 (사이트맵 · 네비게이션 · 라우트)

### 3-1. 사이트맵 (MVP 우선순위)
```
[P0 MVP]
/                홈 피드 (제품의 심장, page.tsx를 피드로 피벗)
/post/[id]       글 상세 (카드뉴스/Formula 본문 + 원문링크 + 댓글)
/profile/[id]    프로필 (활동기반 + 등급 뱃지)  ← members 상세모달을 페이지로 승격
/api/posts             GET 피드 list | POST 적재(ingest) | PATCH enrich
/api/posts/[id]        GET 단건 상세
/api/users/[id]        GET 프로필(activityStats 집계 + grade)
/api/interactions      GET ?postId= 댓글조회 | POST append (쓰기는 P1)

[P1 — 시간 남으면] POST /api/interactions(좋아요/댓글 쓰기), /formulas(아카이브), /members(디렉토리), 피드 필터/페이지네이션
[P2 — 명시적 제외] /write(에디터, 시드 대체), /about(구 curriculum 강등), 시리즈/포크/팔로우
[RETIRE] /apply(구글폼), archive-shared.ts 6인 union, PDF 200MB 드릴다운, cohort/week
```
> **Next 16 라우트 충돌 주의**: 같은 세그먼트에 `route.ts`+`page.tsx` 공존 금지. UI=`/post/[id]/page.tsx`, API=`/api/posts/[id]/route.ts`로 **분리**.

### 3-2. 네비게이션 (모바일 우선, `navigation.tsx` links 배열만 교체)
- **데스크탑 헤더**: 로고 / [피드]`/` / [Formula]`/formulas`(P1, 'Soon') / [멤버]`/members`(P1) / 다크토글 + 내 프로필 아바타. 기존 [지원하기] 제거.
- **모바일 하단 탭바**(DoD 3화면과 1:1): [홈 피드]`/` · [Formula]`/formulas`(비활성 가능) · [내 프로필]`/profile/me`. 글 상세는 카드 탭 → 푸시 네비.
- **클로즈드 루프**: 피드 → 카드 탭 → 글 상세 → 작성자 카드 → 프로필 → 작성글 → 글 상세(순환). 전환은 `<Link>` prefetch.
- 카피는 토스식 **해요체**, 강조색 1개(보라 accent).
- URL 네이밍(`/profile/[id]` vs `/u/[id]`)은 민혁(IA)과 Day1 합의. 본 문서는 `/profile/[id]`로 통일.

---

## 4. 데이터 계약 / 스키마 (Post / Formula / User / Interaction / Comment)

> **단일 진실 소스**: `src/data/contract.ts` 1파일을 Day1에 PR 머지·**동결**. 이후 변경은 전원 합의. timestamp = ISO-8601, id = 안정 문자열(시드=슬러그, 런타임=`crypto.randomUUID()`).

### 4-1. 공통 enum
```ts
export type Category   = "dev"|"design"|"pm"|"marketing"|"data"|"ai"|"insight";
export type AuthorType = "agent"|"user";          // agent=크롤러+카드뉴스(민성→희), user=사람
export type PostType   = "cardnews"|"formula";
export type InteractionType = "view"|"like"|"comment";
export type Tier = "sprout"|"contributor"|"activist"|"builder"|"master"; // 새싹/기여자/활동가/빌더/AX마스터
```

### 4-2. Post (통합 지식단위 — 카드뉴스 OR Formula가 피드/상세 UI 1벌 공유)
```ts
export interface CardNews {            // DoD#2: 희가 채우는 블록
  summary: string;                     // 2~3줄 (피드 카드 + 상세 상단)
  keywords: string[];                  // 3~5개 칩
  body: string;                        // 카드뉴스 본문(마크다운 허용)
  coverImageUrl: string;               // placeholder로 시작, 실에셋은 URL 교체만
}
export interface FormulaBody {         // 유저 글 = formulas.ts 필드 흡수 + prompt 추가
  problem: string; hypothesis: string; tools: string[];
  prompt?: string;                     // 복사 가능한 자산(신규)
  process: string; result: string; timeSaved: string; // "3주 → 4일"
}
export interface Post {
  id: string; postType: PostType; title: string; category: Category; tags: string[];
  authorType: AuthorType; authorId: string; authorName: string;       // 작성자 FK + 비정규화
  sourceName: string|null; sourceUrl: string|null; collectedAt: string|null; // 출처(DoD#1,#4)
  cardnews: CardNews|null;             // cardnews면 필수, formula면 null
  formula:  FormulaBody|null;          // formula면 필수, cardnews면 null
  likeCount: number; commentCount: number; viewCount: number;         // §11 드리프트 주의: 시드 표시용 OR derive-at-read
  createdAt: string;                   // 피드 정렬 키(desc)
}
```

### 4-3. User (members.ts + MemberRecord 병합 + 신뢰루프)
```ts
export interface ActivityStats {       // 가희 등급 알고리즘 INPUT
  visitCount: number;    // 방문/조회 (§11: 시드 baseline + 상세 진입 시 1 view-push)
  commentCount: number;  // interactions 파생
  formulaCount: number;  // posts 파생
  likesReceived: number; // interactions 파생
  projectCount: number;  // 프로젝트 완주 (MVP: 시드 고정값)
}
export interface User {
  id: string; name: string; role: string; company?: string; bio: string;
  interests: string[]; avatar: string; isAgent?: boolean;
  authoredPostIds: string[];           // members.ts formulaId? → 1:N 승격
  activityStats: ActivityStats;
  trustScore: number;                  // 36.5~99, 파생·캐시 (가희 공식 슬롯)
  tier: Tier; badgeLabel: string;      // 파생, 한글 라벨
  joinedAt: string; createdAt: string; // cohort:number → joinedAt(ISO)로 대체
}
```

### 4-4. Interaction (신규, append 이벤트 로그 = Comment 포함)
> **댓글(Comment)은 별도 타입이 아니라 `type:"comment"`인 Interaction**으로 통일. 댓글 렌더는 작성자 스냅샷 비정규화로 join 없이 출력.
```ts
export interface Interaction {
  id: string; postId: string; userId: string;   // userId = User.id | "anon-<uuid>"
  type: InteractionType;
  body?: string;                                 // comment 전용
  userName?: string; userAvatar?: string; userTier?: Tier; // comment 작성자 스냅샷
  createdAt: string;
}
```

### 4-5. 트러스트 공식 + 등급 테이블 (계약에 포함, 가희가 본문만 교체)
```ts
// score = clamp(36.5 + visit*0.1 + comment*1.0 + likesReceived*0.5 + formula*3.0 [+ project*4.0], 36.5, 99)
export const TIER_BANDS = [
  { tier:"master",      min:95, label:"AX마스터" },
  { tier:"builder",     min:80, label:"빌더" },
  { tier:"activist",    min:60, label:"활동가" },
  { tier:"contributor", min:45, label:"기여자" },
  { tier:"sprout",      min:0,  label:"새싹" },
];
export const categories = { /* formulas.ts 색상맵 + ai/insight 색 추가 (§11 필수) */ };
export interface IngestPostInput {     // 민성 크롤러 → POST /api/posts 입력 계약
  sourceName: string; sourceUrl: string; originalTitle: string;
  rawContent: string; collectedAt: string; category?: Category;
  cardnews?: CardNews;                 // 희가 ingest에 포함 OR 나중에 PATCH enrich
}
```

### 4-6. fixture 3종 (Day1 EOD 배포 → 전 팀 언블록)
- `posts.json`: 카드뉴스 3건(`authorType:"agent"`, cardnews 채움, `coverImageUrl=placehold.co`, source*) + 유저 Formula 2~3건(formulas.ts 시드 재사용). 총 5~6건.
- `users.json`: 시드 유저 4~6명. **등급 분포가 보이게 의도적 분산**(새싹/기여자/활동가/빌더 + §11 master 1명). 시스템 유저 `agent-curator` 포함.
- `interactions.json`: postId별 댓글 2~4건 + view/like. users.json activityStats와 **정합**.
> 시드의 `trustScore`는 예시값. **API는 항상 interactions에서 재계산(derive)**하고 캐시 필드를 신뢰하지 않음(self-healing).

### 4-7. 백엔드 API 계약 (적재·조회 3종 + 인터랙션)
| 동사·경로 | 역할 | 요청 | 응답 |
|---|---|---|---|
| `POST /api/posts` | **적재(ingest)** — 크롤러/에이전트 수신(DoD#1·2 통합지점) | `IngestPostInput` | `200 {item:Post}` / `400` / `500` |
| `PATCH /api/posts?id=` | 카드뉴스 후적재(희 enrich) | `{cardnews}` | `200 {item}` / `404` |
| `GET /api/posts?category=&authorType=&cursor=&limit=` | **피드 list**(최신순, DoD#3) | 쿼리(optional) | `200 {items:Post[], nextCursor}` |
| `GET /api/posts/[id]` | **단건 상세 + 댓글 inline**(DoD#4) | `await ctx.params` | `200 {item, comments, likeCount, viewCount}` / `404` |
| `POST /api/interactions` | append 좋아요/댓글/방문(P1) | `{postId,userId,type,body?}` | `201 {item}` / `400` / `404` |
| `GET /api/users/[id]` | **프로필 + 등급 집계**(DoD#5) | `await ctx.params` | `200 {item:User, authoredPosts}` / `404` |

> **Next 16 규약(문서 검증 완료)**: 핸들러 `export const dynamic="force-dynamic"; export const maxDuration=60;`. dynamic params는 Promise → `const {id}=await ctx.params`. envelope `{items}/{item}/{error}`는 기존 `members/route.ts` 그대로 복제.

### 4-8. 스토리지 계획 (Vercel Blob, "1 JSON 배열 = 1 테이블")
- 신규 lib 3개(member-storage.ts 패턴 복제): `post-storage.ts`, `user-storage.ts`, `interaction-storage.ts`.
- **READ**: 결정론적 public URL 직접 fetch + `{cache:"no-store"}` (§11: `list()` staleness 회피).
- **WRITE**: `put(path, json, {access:"public", addRandomSuffix:false, allowOverwrite:true, contentType:"application/json"})`.
- **interactions**: §11에 따라 **one-blob-per-event**(`interactions/{uuid}.json`)로 진짜 append 안전성 확보(또는 단일파일 + "순차 데모라 안전" 명시).

---

## 5. 화면 스펙 (홈 피드 · 글 상세 · 프로필 + 글쓰기)

공통: 컨테이너 `mx-auto max-w-2xl px-6 pt-24 pb-24`(단일 컬럼), 토스 24px 그리드(`space-y-6`), 강조색 1개(보라), 그림자 절제, 해요체, 다크모드 무료. `members/page.tsx`의 `refresh()`/loading/empty-state + `MemberDetailModal`·`Field` 재사용.

### 5-1. 홈 피드 (`src/app/page.tsx` 재구성, DoD#3)
- **렌더링**: Server Component 초기 list await fetch + `loading.tsx` 스켈레톤, 인터랙션(필터/좋아요)만 자식 Client(`FeedList`).
- **레이아웃**: [선택 Hero 미니 배너] → [필터 칩 바: 전체/AI큐레이션/유저Formula/카테고리, `overflow-x-auto`] → [FeedCard 1열].
- **FeedCard**: `<Link href={/post/${id}}>` + 커버(16:9, 없으면 gradient placeholder) + SourceBadge(agent→"AI 큐레이션" 보라칩) + category 칩 + 제목(2줄 clamp) + summary(2줄) + 키워드칩×3 + 메타행(아바타·작성자·소스·시각·♡·💬, **읽기 전용**). `rounded-2xl border-border/50 bg-card/50 hover:border-accent/30`.
- **상태**: 로딩=스켈레톤3, 빈상태=members 톤, 필터무결과=경량 메시지.

### 5-2. 글 상세 (`src/app/post/[id]/page.tsx` 신규, DoD#4)
- **Next 16**: Server Component 유지(`generateMetadata` 글별 OG, fetch는 React `cache()`로 메모이즈 **공유**). `const {id}=await params`. 인터랙티브만 자식 Client. 잘못된 id → `notFound()`.
- **레이아웃**: 브레드크럼 → 커버 → 메타헤더(category칩·SourceBadge·제목 `text-3xl`·작성자·시각) → 본문 → 원문 버튼(`sourceUrl!=null`일 때만, §11) → 좋아요 바 → 작성자 미니카드(등급뱃지→프로필) → 댓글.
- **본문 분기**: `CardNewsBody`(요약 박스 `bg-accent-dim/5 border-l-4` + keywords + body) **OR** `FormulaBody`(problem/tools칩/prompt 코드블록+`PromptCopyButton`/process/Before→After, timeSaved를 `gradient-text text-4xl`).
- **인터랙션**: 좋아요·댓글 **표시 필수**, **쓰기 stretch**(`useOptimistic`+Server Action, 입력검증 필수).

### 5-3. 프로필 (`src/app/profile/[id]/page.tsx` 신규, DoD#5,#6)
- **렌더링**: Server Component, `GET /api/users/[id]`(interactions 집계 reduce → activityStats → `computeTrust`).
- **레이아웃**: 헤더(아바타 128px·이름·역할·**등급뱃지 "활동가·62.5°"**·관심사칩) → AX 포트폴리오 3카드(Formula수/받은좋아요/프로젝트완주) → TrustGauge(36.5°→99° 바, archive progress-bar 재사용) → 활동통계 → 작성글 리스트(FeedCard 미니) → bio.
- **GradeBadge**(공용, 3화면 공유): pill + 구간 색 + 온도 숫자.
- **상태**: 없는 유저 `notFound()`, 작성글 0 빈문구.

### 5-4. 글쓰기 (`src/app/write/page.tsx`, **P2 stretch — 명시적 제외**)
> MVP는 '에이전트 생성 글 소비'까지 필수. 작성 UI는 시드 대체. 시간 여유 시에만.
- 지피터스식 '빈칸 채우기' 라벨 폼(자유 마크다운 아님 → 참여 문턱↓). 저장 = `POST /api/posts`(`postType:"formula", authorType:"user"`) — ingest와 **동일 엔드포인트·동일 스키마**. 제출 후 `revalidatePath('/')` → `redirect`(revalidate를 redirect 앞에, redirect는 try/catch 밖).

### 5-5. 공용 컴포넌트
FeedCard / GradeBadge / FilterChips / SourceBadge / CardNewsBody·FormulaBody / PromptCopyButton / LikeButton(Client) / CommentList·CommentItem / CommentComposer(Client, stretch) / TrustGauge·StatCard / ProfileHeader·AuthorMiniCard / Field·TextareaField(재사용) / CoverUploader(재사용) / Navigation·Footer(links 교체) / loading.tsx 스켈레톤 / EmptyState.

---

## 6. 신뢰 등급 모델 (당근 매너온도 벤치마크)

### 6-1. 공식 (결정론적·공개 — 데모 재현성 확보)
`trustScore = clamp(36.5 + visits*0.1 + comments*1.0 + likesReceived*0.5 + formulas*3.0 [+ projects*4.0], 36.5, 99)`
- 36.5° 기준점(정상체온 메타포) · 상한 99° · 소수 1자리.
- 가중치 순서 = cheap→expensive(방문 0.1 < 좋아요 0.5 < 댓글 1.0 < Formula 3.0 < 프로젝트 4.0).
- `TIER_BANDS` + `WEIGHTS` = 가희가 render/storage 안 건드리고 재튜닝하는 단일 계약값.

### 6-2. 등급 뱃지 5단계
| Tier | 구간 | 라벨 · 색 |
|---|---|---|
| 새싹 | [36.5, 45) | 이제 막 시작했어요 · green `#34d399` |
| 기여자 | [45, 60) | 꾸준히 참여해요 · blue `#60a5fa` |
| 활동가 | [60, 80) | 활발하게 활동해요 · violet `#a78bfa`(브랜드) |
| 빌더 | [80, 95) | 커뮤니티를 만들어가요 · amber `#fbbf24` |
| AX마스터 | [95, 99] | 상위 0.1% 신뢰 · gold `#f59e0b` + gradient-text |

### 6-3. 집계 = derive-at-read (배치/크론 없음)
- **쓰기**: `POST /api/interactions`가 이벤트 1건 append.
- **읽기**: `GET /api/users/[id]`가 로그 로드 → `computeTrust(userId, log)` full-scan(시드 규모 OK) → `{...user, activityStats, trustScore, tier, gauge}`.
- `src/lib/trust.ts`: `aggregateStats`/`scoreFromStats`/`tierFor`/`gaugeRatio`/`computeTrust` 5개 순수 함수.
- **§11: 정확한 계수·project 포함 여부·시드 점수·visitCount 의미는 가희와 Day1 합의로 동결.**

---

## 7. 크롤러 / 카드뉴스 / 등급 통합 계약

> 모든 외부 산출물은 **"입력 JSON 스키마 + adapter 함수 1개 + 목업 fixture"**로 격리. 근일은 항상 fixture로 동작하는 코드를 먼저 완성, 통합 시점엔 adapter 본문만 교체.

| 파트 | 산출물 | 경계(계약) | 근일 측 구현 | 격리 장치 |
|---|---|---|---|---|
| **민성**(크롤러) | 해외 raw 글 | `POST /api/posts` = `IngestPostInput` 6필드 | `ingestToPost(raw):Post` adapter | `posts.ingest.json` 2~3건 |
| **희**(카드뉴스+브랜딩) | summary/keywords/coverImageUrl | `Post.cardnews` 블록 | ingest 포함 OR `PATCH` enrich | coverImageUrl = URL 1필드, placeholder로 항상 채움 |
| **가희**(등급) | 산정 알고리즘 | `computeTrust(stats)` IN=`ActivityStats`/OUT=`{trustScore,tier,badgeLabel}` | 기본 공식 먼저, 본문만 교체 | users.json↔trustScore 정합 |
| **민혁**(IA) | 라우팅·정보위계 | 3화면 라우트·카드 메타 순서 | 합의대로 | Day1~2 합의 |
| **은지**(QA) | DoD 6항목 검수 | 모바일 375px 시드 동작 | 자가검증 | Day3 체크리스트 |

**격리 보장**: 비주얼/요약 미완이어도 `coverImageUrl=placeholder`, `cardnews=null` 허용 → 화면은 시드로 항상 동작(DoD#6).

---

## 8. 1주 일자별 실행계획 + 역할 매핑

| Day | 핵심 작업 | 마일스톤 |
|---|---|---|
| **Day1 (월) 계약 동결** | (0) **사전: contract.ts + fixture 3종 미리 작성**(§11) (1) `node_modules/next/dist/docs/` route/page 먼저 읽기 (2) 3타입+`computeTrust` 시그니처 동결 (3) fixture 확정 (4) 민성 ingest 스키마·가희 경계값·민혁 라우트 합의 (5) **PR 머지 freeze** | 계약+fixture 배포 → 4파트 병렬 시작 |
| **Day2 (화) BE 조회 + 시드검증** | `post-storage`/`interaction-storage`, `GET /api/posts`·`/api/posts/[id]`(404), **`npm run seed` + curl smoke-test(GET /api/posts ≥5건, 데모 env)** | 조회 API가 Blob 시드로 응답 + 시드 검증 게이트 |
| **Day3 (수) 적재+유저 API+피드** | `POST /api/posts`(ingest adapter), `GET /api/users/[id]`(집계+등급), **홈 피드**(DoD#3), 은지 모바일 체크리스트 | DoD#3 충족, API 3종+ingest 가동 |
| **Day4 (목) 상세+프로필** | **글 상세**(generateMetadata, 본문+원문+댓글, DoD#4), **프로필**(등급뱃지+포트폴리오, DoD#5), 3화면 fetch 바인딩(DoD#6) | DoD#4·#5·#6 충족 |
| **Day5 (금) 1차 통합** | 민성 실데이터 ingest, 희 실 coverImageUrl 교체, 가희 computeTrust 실로직, 토스 톤 폴리시 | 외부 3파트 통합 |
| **Day6 (토) 전체 통합+QA** | 1사이클 e2e(수집→적재→가공→피드→상세→프로필), 은지 QA(빈상태/에러/404/clamp), (stretch) 댓글 쓰기 | DoD 6항목 그린 |
| **Day7 (일) 리허설+동결** | `next build && next start` 검증(dev는 캐싱 안 보임), 모바일 375px 리허설 2회, 플랜B(fixture 롤백), `DEMO_SCRIPT.md` | 데모 준비 완료 |

**역할 경계**: 근일 = 데이터 계약·BE 3종 API·모바일 3화면·fixture 배포 = **통합 허브**.

---

## 9. DoD 커버리지 표

| DoD | 내용 | 화면 | API | 오너 | 격리 fixture |
|---|---|---|---|---|---|
| **#1** | 해외 소스 1곳 새 글 자동수집 | 백그라운드 | `POST /api/posts` + **자동 트리거(§11·§10)** | 수집=민성 / 적재 스키마=근일 | `posts.ingest.json` |
| **#2** | AI 카드뉴스 자동생성 | 결과만 렌더 | `Post.cardnews` + PATCH enrich | 생성=희 / 스키마=근일 | posts.json cardnews + placehold.co |
| **#3** | 카드뉴스 홈 피드 카드 리스트 | **홈 피드** | `GET /api/posts` | 근일 | posts.json 5~6건 |
| **#4** | 피드→글 상세(카드뉴스+원문+댓글) | **글 상세** | `GET /api/posts/[id]` | 근일 | posts.json + interactions 댓글 |
| **#5** | 활동 기반 등급 뱃지 프로필 표시 | **프로필** | `GET /api/users/[id]` | 산정=가희 / 노출=근일 | users.json + interactions |
| **#6** | 모바일 3화면 실/시드 데이터 동작 | **3화면 전부** | 위 3종 + 적재 | 근일 | 3종 fixture 세트 |

---

## 10. 열린 의사결정 (사용자 결정 필요)

> ★ = 워크플로우 권고. 검증(critique)도 7개 권고 전부에 동의. ◆ = 적대적 검증이 추가로 발견한 미결 결정.

| # | 결정 | 선택지 | 권고 |
|---|---|---|---|
| D1 | **피벗 vs 병행** | A.완전 피벗(홈=피드, archive/apply 은퇴) / B.병행 추가(/feed 신설) | ★ **A(소프트 피벗)** — 홈은 피드로, archive/curriculum은 /about·푸터로 강등(즉시삭제X). 6인 union은 어느 쪽이든 삭제 필수 |
| D2 | **카드뉴스 생성** | A.희 위임(fixture) / B.근일 직접(AI SDK) / C.하이브리드 | ★ **C** — 기본 위임(R&R), 텍스트 요약/키워드만 Day5 `generateObject` 폴백 안전망, 이미지는 placeholder 격리 |
| D3 ◆ | **자동수집 트리거**(DoD#1 '자동') | A.Vercel Cron 라우트 / B.민성 크롤러 self-trigger / C.데모용 수동(정직하게 표기) | **A 또는 B** — DoD#1의 '자동'을 충족하려면 트리거 주체를 Day1에 못박아야 함 (BLOCKER) |
| D4 | **스토리지** | A.Blob 유지 / B.interactions만 DB / C.전면 DB | ★ **A** — 1주 규모 충분, 인프라 0. B는 데모 후 업그레이드 경로 |
| D5 | **인증·신원** | A.시드 유저만 / B.익명 쿠키 id / C.실제 로그인 | ★ **A** — DoD#5는 시드 활동→등급까지. 쓰기 stretch 시에만 B 보강 |
| D6 | **레거시 자산** | A.적극정리(apply폐기, archive→/formulas, members→/profile) / B.최소변경 / C.전부은퇴 | ★ **A** — 6인 union 삭제는 필수 |
| D7 | **브랜드** | A.보라 톤 유지 / B.리브랜딩 | ★ **A** — PRD가 토스식 단일 보라 명시, 기존 토큰 일치. 희 브랜딩은 에셋(커버/로고)에만 |
| D8 | **인터랙션 쓰기** | A.표시만(P0) / B.쓰기 포함 | ★ **A** + B를 Day6 stretch(좋아요 토글 1개부터) |
| D9 ◆ | **visitCount 의미** | A.시드 고정 / B.실제 증분 | **A + 절충** — 상세 진입 시 `type:"view"` 1건 push로 최소 1경로 실제화, 가희와 가중치 합의 |
| D10 ◆ | **interactions 저장 형태** | A.단일 registry.json(lost-update, 순차데모 OK) / B.one-blob-per-event(진짜 append) | **B 권고**(정확성) 또는 A+"순차라 안전" 명시. ('append=race-immune'은 Blob에서 거짓) |

---

## 11. 검증 반영 (적대적 Critique 후속 — 필수 수정)

검증 결과 **아키텍처는 견실**(orphan 부활 사실 확인, Next16 패턴 실제 문서로 검증 통과)하나, **2개의 잘못된 확신 + 3개의 미결 결정**이 발견됨. "순차·스크립트 데모"로는 6개 DoD 모두 달성 가능 (FEASIBLE).

### 11-1. MUST-FIX (Day1 전 반영)
1. **[BLOCKER] 자동수집 트리거 부재** — `POST /api/posts`는 수동적 수신자일 뿐, 스케줄러 없음. DoD#1의 '자동'을 위해 Vercel Cron 라우트 또는 크롤러 self-trigger를 Day1에 결정·배선. → **D3**.
2. **[BLOCKER] 'append-only = race-immune'은 거짓** — Vercel Blob에 append 프리미티브 없음(put/del/get/list/copy/multipart만). interactions도 read-array+push+PUT라 동일한 lost-update. → **one-blob-per-event로 전환(D10-B)** 또는 "순차 데모라 안전" 정직하게 명시.
3. **[HIGH] 시드 검증 게이트 부재** — Blob이 데모 env에서 비어있으면 3화면 전부 빈상태로 DoD#6 조용히 실패. → Day2에 `npm run seed` + curl smoke-test(데모와 동일 env, GET /api/posts ≥5건), Day7 리허설 체크리스트 항목화.
4. **[HIGH] 확장 카테고리 색맵 + master 시드 유저** — Category에 `ai`/`insight` 추가했으나 formulas.ts 색맵엔 없음 → 깨진 칩. master(≥95) 시드 유저 없으면 gold/gradient 뱃지 UI가 미테스트로 배포. → Day1에 확장 색맵 + master 1명 시드.

### 11-2. SHOULD-FIX
- **카운트 드리프트**: Post의 `likeCount/commentCount`(캐시)와 상세의 derive-at-read 카운트가 갈림 → 피드/상세 숫자 불일치. 피드도 derive-at-read로 통일하거나 캐시 카운트를 "시드 장식용"으로 명시.
- **커서 페이지네이션**: `createdAt`만으로는 동일 시각 시드에서 경계 누락/중복 → `(createdAt, id)` 복합 커서 또는 시드 createdAt 유니크 보장.
- **list() staleness**: `list()`는 eventually-consistent → 방금 ingest한 글이 피드에서 수 초간 안 보일 수 있음(DoD#1→#3 순간). 결정론적 public URL 직접 읽기로 회피.
- **anon 신원**: trust 집계는 실제 `User.id`인 interaction만 카운트(anon-xxx 유령 유저 배제).
- **React `cache()` 공유**: `generateMetadata`와 page 본문이 **동일** `cache()` 래퍼 로더를 호출해야 Blob 이중 read 방지.
- **로딩/에러 바운더리**: `/post/[id]`·`/profile/[id]`에도 `loading.tsx` 스켈레톤(홈 스켈레톤 재사용).
- **Server Action(stretch)**: `revalidatePath`는 `redirect` 앞, `redirect()`는 throw하므로 try/catch 밖.

### 11-3. 일정 현실성 경고
- 근일 단독으로 contract + 3 storage lib + 4 API + 3 화면 + ~18 컴포넌트 + seed + 외부 3파트 통합 = 7일. **Day3/Day4(화면+API+통합을 하루에)가 슬립 지점.** → contract.ts·fixture를 **Day1 전에 미리 작성**, Day1은 sign-off만. write-page(P2)·comment-write(stretch)는 끝까지 컷 유지.

---

_본 기획서의 원본 산출물(11개 에이전트, 4분석×5설계×합성×검증)은 `.omc/wf-planning.js` 워크플로우로 생성됨._
