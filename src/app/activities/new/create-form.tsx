"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createActivity } from "@/app/actions";
import type { ActivityType } from "@/lib/contract";

/** 모임 모집글 작성 폼. 레퍼런스 write 스킨(write-step/form-grid/field) + createActivity 와이어. */
export function CreateActivityForm() {
  const [type, setType] = useState<ActivityType>("study");
  const [capacityOpt, setCapacityOpt] = useState("0");
  const [season, setSeason] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (title.trim().length < 2) {
      setError("제목을 2자 이상 입력해 주세요.");
      return;
    }
    if (summary.trim().length < 2) {
      setError("한 줄 소개를 입력해 주세요.");
      return;
    }
    if (description.trim().length < 2) {
      setError("모임 소개를 입력해 주세요.");
      return;
    }

    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 8);
    const capacityNum = Number(capacityOpt);

    startTransition(async () => {
      // 성공 시 createActivity 내부에서 redirect(throw) → 아래 결과는 실패만 도달.
      const res = await createActivity({
        type,
        title: title.trim(),
        summary: summary.trim(),
        description: description.trim(),
        tags,
        capacity: Number.isFinite(capacityNum) ? capacityNum : 0,
        season: season.trim() || null,
      });
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="write-step" style={{ marginTop: "8px" }}>
        <span className="step-num">1</span>
        <h2 className="step-title">기본 정보를 입력해주세요</h2>
      </div>
      <div className="write-divider" />
      <div className="form-grid">
        <div className="field">
          <label htmlFor="wt-type">모집 구분</label>
          <select
            id="wt-type"
            className="form-select"
            value={type}
            onChange={(e) => setType(e.target.value as ActivityType)}
            disabled={pending}
          >
            <option value="study">스터디</option>
            <option value="project">프로젝트</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="wt-cap">모집 인원</label>
          <select
            id="wt-cap"
            className="form-select"
            value={capacityOpt}
            onChange={(e) => setCapacityOpt(e.target.value)}
            disabled={pending}
          >
            <option value="0">인원 미정</option>
            <option value="3">2~3명</option>
            <option value="6">4~6명</option>
            <option value="10">7~10명</option>
            <option value="20">10명 이상</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="wt-season">기수 · 시즌</label>
          <input
            id="wt-season"
            className="title-input"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            maxLength={40}
            placeholder="예: 2026 여름 시즌 (선택)"
            disabled={pending}
          />
        </div>

        <div className="field">
          <label htmlFor="wt-tags">사용 도구 · 태그</label>
          <input
            id="wt-tags"
            className="title-input"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="예: GPT, Notion, Figma (쉼표로 구분)"
            disabled={pending}
          />
        </div>
      </div>

      <div className="write-step" style={{ marginTop: "36px" }}>
        <span className="step-num">2</span>
        <h2 className="step-title">모집 글을 소개해주세요</h2>
      </div>
      <div className="write-divider" />

      <div className="field" style={{ marginBottom: "16px" }}>
        <label htmlFor="wt-title">제목</label>
        <input
          id="wt-title"
          className="title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="글 제목을 입력해주세요!"
          disabled={pending}
        />
      </div>

      <div className="field" style={{ marginBottom: "16px" }}>
        <label htmlFor="wt-summary">한 줄 소개</label>
        <input
          id="wt-summary"
          className="title-input"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          maxLength={200}
          placeholder="목록에 보이는 짧은 소개예요."
          disabled={pending}
        />
      </div>

      <div className="field">
        <label htmlFor="wt-desc">모임 소개</label>
        <textarea
          id="wt-desc"
          className="title-input"
          style={{
            height: "auto",
            minHeight: "200px",
            padding: "14px",
            lineHeight: 1.7,
            resize: "vertical",
          }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={4000}
          placeholder="모집 내용을 자유롭게 적어주세요. 어떤 사람과, 무엇을, 어떻게 만들고 싶은지 적으면 더 좋아요."
          disabled={pending}
        />
      </div>

      {error && (
        <p style={{ color: "#E5484D", fontSize: "14px", marginTop: "16px" }}>
          {error}
        </p>
      )}

      <div className="write-actions">
        <Link href="/activities" className="btn btn-ghost">
          취소
        </Link>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "등록 중…" : "등록하기"}
        </button>
      </div>
    </form>
  );
}
