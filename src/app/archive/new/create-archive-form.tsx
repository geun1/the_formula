"use client";

import { useMemo, useState, useTransition } from "react";
import { createArchive } from "@/app/actions";
import {
  CATEGORIES,
  DIFFICULTIES,
  categories,
  type Category,
  type Difficulty,
} from "@/lib/contract";

/** 참고 아티클 선택 옵션(서버에서 주입). */
export type ArticleOption = {
  id: string;
  title: string;
  sourceName: string | null;
};

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  beginner: "입문",
  intermediate: "중급",
  advanced: "고급",
};

const WORK_TYPES = ["코드", "문서", "분석", "기획", "디자인", "마케팅"];

/** 멀티라인 입력은 .title-input 스킨(bg-2 라운드 박스)에 맞춰 높이만 키운다. */
const areaStyle: React.CSSProperties = {
  height: "auto",
  minHeight: 96,
  padding: "14px",
  lineHeight: 1.65,
  resize: "vertical",
};

function splitList(raw: string, max: number): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, max);
}

export function CreateArchiveForm({
  articles,
  prefill,
}: {
  articles: ArticleOption[];
  prefill: ArticleOption | null;
}) {
  // 기본 정보
  const [title, setTitle] = useState("");
  const [oneLiner, setOneLiner] = useState("");
  const [category, setCategory] = useState<Category>("dev");
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediate");
  const [workType, setWorkType] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");

  // 공식 본문
  const [problem, setProblem] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [toolsRaw, setToolsRaw] = useState("");
  const [prompt, setPrompt] = useState("");
  const [process, setProcess] = useState("");
  const [result, setResult] = useState("");
  const [timeSaved, setTimeSaved] = useState("");

  // 참고 아티클 연결
  const [relatedArticleId, setRelatedArticleId] = useState<string>(
    prefill?.id ?? "",
  );

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const articleLabel = useMemo(() => {
    const map = new Map(articles.map((a) => [a.id, a]));
    return (id: string) => {
      const a = map.get(id);
      if (!a) return "";
      return a.sourceName ? `${a.title} · ${a.sourceName}` : a.title;
    };
  }, [articles]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (title.trim().length < 2) {
      setError("제목을 2자 이상 입력해 주세요.");
      return;
    }
    if (!problem.trim()) {
      setError("문제 상황을 입력해 주세요.");
      return;
    }
    if (!hypothesis.trim()) {
      setError("가설을 입력해 주세요.");
      return;
    }
    if (!process.trim()) {
      setError("적용 과정을 입력해 주세요.");
      return;
    }
    if (!result.trim()) {
      setError("결과를 입력해 주세요.");
      return;
    }

    const tags = splitList(tagsRaw, 8);
    const tools = splitList(toolsRaw, 12);

    startTransition(async () => {
      // 성공 시 createArchive 내부에서 /formula/[id] 로 redirect(throw) →
      // 아래 결과는 실패만 도달.
      const res = await createArchive({
        title: title.trim(),
        oneLiner: oneLiner.trim() || null,
        category,
        tags,
        difficulty,
        workType: workType.trim() || null,
        formula: {
          problem: problem.trim(),
          hypothesis: hypothesis.trim(),
          tools,
          prompt: prompt.trim() || null,
          process: process.trim(),
          result: result.trim(),
          timeSaved: timeSaved.trim(),
        },
        relatedArticleId: relatedArticleId || null,
      });
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <form onSubmit={onSubmit} style={{ marginTop: 28 }}>
      {/* STEP 1 — 기본 정보 */}
      <div className="write-step">
        <span className="step-num">1</span>
        <h2 className="step-title">기본 정보를 입력해주세요</h2>
      </div>
      <div className="write-divider" />

      <div className="field" style={{ marginBottom: 16 }}>
        <label htmlFor="title">제목</label>
        <input
          id="title"
          className="title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="예: 회의록 요약을 5분 만에 끝낸 프롬프트"
          disabled={pending}
        />
      </div>

      <div className="field" style={{ marginBottom: 16 }}>
        <label htmlFor="oneLiner">한 줄 요약 (선택)</label>
        <input
          id="oneLiner"
          className="title-input"
          value={oneLiner}
          onChange={(e) => setOneLiner(e.target.value)}
          maxLength={200}
          placeholder="카드와 상세 상단에 보이는 짧은 소개예요."
          disabled={pending}
        />
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="category">카테고리</label>
          <select
            id="category"
            className="form-select"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            disabled={pending}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {categories[c].label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="difficulty">난이도</label>
          <select
            id="difficulty"
            className="form-select"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            disabled={pending}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {DIFFICULTY_LABEL[d]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="workType">업무유형 (선택)</label>
          <select
            id="workType"
            className="form-select"
            value={workType}
            onChange={(e) => setWorkType(e.target.value)}
            disabled={pending}
          >
            <option value="">선택 안 함</option>
            {WORK_TYPES.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="tags">태그 (선택, 쉼표로 구분)</label>
          <input
            id="tags"
            className="title-input"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="예: 프롬프트, 자동화, 요약"
            disabled={pending}
          />
        </div>
      </div>

      {/* 참고 아티클 연결 */}
      <div className="field" style={{ marginTop: 16 }}>
        <label htmlFor="relatedArticle">참고한 아티클 (선택)</label>
        <select
          id="relatedArticle"
          className="form-select"
          value={relatedArticleId}
          onChange={(e) => setRelatedArticleId(e.target.value)}
          disabled={pending}
        >
          <option value="">연결 안 함</option>
          {articles.map((a) => (
            <option key={a.id} value={a.id}>
              {articleLabel(a.id)}
            </option>
          ))}
        </select>
        {prefill && relatedArticleId === prefill.id && (
          <p className="ci-hint" style={{ marginTop: 6 }}>
            ✦ &quot;{prefill.title}&quot; 아티클을 참고로 연결했어요.
          </p>
        )}
      </div>

      {/* STEP 2 — 공식 내용 */}
      <div className="write-step" style={{ marginTop: 36 }}>
        <span className="step-num">2</span>
        <h2 className="step-title">공식을 적어주세요</h2>
      </div>
      <div className="write-divider" />

      <div className="field" style={{ marginBottom: 16 }}>
        <label htmlFor="problem">1. 문제 상황</label>
        <textarea
          id="problem"
          className="title-input"
          style={areaStyle}
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          maxLength={2000}
          placeholder="어떤 일을 더 가볍게 만들고 싶었나요?"
          disabled={pending}
        />
      </div>

      <div className="field" style={{ marginBottom: 16 }}>
        <label htmlFor="hypothesis">2. 가설</label>
        <textarea
          id="hypothesis"
          className="title-input"
          style={areaStyle}
          value={hypothesis}
          onChange={(e) => setHypothesis(e.target.value)}
          maxLength={2000}
          placeholder="이렇게 하면 되지 않을까? 생각한 접근이에요."
          disabled={pending}
        />
      </div>

      <div className="field" style={{ marginBottom: 16 }}>
        <label htmlFor="tools">3. 사용한 도구 (쉼표로 구분)</label>
        <input
          id="tools"
          className="title-input"
          value={toolsRaw}
          onChange={(e) => setToolsRaw(e.target.value)}
          placeholder="예: ChatGPT, Notion, Zapier"
          disabled={pending}
        />
      </div>

      <div className="field" style={{ marginBottom: 16 }}>
        <label htmlFor="process">4. 적용 과정</label>
        <textarea
          id="process"
          className="title-input"
          style={{ ...areaStyle, minHeight: 160 }}
          value={process}
          onChange={(e) => setProcess(e.target.value)}
          maxLength={4000}
          placeholder="어떤 순서로 AI를 적용했는지 단계별로 적어주세요."
          disabled={pending}
        />
      </div>

      <div className="field" style={{ marginBottom: 16 }}>
        <label htmlFor="prompt">재사용 프롬프트 (선택)</label>
        <textarea
          id="prompt"
          className="title-input"
          style={{ ...areaStyle, minHeight: 140, fontFamily: "monospace" }}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          maxLength={4000}
          placeholder="그대로 복사해 쓸 수 있는 프롬프트를 남겨주세요."
          disabled={pending}
        />
      </div>

      <div className="field" style={{ marginBottom: 16 }}>
        <label htmlFor="result">5. 결과</label>
        <textarea
          id="result"
          className="title-input"
          style={areaStyle}
          value={result}
          onChange={(e) => setResult(e.target.value)}
          maxLength={2000}
          placeholder="어떻게 달라졌나요? 전후를 적어주세요."
          disabled={pending}
        />
      </div>

      <div className="field">
        <label htmlFor="timeSaved">절감 효과 (선택)</label>
        <input
          id="timeSaved"
          className="title-input"
          value={timeSaved}
          onChange={(e) => setTimeSaved(e.target.value)}
          maxLength={80}
          placeholder="예: 3주 → 4일"
          disabled={pending}
        />
      </div>

      {error && (
        <p className="ci-hint" style={{ color: "#F03E3E", marginTop: 16 }}>
          {error}
        </p>
      )}

      <div className="write-actions">
        <a href="/archive" className="btn btn-ghost">
          취소
        </a>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "등록 중…" : "공식 올리기"}
        </button>
      </div>
    </form>
  );
}
