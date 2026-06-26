"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestArticlePermission } from "@/app/actions";

/** 권한 미보유 사용자용 — 요청 버튼 / 검토중 안내. status 는 pending|rejected|none. */
export function RequestPermission({
  status,
}: {
  status: "pending" | "rejected" | "none";
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (status === "pending") {
    return (
      <div className="perm-box">
        <div className="perm-title">⏳ 권한 요청이 검토 중이에요</div>
        <p className="perm-desc">
          송근일님이 승인하면 아티클을 추가할 수 있어요. 조금만 기다려주세요.
        </p>
      </div>
    );
  }

  function submit() {
    setErr(null);
    startTransition(async () => {
      const res = await requestArticlePermission(note.trim());
      if (res.ok) {
        router.refresh();
      } else {
        setErr(res.error);
      }
    });
  }

  return (
    <div className="perm-box">
      <div className="perm-title">아티클 추가 권한이 필요해요</div>
      <p className="perm-desc">
        {status === "rejected"
          ? "이전 요청이 거절됐어요. 사유를 보완해 다시 요청할 수 있어요."
          : "기사 URL 로 아티클을 추가하려면 권한이 필요해요. 송근일님께 요청하면 검토 후 승인돼요."}
      </p>
      <textarea
        className="title-input"
        style={{ height: "auto", minHeight: 72, padding: "12px 14px", resize: "vertical", marginTop: 14 }}
        placeholder="요청 메모(선택) — 어떤 글을 올리고 싶은지 적어주세요"
        value={note}
        maxLength={500}
        onChange={(e) => setNote(e.target.value)}
        disabled={pending}
      />
      {err && (
        <p style={{ marginTop: 10, fontSize: 14, color: "#F03E3E" }}>{err}</p>
      )}
      <button
        type="button"
        className="btn btn-primary"
        onClick={submit}
        disabled={pending}
        style={{ marginTop: 16, width: "100%", height: 50 }}
      >
        {pending ? "요청 중…" : "권한 요청하기"}
      </button>
    </div>
  );
}
