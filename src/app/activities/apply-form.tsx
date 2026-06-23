"use client";

import { useState, useTransition } from "react";
import { applyToActivity } from "@/app/actions";

export type ApplyFormProps = {
  activityId: string;
};

/** 모임 지원 폼. applyToActivity 서버액션 호출 후 상태 피드백. */
export function ApplyForm({ activityId }: ApplyFormProps) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const trimmed = message.trim();
    if (trimmed.length < 1) {
      setError("지원 메시지를 입력해 주세요.");
      return;
    }
    startTransition(async () => {
      const res = await applyToActivity(activityId, trimmed);
      if (res.ok) {
        setDone(true);
        setMessage("");
      } else {
        setError(res.error);
      }
    });
  }

  if (done) {
    return (
      <p
        className="md-section-body"
        style={{
          background: "var(--blue-weak)",
          color: "var(--blue)",
          borderRadius: "12px",
          padding: "16px 18px",
          fontWeight: 600,
        }}
      >
        지원이 접수됐어요. 모임장이 확인하면 알려드릴게요.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="apply-message">지원 메시지</label>
        <textarea
          id="apply-message"
          className="title-input"
          style={{
            height: "auto",
            minHeight: "120px",
            padding: "14px",
            lineHeight: 1.7,
            resize: "vertical",
          }}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={1000}
          placeholder="어떤 점이 끌렸는지, 어떻게 기여할 수 있을지 적어주세요."
          disabled={pending}
        />
      </div>
      {error && (
        <p style={{ color: "#E5484D", fontSize: "14px", marginTop: "10px" }}>
          {error}
        </p>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "14px",
        }}
      >
        <span style={{ fontSize: "12px", color: "var(--t3)" }}>
          {message.length}/1000
        </span>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "지원 중…" : "지원하기"}
        </button>
      </div>
    </form>
  );
}
