// 매너온도 모델 self-test — DB 없이 목업 페르소나로 점수 분포 검증.
// 실행: npx tsx src/lib/trust.selftest.ts
import assert from "node:assert";
import type { ActivityStats, Tier } from "./contract";
import { breakdown, computeTrust, nextTier } from "./trust";

const base: ActivityStats = {
  visitCount: 0,
  commentCount: 0,
  formulaCount: 0,
  likesReceived: 0,
  projectCount: 0,
};

// 5단계 목업 페르소나 (신규 → 마스터). 기대 등급과 함께.
const personas: { name: string; expect: Tier; s: ActivityStats }[] = [
  {
    name: "새내기",
    expect: "sprout",
    s: { ...base, visitCount: 5, onboarded: true },
  },
  {
    name: "기여자",
    expect: "contributor",
    s: {
      ...base, onboarded: true, hasCompany: true,
      formulaCount: 3, likesReceived: 10, followerCount: 5,
      savesReceived: 4, commentCount: 3,
    },
  },
  {
    name: "활동가",
    expect: "activist",
    s: {
      ...base, onboarded: true, hasCompany: true,
      formulaCount: 5, verifiedFormulaCount: 1, completedActivityCount: 1,
      likesReceived: 20, followerCount: 15, savesReceived: 12,
      memberSaves: 3, commentsReceived: 5, commentCount: 4,
    },
  },
  {
    name: "빌더",
    expect: "builder",
    s: {
      ...base, onboarded: true, hasCompany: true, externalLinkCount: 2,
      formulaCount: 11, verifiedFormulaCount: 3, completedActivityCount: 3,
      likesReceived: 50, followerCount: 40, savesReceived: 35,
      memberSaves: 10, commentsReceived: 15, commentCount: 8,
    },
  },
  {
    name: "마스터",
    expect: "master",
    s: {
      ...base, onboarded: true, hasCompany: true, externalLinkCount: 2,
      formulaCount: 8, verifiedFormulaCount: 8, completedActivityCount: 6,
      likesReceived: 100, followerCount: 120, savesReceived: 90,
      // master 조건 = 완주5+검증3+하트50. 하트(memberSaves)는 50 이상이어야 master 진입.
      memberSaves: 60, commentsReceived: 40, commentCount: 20,
    },
  },
];

console.log("페르소나     온도     등급        다음등급까지   기대   판정");
console.log("─".repeat(64));
let allOk = true;
for (const p of personas) {
  const t = computeTrust(p.s);
  const nt = nextTier(t.trustScore);
  const ok = t.tier === p.expect;
  allOk = allOk && ok;
  const nextStr = nt.next ? `${nt.next.label} -${nt.gap}°` : "최고등급";
  console.log(
    `${p.name.padEnd(8)} ${String(t.trustScore).padStart(6)}°  ${t.band.emoji}${t.badgeLabel.padEnd(8)} ${nextStr.padEnd(14)} ${p.expect.padEnd(11)} ${ok ? "✓" : "✗ " + t.tier}`,
  );
}

// 단조성: 새내기 < 기여자 < 활동가 < 빌더 < 마스터
const scores = personas.map((p) => computeTrust(p.s).trustScore);
for (let i = 1; i < scores.length; i++) {
  assert(scores[i] > scores[i - 1], `단조성 위반: ${personas[i].name}(${scores[i]}) <= 이전(${scores[i - 1]})`);
}

// 회귀 가드: 공식 0개 + 대량 passive 신호(저장/하트/좋아요)는 등급조건(공식 작성)을 못 채워
// sprout 에 잠겨야 한다. cap 루프가 최상위(master)에서 먼저 break 하면 builder(81.9°)로 새던 버그 방지.
const passiveWhale = computeTrust({
  ...base, onboarded: true,
  savesReceived: 500, memberSaves: 500, likesReceived: 500, commentsReceived: 500,
});
assert(
  passiveWhale.tier === "sprout",
  `게이팅 누수: 공식 0개 passive whale 가 '${passiveWhale.tier}'(${passiveWhale.trustScore}°)로 샘 — sprout 여야 함`,
);
console.log(`\n[회귀 가드] 공식0+대량passive → ${passiveWhale.band.emoji}${passiveWhale.badgeLabel} ${passiveWhale.trustScore}° (sprout 잠금 OK)`);

// breakdown 예시 — 빌더의 "왜 이 온도?"
console.log("\n[빌더] 왜 이 온도? (기여 큰 순)");
const bd = breakdown(personas[3].s);
console.log(`  기본 체온 ${bd.base}°`);
for (const it of bd.items) {
  console.log(`  ${it.label.padEnd(16)} ${it.count ? it.count + "개" : ""}  +${it.points.toFixed(1)}°`);
}
console.log(`  → 매너온도 ${bd.score}° (raw합 ${bd.rawTotal}°, 감속곡선 적용)`);

console.log(`\n${allOk ? "✅ 모든 페르소나 기대 등급 일치" : "❌ 등급 불일치 — 경계/가중치 튜닝 필요"}`);
assert(allOk, "등급 분포 불일치");
console.log("✅ 단조성 OK (활동 많을수록 온도 높음)");
