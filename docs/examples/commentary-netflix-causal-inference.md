# 상세 리뷰 모드 — 실제 예시 (Netflix, Agentic Causal Inference)

> `techblog` 상세 리뷰 모드의 **실제 산출 예시**. Gemini API 키가 없어
> [commentary-guide.md](../commentary-guide.md)의 리뷰 루브릭을 사람이 직접 따라 enrich 출력을 대역(代役)했습니다.
> 실제 파이프라인에서는 `cardnews.ts`의 commentary 분기가 같은 규칙으로 생성합니다.

## 입력 (크롤러 → raw_article)

| 필드 | 값 |
|---|---|
| sourceName | Netflix Tech Blog |
| originalTitle | A Human-Augmenting Agentic Workflow for Causal Inference |
| sourceUrl | https://netflixtechblog.com/a-human-augmenting-agentic-workflow-for-causal-inference-4623f0a9c5af |
| rawContent | 16,494자 (RSS `content:encoded` 전문) |
| kind | techblog → **상세 리뷰 모드** |

## 출력 (enrich → CardNews)

**category**: `ai` · **keywords**: `인과추론`, `AI 에이전트`, `actor-critic`, `early adopter bias`, `Netflix`

**summary**:
> Netflix가 관찰적 인과추론(OCI)을 에이전트에게 맡기되 사람이 각 단계를 검증하는 'human-augmenting' 워크플로우를 공개하고 `oci-agent`를 오픈소스로 냈어요. 단순 프롬프트는 early adopter bias 같은 함정에 빠지지만, 진단·trimming을 강제하는 scaffolding + actor-critic 루프로 훨씬 신뢰할 수 있는 추정을 얻습니다.

**body**:

```markdown
## 한눈에 (TL;DR)
Netflix가 관찰 데이터로 인과효과를 추정하는 작업(OCI)을 AI 에이전트에게 맡기는 워크플로우를 공개했어요. 핵심은 자동화로 반복 작업을 줄이되 각 분석 단계를 사람이 검증·재실행할 수 있게 한 것. 표준 진단 4종을 강제하는 scaffolding과 actor-critic 구조로, 단순 프롬프트 대비 추정 신뢰도를 크게 높였습니다. 사례에선 scaffolding 적용 후 추정치가 baseline의 25% 수준으로 교정됐고, ACIC 벤치마크에서 scaffolding이 있을 때 10개 중 9개 정답을 회복했습니다. 경량 버전은 오픈소스(`oci-agent`)로 공개됐습니다.

## 핵심 주장
- scaffolding(진단·플레이북 강제)이 모델 성능보다 인과추정의 신뢰도를 좌우한다 — one-shot은 일관되게 틀림.
- actor-critic 루프로 "수행"과 "검증"을 분리해, 정답이 없는 OCI에서도 신뢰도를 차등 판정할 수 있다.
- ACIC 77개 DGP·231개 추정에서 satisfactory(192) 추정이 unsatisfactory(39)보다 RMSE·CI 보정 모두 우수.

## 어떻게 풀었나
기존(pre-AI) OCI 툴킷의 "target trial emulation" 철학 위에, 에이전트가 따라야 할 4개 설계 진단(공변량 균형·overlap·placebo·숨은 교란 민감도)을 박아 넣었어요. Principal(사람)·Actor(분석)·Critic(검증) 세 역할이 actor-critic으로 돕니다. 정답 부재 문제는 이렇게 못박습니다:
> "인위적으로 시뮬레이션한 데이터 밖에서는, 관찰적 인과추론에 정답(ground truth)이 존재하지 않는다."
그래서 정답 대비가 아니라 에이전트가 남긴 산출물(계획·플롯·노트북)을 사람이 재실행하는 '프로세스 감사'로 신뢰를 쌓습니다.

## 뜯어보기
- **트레이드오프**: Crump trimming([0.1,0.9])으로 신뢰도를 올리는 대신, 추정 대상이 "overlap 되는 모집단의 ATE"로 좁혀집니다. 전체 모집단 효과로 일반화하면 안 됨.
- **수치의 측정 조건**: "baseline의 25%"는 새 엔터테인먼트 타입 한 사례의 결과라 일반화엔 주의. 핵심 평가는 합성(ACIC) 데이터 기반.
- **마케팅 vs 실제 기여**: "에이전트가 인과추론을 한다"보다, 실제 기여는 *진단을 강제하는 scaffolding과 process-audit 구조*에 가깝습니다(LLM 자체보다).
- **재현·검증**: `oci-agent`와 ACIC 평가가 오픈소스(EconML 기반)로 공개돼 제3자 검증 가능 — 신뢰를 높이는 지점.

## 실무 적용
정답 없는 분석(마케팅 효과·리텐션 인과 등)에 LLM을 붙이는 팀이라면, 결과가 아니라 **과정을 감사**하는 구조가 현실적 모델입니다. 걸림돌: 강제할 진단 세트와 vetted 툴킷을 먼저 갖춰야 함(에이전트만으론 부족). 다음 행동: `oci-agent` 레포의 진단·playbook 구조부터 읽어보기.

## 한 줄 평
"인과추론에서 신뢰는 모델이 아니라 강제된 진단·검증 구조에서 나온다"는 설득력 있는 사례. 다만 핵심 평가가 합성 데이터라, 실데이터에서 critic의 satisfactory 판정이 유지된다는 증거는 아직 부족해 보입니다.

> 전문은 원문 출처에서 확인하세요.
```

## 이 결과가 소싱 정책에 부합하는 이유
- body 대부분이 **재서술·비평**이고 원문 직접 인용은 **짧게 1개**(정답 부재 문장) — 전문 복제·번역 아님.
- '뜯어보기'·'한 줄 평'의 **비판적 논평이 주(主)** → 변형적 성격이 강해 [sourcing-policy.md](../sourcing-policy.md) 4.1 발췌+논평 기준을 더 분명히 충족.
- 전문은 원문 링크로 유도(기사 페이지가 `원문 보기 · Netflix Tech Blog →` 렌더).
