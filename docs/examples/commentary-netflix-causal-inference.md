# 논평 모드 — 실제 예시 (Netflix, Agentic Causal Inference)

> 이 문서는 `techblog` 논평 모드의 **실제 산출 예시**입니다. Gemini API 키가 없는 환경이라,
> [commentary-guide.md](../commentary-guide.md)의 규칙을 사람이 직접 따라 작성해 enrich 출력을 대역(代役)했습니다.
> 실제 파이프라인에서는 `cardnews.ts`의 commentary 분기가 같은 규칙으로 이 결과를 생성합니다.

## 입력 (크롤러 → raw_article)

| 필드 | 값 |
|---|---|
| sourceName | Netflix Tech Blog |
| originalTitle | A Human-Augmenting Agentic Workflow for Causal Inference |
| sourceUrl | https://netflixtechblog.com/a-human-augmenting-agentic-workflow-for-causal-inference-4623f0a9c5af |
| rawContent | 16,494자 (RSS `content:encoded` 전문, 플레인텍스트) |
| coverImageUrl | https://cdn-images-1.medium.com/max/1024/1*7midjxNL3H3BlZvQy4seSA.png |
| kind | techblog → **논평 모드** |

수집 검증: `npm run crawl:check -- --only "Netflix Tech Blog" --lookback 60`

## 출력 (enrich → CardNews, 논평 모드)

**category**: `ai`

**keywords**: `인과추론`, `AI 에이전트`, `actor-critic`, `early adopter bias`, `Netflix`

**summary**:
> Netflix가 관찰적 인과추론(OCI)을 에이전트에게 맡기되 사람이 각 분석 단계를 검증할 수 있게 만든 'human-augmenting' 워크플로우를 공개하고, `oci-agent`를 오픈소스로 냈어요. 단순 프롬프트는 early adopter bias 같은 함정에 빠지지만, 진단과 trimming을 강제하는 scaffolding + actor-critic 루프를 거치면 훨씬 신뢰할 수 있는 추정이 나옵니다.

**body**:

```markdown
## 한눈에
Netflix가 "관찰 데이터로 인과효과를 추정하는 일(OCI)"을 AI 에이전트에게 맡기는 워크플로우를 공개했어요. 핵심은 자동화로 사람의 반복 작업을 줄이되, **각 단계를 사람이 들여다보고 재실행할 수 있게** 한 것. 표준 진단을 강제하는 scaffolding과 actor-critic 구조로, 단순 프롬프트보다 훨씬 신뢰할 수 있는 추정을 만듭니다. 워크플로우의 경량 버전은 오픈소스(`oci-agent`)로 공개됐습니다.

## 무엇을 다루나
관찰적 인과추론(OCI)은 A/B 테스트 없이 "X가 Y에 미친 인과효과"를 데이터로 추정하는 작업이라, 숨은 교란변수·편향 처리에 전문 판단이 필요합니다. Netflix는 기존(pre-AI) OCI 툴킷의 "target trial emulation" 철학 위에, 에이전트가 따라야 할 4가지 설계 진단을 박아 넣었어요 — **공변량 균형, overlap(성향점수 0.1~0.9), placebo 검정, 숨은 교란변수 민감도**.

워크플로우는 세 페르소나로 돕니다: 분석 목표·맥락·도구를 주는 **Principal(사람)**, 분석과 진단을 수행하는 **Actor**, 결과를 종합하고 결함을 지적하는 **Critic**. Actor-Critic 루프죠.

평가가 까다로운 이유를 글은 이렇게 짚습니다:
> "인위적으로 시뮬레이션한 데이터 밖에서는, 관찰적 인과추론에 정답(ground truth)이 존재하지 않는다."

그래서 정답 대비가 아니라, 에이전트가 남긴 산출물(계획·명세·플롯·노트북)을 사람이 검증·재실행하는 **'프로세스 감사'**로 신뢰를 쌓습니다.

사례가 인상적이에요. 새 엔터테인먼트 타입(Type X)이 2개월 retention에 주는 효과를 물었더니, scaffolding 없이 Claude Sonnet 4.6에 그냥 맡긴 baseline은 그럴듯한 회귀 결과를 냈지만, 같은 모델을 paved-path 워크플로우로 돌리자 추정치가 **baseline의 25% 수준**으로 떨어졌습니다. 원인은 early adopter bias로 인한 나쁜 overlap. Critic이 placebo 검정 실패까지 잡아냈고, Crump-style trimming([0.1, 0.9])으로 신뢰도를 회복했습니다.

## 왜 중요한가 / 실무 시사점
- "에이전트가 자신 있게 답을 줬다"가 곧 "맞다"가 아니라는 걸 사례로 보여줍니다. **scaffolding(강제된 진단·플레이북)이 모델 성능보다 결과 신뢰도를 좌우**합니다 — ACIC 데이터에서 scaffolding이 있으면 10개 중 9개 정답을 회복했지만, one-shot 프롬프트는 일관되게 틀렸습니다.
- LLM 에이전트를 분석·의사결정에 붙이는 팀이라면, **결과(outcome)가 아니라 과정(process)을 감사**하는 구조가 현실적 해법이라는 점이 참고할 만합니다. 정답이 없는 도메인일수록 더요.
- actor-critic으로 "수행"과 "검증"을 분리한 설계는 일반적인 에이전트 파이프라인에도 이식 가능한 패턴입니다.

## 한계 · 생각할 점
- 공개 평가는 **합성(ACIC) 데이터** 기반이라, 실제 업무의 의미 이해·도메인 성능은 압박 테스트하지 못했다고 저자도 인정합니다.
- 진단·trimming은 추정 대상(estimand)을 "overlap 되는 모집단의 ATE"로 좁히는 트레이드오프가 있어, 결과 해석 시 이 범위를 분명히 해야 합니다.

> 전문은 원문 출처에서 확인하세요.
```

## 이 결과가 소싱 정책에 부합하는 이유

- 본문 대부분이 **에디터의 한국어 재서술·해석**이고, 원문 직접 인용은 **짧은 1개**(정답 부재 문장)뿐 — 전문 복제·전문 번역이 아님.
- "왜 중요한가 / 한계" 섹션처럼 **논평·실무 해석이 주(主)**.
- 전문은 원문으로 유도(링크는 기사 페이지가 `원문 보기 · Netflix Tech Blog →`로 렌더).
- → [sourcing-policy.md](../sourcing-policy.md) 4.1의 발췌+논평 기준 충족.
