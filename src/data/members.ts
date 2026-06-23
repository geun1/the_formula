export interface Member {
  id: string;
  name: string;
  role: string;
  company: string;
  bio: string;
  interests: string[];
  formulaId?: string;
  cohort: number;
  avatar: string;
}

export const members: Member[] = [
  {
    id: "geun1",
    name: "송근일",
    role: "Backend Developer",
    company: "Tech Startup",
    bio: "AI를 활용한 개발 프로세스 혁신에 진심인 백엔드 개발자. 복잡한 시스템을 AI로 더 빠르고 정확하게 만드는 방법을 연구합니다.",
    interests: ["AI-Assisted Development", "System Architecture", "DevOps"],
    formulaId: "refactoring-legacy-api",
    cohort: 1,
    avatar: "GI",
  },
  {
    id: "ms_go",
    name: "ms_go",
    role: "PM / Strategist",
    company: "IT Company",
    bio: "실질적인 효용성을 최우선으로 생각하는 전략가. 프로젝트의 방향성을 잡고 팀의 시너지를 극대화하는 역할을 합니다.",
    interests: ["Product Strategy", "AX Transformation", "Community Building"],
    cohort: 1,
    avatar: "MS",
  },
  {
    id: "minseo",
    name: "김민서",
    role: "Product Designer",
    company: "Design Studio",
    bio: "디자인 시스템과 AI의 접점을 탐구하는 프로덕트 디자이너. 반복 작업을 자동화하고 크리에이티브에 집중합니다.",
    interests: ["Design System", "AI Tools", "UX Research"],
    formulaId: "design-system-token",
    cohort: 1,
    avatar: "MS",
  },
  {
    id: "junho",
    name: "이준호",
    role: "Product Manager",
    company: "Series B Startup",
    bio: "데이터 기반 의사결정과 AI를 결합해 제품을 만드는 PM. 사용자 리서치부터 스펙 작성까지 AI를 업무 전반에 녹여냅니다.",
    interests: ["User Research", "Data-driven PM", "AI Productivity"],
    formulaId: "user-research-synthesis",
    cohort: 1,
    avatar: "JH",
  },
  {
    id: "seoyeon",
    name: "박서연",
    role: "Growth Marketer",
    company: "E-commerce",
    bio: "퍼포먼스 마케팅에 AI를 접목시켜 성과를 극대화하는 그로스 마케터. 데이터와 크리에이티브의 균형을 추구합니다.",
    interests: ["Performance Marketing", "AI Copywriting", "Growth Hacking"],
    formulaId: "content-ab-testing",
    cohort: 1,
    avatar: "SY",
  },
  {
    id: "hayoon",
    name: "정하윤",
    role: "Data Engineer",
    company: "Fintech",
    bio: "데이터 인프라와 AI 모니터링 자동화를 담당하는 데이터 엔지니어. 안정적인 파이프라인 운영의 달인을 꿈꿉니다.",
    interests: ["Data Pipeline", "MLOps", "Automation"],
    formulaId: "data-pipeline-monitoring",
    cohort: 1,
    avatar: "HY",
  },
];
