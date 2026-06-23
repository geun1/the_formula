"use client";
// =============================================================================
// 온보딩 폼 (Client) — 직무 선택 + 관심 키워드 → completeOnboarding → /
// 레퍼런스 리스킨: 기본정보 .form-grid, 관심 분야 .chips(.chip 토글), .btn.
// 데이터/로직(상태 + completeOnboarding + router) 기존 그대로.
// =============================================================================
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { JOB_ROLES } from "@/lib/contract";
import { completeOnboarding } from "@/app/actions";

const SUGGESTED_INTERESTS = [
  "프롬프트",
  "자동화",
  "데이터분석",
  "글쓰기",
  "코드리뷰",
  "기획",
  "디자인시스템",
  "마케팅카피",
  "RAG",
  "에이전트",
  "워크플로우",
  "리서치",
];

export function OnboardingForm({
  initialJobRole,
  initialInterests,
}: {
  initialJobRole: string | null;
  initialInterests: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [jobRole, setJobRole] = useState<string>(initialJobRole ?? "");
  const [interests, setInterests] = useState<string[]>(initialInterests);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);

  const toggleInterest = (kw: string) => {
    setInterests((prev) =>
      prev.includes(kw) ? prev.filter((x) => x !== kw) : [...prev, kw],
    );
  };

  const addCustom = () => {
    const kw = custom.trim();
    if (!kw) return;
    if (!interests.includes(kw)) setInterests((prev) => [...prev, kw]);
    setCustom("");
  };

  const allChips = Array.from(new Set([...SUGGESTED_INTERESTS, ...interests]));

  const submit = () => {
    setError(null);
    if (!jobRole) {
      setError("직무를 선택해 주세요.");
      return;
    }
    startTransition(async () => {
      const res = await completeOnboarding({ jobRole, interests });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/");
      router.refresh();
    });
  };

  return (
    <>
      {/* 1. 기본 정보 — 직무 */}
      <div className="write-step" style={{ marginTop: 32 }}>
        <span className="step-num">1</span>
        <h2 className="step-title">어떤 일을 하고 계세요?</h2>
      </div>
      <div className="write-divider" />
      <p className="page-sub" style={{ marginTop: 0, marginBottom: 16 }}>
        직무에 맞춰 피드와 추천 공식을 골라 드려요.
      </p>
      <div className="field" style={{ maxWidth: 420 }}>
          <label htmlFor="onb-job">직무</label>
          <select
            id="onb-job"
            className="form-select"
            value={jobRole}
            onChange={(e) => setJobRole(e.target.value)}
          >
            <option value="">직무를 선택해주세요</option>
            {JOB_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
      </div>

      {/* 2. 관심 분야 — chips grid (view-04 style) */}
      <div className="write-step" style={{ marginTop: 36 }}>
        <span className="step-num">2</span>
        <h2 className="step-title">어떤 주제에 관심 있으세요?</h2>
      </div>
      <div className="write-divider" />
      <p className="page-sub" style={{ marginTop: 0, marginBottom: 16 }}>
        여러 개 골라도 좋아요. 나중에 계정에서 바꿀 수 있어요.
      </p>
      <div className="chips">
        {allChips.map((kw) => {
          const active = interests.includes(kw);
          return (
            <button
              key={kw}
              type="button"
              onClick={() => toggleInterest(kw)}
              aria-pressed={active}
              className={active ? "chip tool" : "chip"}
            >
              {active ? "✓ " : ""}
              {kw}
            </button>
          );
        })}
      </div>

      <div className="field" style={{ marginTop: 18, maxWidth: 420 }}>
        <input
          className="title-input"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="직접 추가 후 Enter"
        />
      </div>

      {error && (
        <p
          className="auth-terms"
          style={{ color: "#E5484D", textAlign: "left" }}
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="write-actions" style={{ justifyContent: "flex-start" }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={submit}
          disabled={pending}
        >
          {pending ? "저장 중…" : "시작하기"}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            router.push("/");
            router.refresh();
          }}
          disabled={pending}
        >
          나중에 할게요
        </button>
      </div>
    </>
  );
}
