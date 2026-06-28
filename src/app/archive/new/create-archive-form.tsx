"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createArchive, requestArticlePermission } from "@/app/actions";
import { Markdown } from "@/components/ui";
import { RichEditor } from "./rich-editor";
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

export type ForkRef = { id: string; title: string; authorName: string };

export function CreateArchiveForm({
  articles,
  prefill,
  aiPermission,
  forkedFrom = null,
}: {
  articles: ArticleOption[];
  prefill: ArticleOption | null;
  aiPermission: "admin" | "approved" | "pending" | "rejected" | "none";
  forkedFrom?: ForkRef | null;
}) {
  const router = useRouter();
  const canUseAi = aiPermission === "admin" || aiPermission === "approved";
  // 기본 정보
  const [title, setTitle] = useState("");
  const [oneLiner, setOneLiner] = useState("");
  const [category, setCategory] = useState<Category>("dev");
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediate");
  const [workType, setWorkType] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");

  // 작성 양식: guide(구조화 폼) / free(자유 에디터) / ai(AI 작성)
  const [format, setFormat] = useState<"guide" | "free" | "ai">("guide");
  const [content, setContent] = useState(""); // 자유 형식 HTML

  // AI와 함께 써보기
  const [aiDirection, setAiDirection] = useState("");
  const [aiDraft, setAiDraft] = useState(""); // AI 생성/수정 마크다운
  const [aiPreview, setAiPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [draftErr, setDraftErr] = useState<string | null>(null);
  // 권한 요청
  const [reqPending, setReqPending] = useState(false);
  const [requested, setRequested] = useState(false);

  // 공식 본문(guide)
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
    if (format === "free") {
      // 태그 제외 순수 텍스트가 비었는지 대략 확인(서버에서 재검증·새니타이즈).
      const text = content.replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").trim();
      if (!text) {
        setError("내용을 입력해 주세요.");
        return;
      }
    } else if (format === "ai") {
      if (!aiDraft.trim()) {
        setError("AI 초안을 생성하거나 내용을 입력해 주세요.");
        return;
      }
    } else {
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
        format,
        formula: {
          problem: problem.trim(),
          hypothesis: hypothesis.trim(),
          tools,
          prompt: prompt.trim() || null,
          process: process.trim(),
          result: result.trim(),
          timeSaved: timeSaved.trim(),
          // free=HTML(서버 새니타이즈) / ai=마크다운(Markdown 렌더)
          content: format === "ai" ? aiDraft : content,
        },
        relatedArticleId: relatedArticleId || null,
        forkedFromId: forkedFrom?.id ?? null,
      });
      if (res && !res.ok) setError(res.error);
    });
  }

  /** AI 초안 생성 — 방향성(+연결 아티클) → 마크다운 초안. */
  async function generateDraft() {
    setDraftErr(null);
    const dir = aiDirection.trim();
    if (dir.length < 5) {
      setDraftErr("어떤 글을 쓰고 싶은지 방향을 5자 이상 적어주세요.");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/archive/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          direction: dir,
          articleId: relatedArticleId || null,
        }),
        signal: AbortSignal.timeout(150_000),
      });
      const data = (await res.json()) as { draft?: string; error?: string };
      if (res.ok && data.draft) {
        setAiDraft(data.draft);
        setAiPreview(true);
      } else {
        setDraftErr(data.error ?? "초안 생성에 실패했어요.");
      }
    } catch (e) {
      setDraftErr(
        e instanceof DOMException && e.name === "TimeoutError"
          ? "초안 생성이 오래 걸려요. 잠시 후 다시 시도해주세요."
          : "요청 중 오류가 발생했어요.",
      );
    } finally {
      setGenerating(false);
    }
  }

  /** AI 작성 권한 요청(미권한자). 성공 시 새로고침으로 '검토 중' 상태 반영. */
  async function requestPerm() {
    setReqPending(true);
    try {
      const res = await requestArticlePermission();
      if (res.ok) {
        setRequested(true);
        router.refresh();
      }
    } finally {
      setReqPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ marginTop: 28 }}>
      {forkedFrom && (
        <div
          style={{
            marginBottom: 20,
            padding: "12px 14px",
            borderRadius: 12,
            background: "var(--bg-2, #f1f3f5)",
            fontSize: 14,
          }}
        >
          <strong>{forkedFrom.authorName}</strong>님의 공식{" "}
          <a
            href={`/formula/${forkedFrom.id}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--blue)", fontWeight: 600 }}
          >
            “{forkedFrom.title}”
          </a>
          을(를) 참고해요. 내용은 직접 내 사례로 채워주세요 — 출처는 자동으로 남아요.
        </div>
      )}
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

      {/* 양식 선택 탭 */}
      <div className="fmt-tabs" role="tablist" aria-label="작성 양식">
        <button
          type="button"
          role="tab"
          aria-selected={format === "guide"}
          className={`fmt-tab${format === "guide" ? " on" : ""}`}
          onClick={() => setFormat("guide")}
          disabled={pending}
        >
          📋 가이드 형식
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={format === "free"}
          className={`fmt-tab${format === "free" ? " on" : ""}`}
          onClick={() => setFormat("free")}
          disabled={pending}
        >
          ✏️ 자유 형식
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={format === "ai"}
          className={`fmt-tab${format === "ai" ? " on" : ""}`}
          onClick={() => setFormat("ai")}
          disabled={pending}
        >
          🤖 AI와 함께
        </button>
      </div>
      <p className="fmt-hint">
        {format === "guide"
          ? "문제 → 가설 → 도구 → 과정 → 결과 순서로 채우면 상세 페이지에 구조화돼 보여요."
          : format === "ai"
            ? "방향성을 알려주면 AI가 (연결한 아티클 맥락까지 반영해) 표·차트가 포함된 초안을 써줘요. 초안을 다듬어 올릴 수 있어요."
            : "에디터에 자유롭게 쓰면 상세 페이지에 쓴 그대로 보여요."}
      </p>
      <div className="write-divider" />

      {/* 자유 형식 */}
      {format === "free" && (
        <div className="field" style={{ marginBottom: 16 }}>
          <label>본문</label>
          <RichEditor value={content} onChange={setContent} />
        </div>
      )}

      {/* AI와 함께 써보기 */}
      {format === "ai" &&
        (canUseAi ? (
          <div className="ai-write">
            {relatedArticleId && (
              <p className="ci-hint" style={{ marginBottom: 12 }}>
                ✦ 위에서 연결한 아티클 맥락이 초안에 반영돼요.
              </p>
            )}
            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="aiDir">어떤 글을 쓰고 싶은가요? (방향성)</label>
              <textarea
                id="aiDir"
                className="title-input"
                style={areaStyle}
                value={aiDirection}
                onChange={(e) => setAiDirection(e.target.value)}
                maxLength={2000}
                placeholder="예: 이 아티클의 기법을 우리 팀 코드리뷰 자동화에 적용한 사례로, 전후 비교 표를 넣어서 써줘"
                disabled={generating || pending}
              />
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={generateDraft}
              disabled={generating || pending}
              style={{ marginBottom: 16 }}
            >
              {generating
                ? "초안 생성 중… (수십 초~2분)"
                : aiDraft
                  ? "AI 초안 다시 생성"
                  : "AI 초안 생성하기"}
            </button>
            {draftErr && <p className="re-err">{draftErr}</p>}

            {aiDraft && (
              <div className="field">
                <div className="ai-draft-bar">
                  <label style={{ margin: 0 }}>초안 (직접 수정 가능)</label>
                  <div className="ai-draft-tabs">
                    <button
                      type="button"
                      className={`fmt-tab${!aiPreview ? " on" : ""}`}
                      onClick={() => setAiPreview(false)}
                    >
                      편집
                    </button>
                    <button
                      type="button"
                      className={`fmt-tab${aiPreview ? " on" : ""}`}
                      onClick={() => setAiPreview(true)}
                    >
                      미리보기
                    </button>
                  </div>
                </div>
                {aiPreview ? (
                  <div className="md ai-draft-preview">
                    <Markdown content={aiDraft} />
                  </div>
                ) : (
                  <textarea
                    className="title-input"
                    style={{
                      ...areaStyle,
                      minHeight: 320,
                      fontFamily: "ui-monospace, Menlo, monospace",
                      fontSize: 13.5,
                    }}
                    value={aiDraft}
                    onChange={(e) => setAiDraft(e.target.value)}
                    maxLength={60000}
                    disabled={pending}
                  />
                )}
              </div>
            )}
          </div>
        ) : aiPermission === "pending" ? (
          <div className="perm-box">
            <div className="perm-title">⏳ AI 작성 권한이 검토 중이에요</div>
            <p className="perm-desc">
              송근일님이 승인하면 AI와 함께 쓸 수 있어요. 그동안 가이드/자유 형식으로 작성할 수 있어요.
            </p>
          </div>
        ) : (
          <div className="perm-box">
            <div className="perm-title">🤖 AI와 함께 쓰기는 승인이 필요해요</div>
            <p className="perm-desc">
              {requested
                ? "요청을 보냈어요. 송근일님의 승인을 기다려주세요."
                : "송근일님께 권한을 요청하면 검토 후 AI 작성을 쓸 수 있어요. 그동안 가이드/자유 형식으로 작성할 수 있어요."}
            </p>
            {!requested && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={requestPerm}
                disabled={reqPending}
                style={{ marginTop: 14 }}
              >
                {reqPending ? "요청 중…" : "AI 작성 권한 요청하기"}
              </button>
            )}
          </div>
        ))}

      {/* 가이드 형식 */}
      {format === "guide" && (
        <>
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
        </>
      )}

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
