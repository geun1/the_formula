# 아티클 수집 파이프라인 — 데이터 계약 & 핸드오프

> 소유: 민성(수집/크롤러 → 데이터 계약 전달). 대상 독자: 희(카드뉴스), 근일(백엔드), 가희(프로필).
> 타입 단일 진실 소스(SoT): [`src/lib/contract.ts`](../src/lib/contract.ts) · 입력 스키마: [`src/lib/ingest.ts`](../src/lib/ingest.ts) · API 스펙: `/api/openapi.json` (Swagger UI `/api-docs`).
> 이 문서는 그 위의 **운영 계약**(보장·불변식·샘플·에러)입니다. 타입을 중복 정의하지 않고 가리킵니다.

## 1. 파이프라인 한눈에

```
[크롤러(민성)]                [AI 서버 / cron]                 [사이트]
 crawlSources()                                                
   │ ArticleInput[]                                            
   ▼                                                           
 POST /api/articles ──▶ raw_article(pending)                   
                              │  GET /api/articles/pending?claim=true
                              ▼  (processing 으로 lease)        
                         enrichArticle(Gemini)                 
                              │  PATCH /api/articles/{id}        
                              ▼                                  
                         post(cardnews) 발행 + raw(enriched) ──▶ GET /api/articles (공개 피드)
```

- 수집과 가공이 **분리**돼 있고 **큐(raw_article)** 로 이어짐 → 멱등·이어처리 안전.
- 인증 필요한 머신 엔드포인트(POST/pending/PATCH)는 `INGEST_API_KEY`. 공개 GET은 무인증.

## 2. 상태 수명주기 (EnrichmentStatus)

```
pending ──claim──▶ processing ──PATCH(성공)──▶ enriched (postId 연결)
                        └────────PATCH(실패)──▶ failed   (error 기록)
```

- `pending`: 크롤러가 막 적재. `attempts=0`.
- `processing`: pending GET `?claim=true` 시 lease(`attempts+1`, `claimedAt`).
- `enriched`: 발행 완료, `postId` 설정. 재PATCH는 멱등(`already_published`).
- `failed`: 가공 실패, `error` 기록(최대 500자).

## 3. 데이터 계약: 크롤러가 보장하는 것 (ArticleInput)

POST 1건의 형태 (스키마: `articleInputSchema`):

| 필드 | 타입 | 보장 |
|---|---|---|
| `sourceUrl` | string(url) | **중복 제거 키. 추적 파라미터(utm_*, fbclid 등) 제거·정규화됨.** unique. |
| `sourceName` | string | 출처 표시명(예: "Netflix Tech Blog") |
| `originalTitle` | string | 원문 제목, 최대 300자 |
| `rawContent` | string | `"제목\n\n본문"`. HTML 제거된 플레인 텍스트. **최대 40,000자**. 발췌 RSS는 원문 전문 추출로 보강(가능 시) |
| `coverImageUrl` | string(url)? | RSS media/enclosure → 원문 og:image 순 폴백. 없으면 생략 |
| `category` | enum? | 폴백 카테고리. **최종 분류는 enrich(Gemini)가 결정** |
| `collectedAt` | ISO-8601? | 원문 발행시각. 없으면 수집 시각 |

**불변식**
- 같은 `sourceUrl` 재전송 → `onConflictDoNothing` 으로 조용히 skip(멱등). 재크롤 안전.
- 배치 내 중복도 첫 항목만 유지.
- `rawContent`/`coverImageUrl`는 정책상 **내부 처리·발췌 생성용**. 발행물의 전문 복제는 [sourcing-policy.md](./sourcing-policy.md) 참조.

## 4. 엔드포인트 & 샘플

### POST /api/articles (적재 · 키 필요)
단건 / 배열 / `{articles:[...]}` 모두 허용. 한 번에 최대 50건.
```json
// 요청
{ "articles": [
  { "sourceName": "Netflix Tech Blog",
    "sourceUrl": "https://netflixtechblog.com/...",
    "originalTitle": "Toward More Controllable AI Video Editing",
    "rawContent": "제목\n\n본문 플레인텍스트...",
    "coverImageUrl": "https://miro.medium.com/...",
    "category": "ai",
    "collectedAt": "2026-06-20T08:00:00Z" }
]}
// 응답 202
{ "ok": true, "received": 1, "queued": 1, "skipped": 0,
  "items": [{ "sourceUrl": "...", "status": "queued", "id": "uuid" }] }
```

