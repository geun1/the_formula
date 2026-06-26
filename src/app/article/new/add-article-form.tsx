"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AddResult = {
  ok: boolean;
  status?: "published" | "already_published";
  url?: string;
  title?: string;
  error?: string;
};

/** 관리자 아티클 추가 폼 — URL 제출 → 크롤+AI 발행 → 새 아티클로 이동. */
export function AddArticleForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const u = url.trim();
    if (!u) {
      setErr("URL 을 입력해주세요.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/articles/from-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: u }),
        // 서버 maxDuration 은 300s 지만, 클라는 150s 에서 끊고 안내(파이프라인은 멱등이라
        // 백그라운드 완료/재시도 안전).
        signal: AbortSignal.timeout(150_000),
      });
      const data = (await res.json()) as AddResult;
      if (res.ok && data.ok && data.url) {
        // 발행 완료(또는 이미 존재) → 해당 아티클로 이동.
        router.push(data.url);
        router.refresh();
      } else {
        setErr(data.error ?? "추가에 실패했어요.");
        setPending(false);
      }
    } catch (e) {
      const aborted = e instanceof DOMException && e.name === "TimeoutError";
      setErr(
        aborted
          ? "가공이 오래 걸리고 있어요. 잠시 후 피드를 확인해보세요 — 작업은 백그라운드에서 계속돼요. (같은 URL 재시도해도 중복 발행되지 않아요)"
          : "요청 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.",
      );
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ marginTop: 24 }}>
      <div className="field">
        <label htmlFor="article-url">기사 URL</label>
        <input
          id="article-url"
          className="title-input"
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://example.com/article"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={pending}
        />
      </div>

      {err && (
        <p
          role="alert"
          style={{
            marginTop: 12,
            fontSize: 14,
            color: "#F03E3E",
            lineHeight: 1.5,
          }}
        >
          {err}
        </p>
      )}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={pending}
        style={{ marginTop: 20, width: "100%", height: 52, opacity: pending ? 0.7 : 1 }}
      >
        {pending ? "크롤링 + AI 가공 중…" : "아티클 추가하기"}
      </button>

      {pending && (
        <p
          style={{
            marginTop: 12,
            fontSize: 13,
            color: "var(--t3)",
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          ⏳ 본문 추출 → AI 요약·카드뉴스 생성 중이에요. 글 길이에 따라 최대 1~2분
          걸릴 수 있어요.
          <br />
          이 페이지를 닫지 말고 기다려주세요.
        </p>
      )}
    </form>
  );
}
