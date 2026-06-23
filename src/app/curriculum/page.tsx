// =============================================================================
// 커리큘럼 (/curriculum)
// =============================================================================
// AX 학습 로드맵(6단계) + 기수/시즌 안내. 정적 데이터(@/data/curriculum) 기반.
// 레퍼런스 룩: .wrap 컨테이너 + .eyebrow/.page-title/.page-sub 헤더 + .sec 섹션
// + 흰 카드(var(--white)/var(--shadow)/var(--r)) + .chip/.badge + .join-cta + .btn.
// =============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { Chip, Badge, type BadgeTone } from "@/components/ui";
import { roadmap, cohorts } from "@/data/curriculum";

export const metadata: Metadata = {
  title: "커리큘럼 · The Formula",
  description:
    "AI를 도구로 쓰는 단계를 넘어, 나만의 업무 공식을 만드는 6단계 AX 학습 로드맵과 기수 안내.",
};

/** 모집 상태 → 배지 톤. 진행 중만 파랑(study), 나머지는 기본(.badge 회색). */
function statusTone(status: string): BadgeTone | undefined {
  return status === "진행 중" ? "study" : undefined;
}

export default function CurriculumPage() {
  return (
    <div className="wrap">
      {/* 헤더 */}
      <header style={{ textAlign: "center", marginBottom: 8 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          AX 학습 로드맵
        </div>
        <h1 className="page-title" style={{ fontSize: 30 }}>
          공부에서 공식까지, 6단계로 쌓아요
        </h1>
        <p className="page-sub" style={{ maxWidth: 560, margin: "8px auto 0" }}>
          마인드셋부터 검증된 결과를 나만의 공식으로 자산화하기까지. The Formula가
          함께 걷는 AX 실전 여정이에요.
        </p>
      </header>

      {/* 로드맵 타임라인 */}
      <section>
        <div className="sec">
          <h2>AX 로드맵</h2>
          <span className="more">단계마다 명확한 산출물</span>
        </div>

        <ol
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            listStyle: "none",
            padding: 0,
            margin: 0,
          }}
        >
          {roadmap.map((stage) => (
            <li
              key={stage.step}
              style={{
                background: "var(--white)",
                borderRadius: "var(--r)",
                boxShadow: "var(--shadow)",
                padding: 24,
                display: "flex",
                gap: 24,
                flexWrap: "wrap",
              }}
            >
              {/* 단계 마커 */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 6,
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "var(--r-sm)",
                    background: "var(--blue-weak)",
                    color: "var(--blue)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 18,
                  }}
                >
                  {stage.step}
                </span>
                <span
                  style={{ fontSize: 12, fontWeight: 600, color: "var(--t3)" }}
                >
                  {stage.duration}
                </span>
              </div>

              {/* 본문 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    letterSpacing: "-.02em",
                    color: "var(--t1)",
                  }}
                >
                  {stage.title}
                </h3>
                <p
                  style={{
                    marginTop: 8,
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: "var(--t2)",
                  }}
                >
                  {stage.summary}
                </p>

                <ul
                  style={{
                    marginTop: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    listStyle: "none",
                    padding: 0,
                  }}
                >
                  {stage.topics.map((topic) => (
                    <li
                      key={topic}
                      style={{
                        display: "flex",
                        gap: 10,
                        fontSize: 14,
                        color: "var(--t2)",
                        lineHeight: 1.55,
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          marginTop: 8,
                          width: 5,
                          height: 5,
                          flexShrink: 0,
                          borderRadius: "50%",
                          background: "var(--blue)",
                          opacity: 0.6,
                        }}
                      />
                      <span>{topic}</span>
                    </li>
                  ))}
                </ul>

                <div
                  style={{
                    marginTop: 16,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    borderRadius: "var(--r-sm)",
                    background: "var(--blue-weak)",
                    padding: "12px 16px",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: "var(--blue)",
                    }}
                  >
                    산출물
                  </span>
                  <span style={{ fontSize: 14, color: "var(--t1)" }}>
                    {stage.outcome}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 기수 · 시즌 안내 */}
      <section>
        <div className="sec">
          <h2>기수 · 시즌 안내</h2>
          <span className="more">시즌마다 주제를 달리해요</span>
        </div>

        <div className="feed-grid">
          {cohorts.map((cohort) => (
            <div
              key={cohort.name}
              style={{
                background: "var(--white)",
                borderRadius: "var(--r)",
                boxShadow: "var(--shadow)",
                padding: 24,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    letterSpacing: "-.02em",
                    color: "var(--t1)",
                  }}
                >
                  {cohort.name}
                </span>
                {statusTone(cohort.status) ? (
                  <Badge tone="study">{cohort.status}</Badge>
                ) : (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      padding: "4px 9px",
                      borderRadius: 7,
                      color: "var(--t3)",
                      background: "var(--bg-2)",
                      flexShrink: 0,
                    }}
                  >
                    {cohort.status}
                  </span>
                )}
              </div>

              <div style={{ marginTop: 12 }}>
                <Chip>{cohort.season}</Chip>
              </div>

              <p
                style={{
                  marginTop: 14,
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "var(--t2)",
                }}
              >
                {cohort.focus}
              </p>

              <dl
                style={{
                  marginTop: 18,
                  paddingTop: 14,
                  borderTop: "1px solid var(--border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  fontSize: 13,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <dt style={{ color: "var(--t3)" }}>기간</dt>
                  <dd
                    style={{
                      margin: 0,
                      fontWeight: 600,
                      color: "var(--t1)",
                    }}
                  >
                    {cohort.period}
                  </dd>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <dt style={{ color: "var(--t3)" }}>정원</dt>
                  <dd
                    style={{
                      margin: 0,
                      fontWeight: 600,
                      color: "var(--t1)",
                    }}
                  >
                    {cohort.capacity}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="join-cta">
        <div>
          <div className="jc-title">로드맵, 혼자 걷지 않아요</div>
          <div className="jc-sub">
            진행 중인 스터디에 합류해 같은 단계를 걷는 멤버들과 함께해요. 아직
            멤버가 아니라면 지원부터 시작하면 됩니다.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <Link href="/activities" className="btn btn-primary">
            진행 중인 스터디 보기
          </Link>
          <Link href="/apply" className="btn btn-ghost">
            지원하기
          </Link>
        </div>
      </div>
    </div>
  );
}
