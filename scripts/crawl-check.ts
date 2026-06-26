// =============================================================================
// 크롤 단독 검증 — DB/Gemini 없이 crawlSources() 결과를 콘솔에 출력.
// =============================================================================
// crawler.ts 는 ingest.ts 를 `import type` 로만 참조하므로 런타임에 DB 연결이
// 일어나지 않는다(타입은 빌드 시 소거). 따라서 환경변수 없이 크롤만 검증 가능.
//
// 사용:
//   npm run crawl:check                                  # 전체 소스, lookback 30일
//   npm run crawl:check -- --only "Netflix Tech Blog,Meta Engineering"
//   npm run crawl:check -- --lookback 60 --per 12
//   npm run crawl:check -- --no-filter                   # AI 관련성 필터 끄고 원본 수율 확인
// =============================================================================
import { crawlSources } from "@/lib/crawler";
import { SOURCES } from "@/lib/sources";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (name: string) => process.argv.includes(`--${name}`);

const only = arg("only")
  ?.split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const lookbackDays = Number(arg("lookback") ?? 30);
const maxPerSource = Number(arg("per") ?? 8);
const filterRelevance = !has("no-filter");

async function main() {
  const names = only ?? SOURCES.map((s) => s.name);
  console.log(
    `\n크롤 검증 — 소스 ${names.length}개, lookback ${lookbackDays}일, ` +
      `per ${maxPerSource}, AI필터 ${filterRelevance ? "ON" : "OFF"}\n`,
  );

  const t0 = Date.now();
  const { inputs, perSource, fullFetched } = await crawlSources({
    only,
    lookbackDays,
    maxPerSource,
    filterRelevance,
    totalCap: 200,
    fullText: true,
  });

  console.log("── 소스별 (fetched=피드 항목수, kept=필터 통과) ──");
  for (const p of perSource) {
    const err = p.error ? `  ERR: ${p.error}` : "";
    console.log(
      `  ${p.name.padEnd(24)} fetched=${String(p.fetched).padStart(3)}  ` +
        `kept=${String(p.kept).padStart(3)}${err}`,
    );
  }
  console.log(
    `\n전문 추출 보강 ${fullFetched}건 · 총 수집 ${inputs.length}건 · ${Date.now() - t0}ms\n`,
  );

  console.log("── 수집 항목 (img=커버 있음, 숫자=본문 글자수) ──");
  for (const a of inputs) {
    const tag = a.coverImageUrl ? "img" : "   ";
    console.log(
      `  [${tag}] [${a.sourceName}] ${a.originalTitle.slice(0, 72)}`,
    );
    console.log(`        ${a.rawContent.length}자  ${a.sourceUrl}`);
  }
  console.log();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
