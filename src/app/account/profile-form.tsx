"use client";
// =============================================================================
// 계정 프로필 편집 폼 (Client) — updateProfile 서버액션 호출
// 레퍼런스 폼 클래스(.field/.form-grid/.title-input/.form-select/.chip/.btn) 리스킨.
// 데이터/로직 와이어링은 기존 그대로(상태 + updateProfile + router.refresh).
// =============================================================================
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { JOB_ROLES } from "@/lib/contract";
import { updateProfile } from "./actions";

export function ProfileForm({
  initial,
}: {
  initial: {
    name: string;
    role: string;
    jobRole: string | null;
    company: string | null;
    bio: string;
    interests: string[];
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initial.name);
  const [role, setRole] = useState(initial.role);
  const [jobRole, setJobRole] = useState<string>(initial.jobRole ?? "");
  const [company, setCompany] = useState(initial.company ?? "");
  const [bio, setBio] = useState(initial.bio);
  const [interests, setInterests] = useState<string[]>(initial.interests);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const addCustom = () => {
    const kw = custom.trim();
    if (!kw) return;
    if (!interests.includes(kw)) setInterests((prev) => [...prev, kw]);
    setCustom("");
  };

  const removeInterest = (kw: string) =>
    setInterests((prev) => prev.filter((x) => x !== kw));

  const submit = () => {
    setError(null);
    setSaved(false);
    if (!name.trim()) {
      setError("이름을 입력해 주세요.");
      return;
    }
    startTransition(async () => {
      const res = await updateProfile({
        name: name.trim(),
        role: role.trim(),
        jobRole: jobRole || null,
        company: company.trim() || null,
        bio: bio.trim(),
        interests,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <>
      <div className="write-step" style={{ marginTop: 28 }}>
        <span className="step-num">1</span>
        <h2 className="step-title">기본 정보를 입력해주세요</h2>
      </div>
      <div className="write-divider" />

      <div className="form-grid">
        <div className="field">
          <label htmlFor="acc-name">이름</label>
          <input
            id="acc-name"
            className="title-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름을 입력해주세요"
          />
        </div>
        <div className="field">
          <label htmlFor="acc-role">한 줄 소개 / 역할</label>
          <input
            id="acc-role"
            className="title-input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="예: 프로덕트 디자이너"
          />
        </div>
        <div className="field">
          <label htmlFor="acc-company">소속 (선택)</label>
          <input
            id="acc-company"
            className="title-input"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="회사 / 팀"
          />
        </div>
        <div className="field">
          <label htmlFor="acc-job">직무</label>
          <select
            id="acc-job"
            className="form-select"
            value={jobRole}
            onChange={(e) => setJobRole(e.target.value)}
          >
            <option value="">선택 안 함</option>
            {JOB_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field" style={{ marginTop: 18 }}>
        <label htmlFor="acc-bio">소개</label>
        <textarea
          id="acc-bio"
          className="title-input"
          style={{ height: "auto", minHeight: 120, padding: "14px", lineHeight: 1.6 }}
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="어떤 일을 하고, AI로 무엇을 만들고 있는지 적어 주세요."
        />
      </div>

      <div className="write-step" style={{ marginTop: 32 }}>
        <span className="step-num">2</span>
        <h2 className="step-title">관심 키워드를 골라주세요</h2>
      </div>
      <div className="write-divider" />

      {interests.length > 0 && (
        <div className="chips" style={{ marginBottom: 14 }}>
          {interests.map((kw) => (
            <span key={kw} className="chip">
              {kw}
              <button
                type="button"
                onClick={() => removeInterest(kw)}
                aria-label={`${kw} 제거`}
                style={{
                  marginLeft: 6,
                  color: "var(--t3)",
                  fontWeight: 700,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="field">
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
          placeholder="관심사 추가 후 Enter"
        />
      </div>

      {error && (
        <p className="auth-terms" style={{ color: "#E5484D", textAlign: "left" }} role="alert">
          {error}
        </p>
      )}
      {saved && !error && (
        <p
          className="auth-terms"
          style={{ color: "var(--green)", textAlign: "left" }}
          role="status"
        >
          저장했어요.
        </p>
      )}

      <div className="write-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={submit}
          disabled={pending}
        >
          {pending ? "저장 중…" : "변경사항 저장"}
        </button>
      </div>
    </>
  );
}
