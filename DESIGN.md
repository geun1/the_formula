# The Formula — 디자인 시스템 (v2, 라이트·블루)

> 레퍼런스 아티팩트(사용자 제공)를 그대로 차용. **라이트 테마 전용**(다크모드 제거).
> 토스풍: 넓은 여백 · 강한 타이포 · 단일 블루 accent · 그림자 절제(soft) · 둥근 카드 · 해요체.

## 1. 컬러 토큰 (globals.css `:root`, 다크 변형 전부 삭제)
```
--background: #f7f8fa;   /* 페이지 배경(아주 옅은 회색) */
--surface:    #ffffff;   /* 카드/헤더 표면 */
--foreground: #18181b;   /* 본문 텍스트(near-black) */
--muted:      #71717a;   /* 보조 텍스트 */
--muted-soft: #9ca3af;   /* 더 옅은 보조 */
--border:     #ececef;   /* 카드/구분선 보더 */
--border-soft:#f1f2f4;
--accent:     #2563eb;   /* 블루-600: 로고/주요 버튼/링크/숫자 */
--accent-hover:#1d4ed8;  /* 블루-700 */
--accent-soft:#eff6ff;   /* 블루-50: accent 배경 틴트 */
--accent-softer:#dbeafe; /* 블루-100 */
--card:       #ffffff;
--card-hover: #f9fafb;
```
- 폰트: Geist Sans(본문/제목), Geist Mono(코드/숫자 일부). 제목 bold, tracking-tight.
- 라운드: 카드 `rounded-2xl`(16px), 칩 `rounded-full`, 버튼 `rounded-lg`/`rounded-full`.
- 그림자: 매우 약하게(border 위주). 카드 hover 시 `shadow-sm` + border accent 살짝.
- **삭제**: `.gradient-text`(보라) → 블루 단색 또는 제거, `.glow`, 다크 토큰, `html.dark`, theme-init script, ThemeToggle. (다크 관련 className/`dark:` 변형 정리)
- `.gradient-text` 대체가 필요하면 `text-accent` 또는 블루 그라데이션(`#3b82f6→#2563eb`).

## 2. 툴/카테고리 칩 색 (핵심 비주얼 신호)
- **툴 칩** (AI 도구):
  - GPT: bg `#eef2ff` text `#4f46e5` (인디고)
  - Claude: bg `#fff7ed` text `#ea580c` (오렌지)
  - 자동화: bg `#ecfdf5` text `#059669` (그린)
  - 기타(Gemini 등): bg `#f1f5f9` text `#475569` (슬레이트)
- **카테고리 칩** (기획/디자인/마케팅/데이터/CS/개발/AI): 중립 `bg #f1f3f5 text #52525b border #e9ebee` (작고 옅게). 활성 필터는 `bg accent-soft text accent`.
- ✓검증됨 뱃지: bg `#ecfdf5` text `#059669`.

## 3. 카드 (아티클/아카이브 공용)
- 구성: 상단 **컬러 그라데이션 커버**(카테고리/툴 기반 결정론적, h~160px) + 좌하단에 툴 뱃지 pill(반투명 흰 배경). 본문: 작성자·날짜(작은 회색) → 제목(bold 2줄 clamp) → 설명(muted 2줄) → 하단 카테고리+툴 칩 + ♥카운트(우측).
- 커버 그라데이션 팔레트(카테고리별, 채도 낮은 파스텔): 블루(`#6366f1→#8b5cf6`?)·틸·그레이·그린 등. 단일 accent 원칙상 블루 계열 위주 + 카테고리별 톤 변주. CoverGradient 컴포넌트 재사용/리톤.
- 카드 배경 흰색, border `--border`, hover `border-accent/40` + `card-hover`.

## 4. 헤더 / 네비
- 흰 배경 + 하단 `border-border`. 좌측: **블루 라운드 사각형 안에 'F'** + `The Formula`(F는 블루). 중앙/좌: 아티클 / 아카이브 / 포뮬러 / 모임. 우측: 통합검색 아이콘, 로그인(고스트) / **가입하기(블루 pill)** 또는 로그인 시 아바타.
- 활성 링크: text-foreground(또는 accent), 비활성 muted.

## 5. 홈(= 아티클 피드) 레이아웃
1) **히어로 카드**: 옅은 블루 그라데이션 배경 `rounded-2xl`. eyebrow(블루 대문자 `JUNE 21 · SATURDAY` 형식 날짜) + 큰 제목(예 "오늘은 어떤 일을 가볍게 덜어볼까요?") + 서브("매일 한 줄씩, 나만의 공식이 차곡차곡 쌓여요.") + 우측 구름·물방울 일러스트(블루 SVG, 단순).
2) **인기 글 TOP 5**: 흰 카드 한 줄(5칸). 각 칸: 큰 블루 숫자(1~5) + 카테고리칩+툴칩 + 제목(2줄) + 작성자 + ♥카운트. 우측 상단 "이번 주" 라벨.
3) **3컬럼**:
   - 좌(`관심 카테고리`): 세로 리스트(전체/기획/디자인/마케팅/데이터/CS…) 활성=accent-soft.
   - 중앙: 정렬 탭(최신순/인기순/저장순) + **아티클 카드 2열 그리드**.
   - 우(사이드 위젯, 흰 카드): **모집 중인 모임**(프로젝트/스터디 칩+제목+더보기) + **추천 포뮬러**(멤버 아바타+이름+직무 리스트+더보기).

## 6. 핵심 로직 / 엔티티 (아티클 ↔ 아카이브)
- **아티클(Article)** = 크롤러가 적재한 외부 AI 글, BE가 AI로 정제(요약·키워드). 현 스키마의 `post.postType='cardnews'` 를 "아티클"로 명명. 작성자=AI 큐레이터.
- **아카이브(Archive)** = 유저가 작성한 내 공식/경험. `post.postType='formula'`. 신규 필드 **`relatedArticleId`**(아티클 post.id, nullable)로 아티클에 연결.
- **연결 표시**: 아티클 상세 → "이 아티클로 작성된 **관련 아카이브**" 리스트. 아카이브 상세 → "참고한 **아티클**" 백링크 카드.
- **작성 플로우**: 아카이브 작성 시 관련 아티클 선택(검색/선택) → relatedArticleId 저장. 아티클 상세의 "이 아티클로 아카이브 작성하기" 버튼은 작성 폼에 articleId 프리필.
- 나머지(포뮬러=멤버 디렉토리/프로필/신뢰등급, 모임, 커리큘럼, 온보딩, 검색, 계정)는 **기능 유지 + 라이트·블루 리스킨**.

## 7. 라우트(라벨 변경)
- `/` 아티클 피드(홈) · `/article/[id]` 아티클 상세(+관련 아카이브)
- `/archive` 아카이브 피드 · `/archive/new`(또는 작성) · 아카이브 상세는 `/formula/[id]` 유지(라벨 "아카이브")
- `/members` (라벨 **포뮬러**) · `/profile/[id]`
- `/activities` (모임) · `/curriculum` · `/search` · `/account` · `/onboarding` · `/apply`
- 네비 라벨: 아티클 / 아카이브 / 포뮬러 / 모임.
