// The Formula — 커리큘럼 정적 데이터 (AX 학습 로드맵 + 기수/시즌)
// 정적 콘텐츠. DB 의존 없음. 페이지에서 직접 import 합니다.

export type RoadmapStage = {
  /** 단계 번호 라벨 (예: "01") */
  step: string;
  /** 단계 제목 */
  title: string;
  /** 한 줄 요약 */
  summary: string;
  /** 학습 항목 */
  topics: string[];
  /** 이 단계에서 만들어지는 산출물 */
  outcome: string;
  /** 권장 소요 (해요체) */
  duration: string;
};

/** AX 실전 학습 로드맵 단계 (입문 → 자산화). */
export const roadmap: RoadmapStage[] = [
  {
    step: "01",
    title: "AX 마인드셋 잡기",
    summary:
      "AI를 '도구'가 아니라 '업무 설계의 재료'로 바라보는 관점을 익혀요.",
    topics: [
      "AX(AI Transformation)와 단순 도구 활용의 차이",
      "내 업무 흐름 분해하기 (input → 판단 → output)",
      "AI로 대체·증강 가능한 지점 찾기",
    ],
    outcome: "내 직무의 AX 기회 지도 1장",
    duration: "1주",
  },
  {
    step: "02",
    title: "프롬프트와 도구 다루기",
    summary:
      "원하는 결과를 안정적으로 뽑아내는 프롬프트 설계와 도구 선택을 연습해요.",
    topics: [
      "역할·맥락·제약을 담은 프롬프트 구조",
      "직무별 핵심 AI 도구 비교 (코드·문서·분석·기획·디자인)",
      "재사용 가능한 프롬프트 템플릿 만들기",
    ],
    outcome: "내 업무용 프롬프트 템플릿 3종",
    duration: "2주",
  },
  {
    step: "03",
    title: "워크플로우 자동화",
    summary:
      "한 번의 채팅을 넘어, 반복 업무를 끝까지 연결하는 흐름을 설계해요.",
    topics: [
      "여러 단계를 잇는 멀티스텝 워크플로우",
      "API·자동화 도구로 손 떼기 (no-code 포함)",
      "사람이 검토할 지점(휴먼 인 더 루프) 설계",
    ],
    outcome: "반복 업무 1건의 자동화 파이프라인",
    duration: "2주",
  },
  {
    step: "04",
    title: "검증과 측정",
    summary:
      "before/after를 숫자로 증명하고, 신뢰할 수 있는 결과인지 따져봐요.",
    topics: [
      "도입 전후 시간·품질·비용 측정 설계",
      "환각·오류를 잡아내는 검증 루프",
      "재현 가능한 실험으로 기록하기",
    ],
    outcome: "검증 리포트 (before → after)",
    duration: "1주",
  },
  {
    step: "05",
    title: "공식으로 추상화",
    summary:
      "검증된 결과를 다른 사람도 따라 할 수 있는 '공식'으로 정리해요.",
    topics: [
      "문제 → 적용과정 → 결과 양식으로 구조화",
      "도구·프롬프트·템플릿을 재사용 가능하게 패키징",
      "Archive에 공식 등록하고 피드백 받기",
    ],
    outcome: "Archive에 등록된 나만의 공식 1개",
    duration: "1주",
  },
  {
    step: "06",
    title: "확장과 공유",
    summary:
      "내 공식을 팀·커뮤니티로 퍼뜨리고, 다음 AX 주제로 이어가요.",
    topics: [
      "공식을 팀 단위로 이식하기",
      "다른 직무의 공식에서 인사이트 얻기",
      "다음 시즌 학습·프로젝트 주제 설계",
    ],
    outcome: "AX 포트폴리오 + 다음 시즌 계획",
    duration: "지속",
  },
];

export type Cohort = {
  /** 기수 (예: "1기") */
  name: string;
  /** 시즌 라벨 (예: "2026 Spring") */
  season: string;
  /** 진행 기간 */
  period: string;
  /** 상태 */
  status: "모집 마감" | "진행 중" | "모집 예정";
  /** 한 줄 소개 */
  focus: string;
  /** 정원 안내 */
  capacity: string;
};

/** 기수/시즌 안내. */
export const cohorts: Cohort[] = [
  {
    name: "1기",
    season: "2026 Spring",
    period: "2026.03 – 2026.05",
    status: "진행 중",
    focus: "AX 기본기 다지기 — 마인드셋부터 첫 공식 완성까지",
    capacity: "12명 운영",
  },
  {
    name: "2기",
    season: "2026 Summer",
    period: "2026.07 – 2026.09",
    status: "모집 예정",
    focus: "워크플로우 자동화 심화 — 직무별 트랙 운영",
    capacity: "16명 예정",
  },
  {
    name: "3기",
    season: "2026 Fall",
    period: "2026.10 – 2026.12",
    status: "모집 예정",
    focus: "팀 단위 AX 프로젝트 — 공식을 조직으로 확장",
    capacity: "추후 공개",
  },
];