### GET /api/articles/pending?limit=10&claim=true (클레임 · 키 필요)
```json
{ "queue": { "pending": 12, "processing": 4, "enriched": 130, "failed": 2 },
  "claimed": true, "count": 4,
  "items": [{ "id": "uuid", "sourceName": "...", "originalTitle": "...",
              "rawContent": "...", "category": "ai", "collectedAt": "...",
              "attempts": 1, "status": "processing" }] }
```

### PATCH /api/articles/{id} (발행/실패 보고 · 키 필요)
```json
// 발행
{ "cardnews": { "summary": "2~3문장 티저", "keywords": ["..."],
                "body": "마크다운 본문", "coverImageUrl": "" },
  "category": "ai", "tags": ["..."] }
// 실패
{ "status": "failed", "error": "Gemini 타임아웃" }
```
- `cardnews.coverImageUrl`가 `""`면 크롤 시 추출한 `raw.coverImageUrl` 로 폴백 → 없으면 UI가 브랜드 그라데이션 렌더.

### GET /api/articles?limit=20&offset=0&category=ai (공개 피드 · 무인증)
발행된 cardnews 목록 + like/comment/save 카운트.

## 5. 에러 계약

| status | 의미 |
|---|---|
| 202 | 적재 수락(queued/skipped 내역은 body) |
| 400 | JSON 파싱 실패 / 빈 배치 / 50건 초과 / 항목 검증 실패(`articles[i] 입력 오류: <path> — <msg>`) |
| 401 | API 키 없음/불일치 |
| 503 | `INGEST_API_KEY` 미설정 |
| 500 | 서버/DB 오류(`{ error }`) |

모든 에러 응답 형태: `{ "error": "사람이 읽는 메시지" }`.

## 6. 팀별 통합 포인트

- **희(카드뉴스)**: 입력은 `pending` 항목의 `rawContent`(=제목+본문). 출력은 PATCH `cardnews`(summary/keywords/body/coverImageUrl). body는 마크다운(표·`​```chart​` 지원). 발췌 정책은 sourcing-policy 4.1.
- **근일(백엔드)**: 라우트는 `src/app/api/articles/**`. env `INGEST_API_KEY`(머신 인증), `DATABASE_URL`, 선택 `ENRICHMENT_WEBHOOK_URL/SECRET`(적재 시 push 알림). cron은 `/api/cron`(`CRON_SECRET`).
- **가희(프로필)**: 발행 post의 `authorType="agent"`, `authorId=AGENT_CURATOR_ID`("AI 큐레이터"). 사람 작성 Formula와 구분.

## 7. 필요한 환경변수

| 변수 | 용도 |
|---|---|
| `INGEST_API_KEY` | 머신 엔드포인트(POST/pending/PATCH) 인증 |
| `DATABASE_URL` | Neon Postgres |
| `CRON_SECRET` | `/api/cron` 인증(Vercel Cron Bearer) |
| `CARDNEWS_MODEL` | enrich 모델 오버라이드(기본 gemini-3.5-flash) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini 인증 |
| `ENRICHMENT_WEBHOOK_URL` / `_SECRET` | (선택) 적재 직후 AI 서버 push 알림 |

## 8. 향후 하드닝 노트 (제안, 미적용)

- `api-auth.ts`의 키 비교는 단순 `!==`(비상수시간). 내부 키라 영향 작지만, 외부 노출 시 `crypto.timingSafeEqual` 권장.
- pending 클레임에 lease 만료(stuck `processing` 회수) 없음 — AI 서버가 죽으면 항목이 `processing`에 남음. `claimedAt` 기준 TTL 재pending 배치 고려.
- POST 배치 검증은 첫 오류에서 전체 400 반환(all-or-nothing). 부분 수용이 필요하면 항목별 결과 배열로 전환 고려.
