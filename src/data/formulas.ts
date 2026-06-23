export interface Formula {
  id: string;
  title: string;
  category: "dev" | "design" | "pm" | "marketing" | "data";
  author: string;
  problem: string;
  tools: string[];
  timeSaved: string;
  hypothesis: string;
  process: string;
  result: string;
  tags: string[];
}

export const categories = {
  dev: { label: "개발", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  design: { label: "디자인", color: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
  pm: { label: "PM", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  marketing: { label: "마케팅", color: "bg-green-500/10 text-green-400 border-green-500/20" },
  data: { label: "데이터", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
};

export const formulas: Formula[] = [
  {
    id: "refactoring-legacy-api",
    title: "레거시 API 리팩토링 자동화",
    category: "dev",
    author: "송근일",
    problem: "200개 이상의 레거시 API 엔드포인트를 새 아키텍처로 마이그레이션해야 하는 상황",
    tools: ["Claude Code", "Cursor", "AST Parser"],
    timeSaved: "3주 → 4일",
    hypothesis: "AI에게 패턴을 학습시킨 뒤 반복 변환을 자동화하면 수작업 대비 80% 이상 시간을 절감할 수 있다",
    process: "1. 기존 API 5개를 수동으로 리팩토링하며 패턴 문서화\n2. Claude에 패턴과 컨벤션을 컨텍스트로 제공\n3. 나머지 API를 배치 단위로 변환 + 코드리뷰\n4. 테스트 코드도 동일 패턴으로 자동 생성",
    result: "전체 API 마이그레이션을 4일 만에 완료. 수동 대비 에러율도 낮음 (AI가 일관된 패턴 적용)",
    tags: ["리팩토링", "자동화", "코드 마이그레이션"],
  },
  {
    id: "design-system-token",
    title: "디자인 시스템 토큰 자동 추출",
    category: "design",
    author: "김민서",
    problem: "Figma 디자인 시스템에서 개발용 토큰을 수동으로 정리하는 데 매주 반나절 소요",
    tools: ["ChatGPT", "Figma API", "Style Dictionary"],
    timeSaved: "4시간 → 15분",
    hypothesis: "Figma API로 추출한 raw 데이터를 AI로 정규화하면 수작업 없이 토큰 파일을 생성할 수 있다",
    process: "1. Figma API로 컬러/타이포/스페이싱 데이터 자동 추출\n2. GPT에게 네이밍 컨벤션 규칙과 함께 정규화 요청\n3. Style Dictionary 포맷으로 자동 변환\n4. PR 자동 생성까지 파이프라인 구축",
    result: "매주 4시간이 걸리던 토큰 업데이트가 커맨드 하나로 15분 내 완료",
    tags: ["디자인 시스템", "자동화", "Figma"],
  },
  {
    id: "user-research-synthesis",
    title: "사용자 인터뷰 분석 자동화",
    category: "pm",
    author: "이준호",
    problem: "20건의 사용자 인터뷰 녹취록을 분석하고 인사이트를 도출하는 데 1주일 소요",
    tools: ["Claude", "Notion AI", "Dovetail"],
    timeSaved: "5일 → 1일",
    hypothesis: "인터뷰 녹취록을 구조화된 프롬프트로 분석하면 핵심 패턴과 인사이트를 빠르게 추출할 수 있다",
    process: "1. 녹취록을 일관된 포맷으로 정리 (발화자/맥락/감정 태깅)\n2. Claude에 분석 프레임워크(Jobs-to-be-done) 적용하여 패턴 추출\n3. 반복 등장하는 pain point 자동 클러스터링\n4. 인사이트별 근거 인용과 함께 리포트 생성",
    result: "20건 인터뷰에서 5개 핵심 인사이트를 하루 만에 도출. 팀 리뷰에서 수동 분석 대비 누락 없음 확인",
    tags: ["사용자 리서치", "인터뷰 분석", "PM"],
  },
  {
    id: "content-ab-testing",
    title: "마케팅 카피 A/B 테스트 가속화",
    category: "marketing",
    author: "박서연",
    problem: "광고 카피 20개 시안 작성 + A/B 테스트 세팅에 매번 3일 소요",
    tools: ["GPT-4", "Google Ads API", "Custom Script"],
    timeSaved: "3일 → 3시간",
    hypothesis: "기존 고성과 카피의 패턴을 AI에 학습시키면 승률 높은 시안을 대량 생성할 수 있다",
    process: "1. 지난 6개월 광고 데이터에서 CTR 상위 20% 카피 추출\n2. GPT에 고성과 패턴(후킹/베네핏/CTA)을 분석시킴\n3. 패턴 기반으로 40개 시안 생성 후 상위 20개 선별\n4. Google Ads API로 A/B 테스트 자동 세팅",
    result: "카피 생산성 10배 향상. AI 생성 카피의 CTR이 기존 수동 카피 대비 평균 12% 높음",
    tags: ["마케팅", "A/B 테스트", "카피라이팅"],
  },
  {
    id: "data-pipeline-monitoring",
    title: "데이터 파이프라인 이상 탐지 자동화",
    category: "data",
    author: "정하윤",
    problem: "데이터 파이프라인 모니터링에 매일 1시간을 쓰지만 이상 징후를 놓치는 경우 빈번",
    tools: ["Claude", "Grafana", "Python"],
    timeSaved: "일 1시간 → 알림만 확인",
    hypothesis: "AI가 과거 이상 패턴을 학습하면 룰 기반보다 정확한 이상 탐지가 가능하다",
    process: "1. 과거 6개월 장애 로그와 정상 패턴 데이터 수집\n2. Claude로 이상 탐지 규칙 초안 작성 (통계적 방법 + 패턴 매칭)\n3. Python 스크립트로 실시간 모니터링 구현\n4. Grafana 대시보드 + Slack 알림 연동",
    result: "수동 모니터링 제거. 이상 탐지 정확도 95% 이상, 오탐률 기존 대비 60% 감소",
    tags: ["데이터 엔지니어링", "모니터링", "자동화"],
  },
  {
    id: "crud-feature-generation",
    title: "반복 CRUD 기능 초고속 개발",
    category: "dev",
    author: "송근일",
    problem: "관리자 페이지 내 유사한 CRUD 화면 15개를 개발해야 하는 상황",
    tools: ["Cursor", "Claude Code"],
    timeSaved: "2주 → 2일",
    hypothesis: "하나의 완성된 CRUD 모듈을 템플릿으로 AI에게 제공하면 나머지를 정확히 복제/변형할 수 있다",
    process: "1. 가장 복잡한 CRUD 모듈 1개를 직접 완성 (테스트 포함)\n2. 해당 코드를 레퍼런스로 AI에게 나머지 엔티티별 변형 요청\n3. 엔티티별 비즈니스 로직 차이만 수동 조정\n4. E2E 테스트도 동일 패턴으로 자동 생성",
    result: "15개 CRUD 모듈을 2일 만에 완성. 코드 일관성도 수동 대비 훨씬 높음",
    tags: ["CRUD", "코드 생성", "생산성"],
  },
];
