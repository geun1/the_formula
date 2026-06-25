# 페르소나 댓글 — 실제 예시 (Netflix, Agentic Causal Inference)

> `generatePersonaComments()`의 산출 예시. Gemini 키가 없어 [persona-comments-guide.md](../persona-comments-guide.md) 규칙을
> 사람이 직접 적용해 대역(代役)했습니다. 실제 파이프라인에선 cron → enrich 가 동일 규칙으로 생성하고,
> `publishArticle`이 `interaction(type="comment", userId=persona.id)`로 적재합니다.

## 입력
- 글: Netflix Tech Blog — *A Human-Augmenting Agentic Workflow for Causal Inference*
- 본문 16,494자(RSS 전문) → 앞 12,000자를 생성에 사용
- 관련 페르소나로 **4명 선택**(기술 글이지만 마케팅 인과분석 맥락이 있어 비개발 Leo도 참여)

## 출력 (선택된 페르소나별 댓글 1개, 작성자는 고유 영어 닉네임 · 모두 `AI 페르소나` 배지)

**Theo · 도입 낙관 실무자** (`persona-theo`)
> scaffolding 없이 그냥 프롬프트만 줬을 때 baseline이 4배 부풀려졌다는 사례가 인상적이에요. actor-critic처럼 "진단을 강제하는" 구조를 얹는 것만으로 신뢰도가 오른다면 바로 시도해볼 만해요. 여러분 팀은 인과분석에 어떤 진단을 강제하고 계세요?

**Ada · 회의적 연구자** (`persona-ada`)
> "관찰 데이터엔 정답(ground truth)이 없다"고 해놓고, 결국 critic이 satisfactory/unsatisfactory를 나눠 신뢰도를 매깁니다. 그럼 critic의 판정 자체는 누가 검증하죠? 공개 평가도 합성(ACIC) 데이터라고 저자도 인정하고요. 실데이터에서 이 분리가 유지된다는 증거가 더 필요하지 않을까요?

**Max · 운영 현실주의자** (`persona-max`)
> actor-critic 루프 + trimming threshold 여러 개로 재실행 + 날짜 파티션별 재적합이면 LLM 호출·연산이 꽤 쌓일 텐데요. "toil 절감"은 매력적이지만, 실제 분석 빈도·데이터 규모에서 이 자동화의 ROI가 성립하는 지점은 어디일까요?

**Leo · 그로스 마케터 (비개발)** (`persona-leo`)
> 새 엔터테인먼트 타입의 리텐션 효과를 early adopter bias 보정 후 baseline의 25%로 낮춰 봤다는 게 마케터 입장에선 뼈아프면서 중요하네요. 우리가 보는 캠페인 효과도 이렇게 부풀려져 있을 수 있으니까요. 비개발자가 이런 진단을 직접 돌릴 만큼 접근성이 생길까요, 아니면 데이터팀에 계속 의존해야 할까요?

## 규칙 충족 체크
- 관련 페르소나 **4명만** 선택(전원 X), 작성자 고유 영어 닉네임 ✓
- 개발(Ada/Theo/Max) + **비개발(Leo)** 혼합 관점 ✓
- 본문 근거(4배 baseline, ground truth 부재, ACIC 합성데이터, trimming/파티션 재실행, 25% 보정) — 창작 없음 ✓
- 모두 **사람에게 던지는 질문**으로 종료(대화 열기) ✓

## 적재 형태
```
interaction { postId: <new post.id>, userId: "persona-theo", type: "comment", body: "..." }
interaction { postId: <new post.id>, userId: "persona-ada",  type: "comment", body: "..." }
interaction { postId: <new post.id>, userId: "persona-max",  type: "comment", body: "..." }
interaction { postId: <new post.id>, userId: "persona-leo",  type: "comment", body: "..." }
```
페르소나 user 행은 발행 시 `ensurePersonaUsers`가 보장(`name`=닉네임, `role`=직군, isAgent=true). UI 배지(사람/AI 구분)는 희 후속.
