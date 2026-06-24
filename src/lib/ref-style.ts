// 레퍼런스(formula-one-blond) 룩에 우리 데이터를 매핑하는 공유 헬퍼.
// 시그니처 고정 — 페이지/컴포넌트가 이 경로·이름·반환형에 의존한다.

import { isCategory, categories, type Category } from "@/lib/contract";

export type CoverClass = "cov-sage" | "cov-coral" | "cov-olive" | "cov-peach" | "cov-clay";
export type AvaClass = "ava-1" | "ava-2" | "ava-3" | "ava-4";

const COVERS: CoverClass[] = ["cov-sage", "cov-coral", "cov-olive", "cov-peach", "cov-clay"];
const AVAS: AvaClass[] = ["ava-1", "ava-2", "ava-3", "ava-4"];

// 우리 카테고리값(개발/디자인/PM/마케팅/데이터/AI/인사이트) → 커버 cov-* 고정 매핑.
// reference.css 5색에 7카테고리를 일관되게 배정(같은 카테고리는 항상 같은 색).
const COVER_BY_CATEGORY: Record<Category, CoverClass> = {
  dev: "cov-clay",
  design: "cov-coral",
  pm: "cov-sage",
  marketing: "cov-peach",
  data: "cov-olive",
  ai: "cov-sage",
  insight: "cov-olive",
};

// 한국어 라벨(기획/디자인/마케팅…)로 들어올 때도 같은 색으로 매핑되도록 역인덱스.
const COVER_BY_LABEL: Record<string, CoverClass> = Object.fromEntries(
  (Object.keys(COVER_BY_CATEGORY) as Category[]).map((c) => [
    categories[c].label,
    COVER_BY_CATEGORY[c],
  ]),
);

// 안정적인 문자열 → 양수 해시(djb2 변형). id/카테고리 기반 결정적 배정용.
function hash(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return Math.abs(h);
}

// 카테고리(우리 코드값/한국어 라벨/임의 키) → 카드 커버 색 클래스.
// 알려진 카테고리는 고정 매핑, 그 외는 해시로 5색에 안정 분산.
export function catToCover(category: string | null | undefined): CoverClass {
  const key = (category ?? "").trim();
  if (!key) return COVERS[0];
  if (isCategory(key)) return COVER_BY_CATEGORY[key];
  if (key in COVER_BY_LABEL) return COVER_BY_LABEL[key];
  return COVERS[hash(key) % COVERS.length];
}

// 사용자/엔티티 id → 아바타 그라데이션 클래스(ava-1..ava-4). hash(id)%4+1.
export function avaFor(id: string | null | undefined): AvaClass {
  const key = (id ?? "").trim();
  if (!key) return AVAS[0];
  return AVAS[hash(key) % AVAS.length];
}

// 이름 → 첫 글자(아바타 이니셜). 비어 있으면 'F'(Formula).
export function initialOf(name: string | null | undefined): string {
  const n = (name ?? "").trim();
  if (!n) return "F";
  return Array.from(n)[0]!.toUpperCase();
}

// 카운트 → '1k' / '3.8k' / '1.5m' 형태 축약. 1000 미만은 그대로.
export function fmtCount(n: number | null | undefined): string {
  const v = typeof n === "number" && isFinite(n) ? Math.trunc(n) : 0;
  if (v < 1000) return String(v);
  if (v < 1_000_000) {
    // 10k 미만은 소수 1자리(3.8k), 그 이상은 정수(12k)
    const k = v / 1000;
    const s = v < 10_000 ? k.toFixed(1) : Math.round(k).toString();
    return `${s.replace(/\.0$/, "")}k`;
  }
  const m = v / 1_000_000;
  const s = v < 10_000_000 ? m.toFixed(1) : Math.round(m).toString();
  return `${s.replace(/\.0$/, "")}m`;
}

// ISO 시각 → '방금 전' / 'N분 전' / 'N시간 전' / 'N일 전' / 'YYYY.MM.DD'.
export function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!isFinite(t)) return "";
  const sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 60) return "방금 전";
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}일 전`;
  const dt = new Date(t);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}
