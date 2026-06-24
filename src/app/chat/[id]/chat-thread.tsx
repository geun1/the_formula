"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Message } from "@/lib/contract";
import { sendMessage, markRead } from "@/app/actions";

export type ChatThreadProps = {
  conversationId: string;
  meId: string;
  partnerName: string;
  initialMessages: Message[];
};

/** 메시지 시각(같은 날이면 시간만). */
function msgTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** YYYY-MM-DD 구분키 — 날짜 구분선 표시용. */
function dayKey(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

/**
 * 메시지 스레드(버블 UI) + 입력창 + 폴링 갱신. (레퍼런스 톤 리스킨 — 기능 동일)
 * - 전송: sendMessage 액션 → 성공 시 router.refresh() 로 서버 최신 반영.
 * - 폴링: 6초마다 router.refresh()(상대 메시지 수신 반영). 탭이 숨겨지면 멈춰요.
 * - 읽음: 마운트/갱신 시 markRead 호출(내가 수신한 미읽음 처리).
 * - 버블: 내 메시지=토스블루(var(--blue)/흰 글씨), 상대=회색(var(--bg-2)).
 */
export function ChatThread({
  conversationId,
  meId,
  partnerName,
  initialMessages,
}: ChatThreadProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // 새 메시지가 들어오면 맨 아래로 스크롤.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [initialMessages.length]);

  // 수신 메시지 읽음 처리(렌더된 메시지가 바뀔 때마다).
  useEffect(() => {
    void markRead(conversationId);
  }, [conversationId, initialMessages.length]);

  // 폴링: 탭이 보일 때만 6초 간격으로 서버 갱신.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const t = setInterval(tick, 6000);
    return () => clearInterval(t);
  }, [router]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const value = body.trim();
    if (!value) return;
    startTransition(async () => {
      const res = await sendMessage(conversationId, value);
      if (res.ok) {
        setBody("");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  let lastDay = "";

  return (
    <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
      {/* 메시지 영역 */}
      <div style={{ flex: 1, padding: "20px 16px" }}>
        {initialMessages.length === 0 ? (
          <p
            style={{
              padding: "64px 0",
              textAlign: "center",
              fontSize: 14,
              color: "var(--t3)",
            }}
          >
            {partnerName}님에게 첫 메시지를 보내보세요.
          </p>
        ) : (
          initialMessages.map((m) => {
            const mine = m.senderId === meId;
            const day = dayKey(m.createdAt);
            const showDay = day !== lastDay;
            lastDay = day;
            return (
              <div key={m.id} style={{ marginBottom: 4 }}>
                {showDay && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      margin: "16px 0",
                    }}
                  >
                    <span
                      style={{
                        borderRadius: 999,
                        background: "var(--bg-2)",
                        padding: "4px 12px",
                        fontSize: 11,
                        color: "var(--t3)",
                      }}
                    >
                      {day}
                    </span>
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 6,
                    flexDirection: mine ? "row-reverse" : "row",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "75%",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      borderRadius: 16,
                      borderBottomRightRadius: mine ? 4 : 16,
                      borderBottomLeftRadius: mine ? 16 : 4,
                      padding: "10px 14px",
                      fontSize: 14,
                      lineHeight: 1.6,
                      background: mine ? "var(--blue)" : "var(--bg-2)",
                      color: mine ? "#fff" : "var(--t1)",
                    }}
                  >
                    {m.body}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexShrink: 0,
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 2,
                      paddingBottom: 2,
                    }}
                  >
                    {mine && m.readAt && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: "var(--blue)",
                        }}
                      >
                        읽음
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: "var(--t3)" }}>
                      {msgTime(m.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <form
        onSubmit={onSubmit}
        style={{
          position: "sticky",
          bottom: 0,
          borderTop: "1px solid var(--border)",
          background: "var(--white)",
          padding: "12px 16px",
        }}
      >
        {error && (
          <p
            style={{
              marginBottom: 8,
              fontSize: 12,
              color: "#F03E3E",
            }}
            role="alert"
          >
            {error}
          </p>
        )}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e);
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder="메시지를 입력해요"
            aria-label="메시지 입력"
            style={{
              maxHeight: 128,
              minHeight: 44,
              flex: 1,
              resize: "none",
              borderRadius: 16,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              padding: "10px 16px",
              // 16px 미만이면 iOS Safari 가 포커스 시 페이지를 자동 확대하므로 16 고정.
              fontSize: 16,
              outline: "none",
              fontFamily: "var(--font)",
              color: "var(--t1)",
              lineHeight: 1.5,
            }}
          />
          <button
            type="submit"
            disabled={pending || !body.trim()}
            className="btn btn-primary"
            style={{
              height: 44,
              flexShrink: 0,
              padding: "0 20px",
              opacity: pending || !body.trim() ? 0.5 : 1,
            }}
          >
            {pending ? "전송 중" : "보내기"}
          </button>
        </div>
      </form>
    </div>
  );
}
