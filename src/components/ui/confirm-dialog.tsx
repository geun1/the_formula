"use client";

import { useEffect, useState } from "react";

export type ConfirmDialogProps = {
  /** 최종 확인 시 실행할 동작 */
  onConfirm: () => void;
  /** 트리거 버튼 라벨 (기본 "삭제") */
  label?: string;
  /** 모달 제목 */
  title?: string;
  /** 모달 본문 경고 메시지 */
  message: string;
  /** 확인 버튼 라벨 (기본 "삭제") */
  confirmLabel?: string;
  /** 트리거 버튼 className (주변 버튼과 맞춤) */
  className?: string;
  disabled?: boolean;
};

/**
 * 파괴적 동작(삭제 등) 확인 팝업. 트리거 클릭 → 컴팩트 중앙 모달(백드롭·Esc 닫기)
 * → "삭제" 확인 시 onConfirm. 네이티브 confirm 대신 화면 요소라 에이전트도 클릭 가능.
 */
export function ConfirmDialog({
  onConfirm,
  label = "삭제",
  title = "삭제할까요?",
  message,
  confirmLabel = "삭제",
  className = "btn btn-ghost",
  disabled = false,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        {label}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            aria-hidden
            onClick={() => setOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              backdropFilter: "blur(2px)",
            }}
          />
          <div
            style={{
              position: "relative",
              zIndex: 10,
              width: "100%",
              maxWidth: 340,
              background: "var(--white, #fff)",
              borderRadius: 16,
              boxShadow: "0 16px 40px rgba(0,0,0,0.20)",
              padding: "24px 22px 18px",
              textAlign: "center",
            }}
          >
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: "var(--t1, #191f28)" }}>
              {title}
            </h2>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.55,
                color: "var(--t3, #6b7280)",
                marginBottom: 20,
                whiteSpace: "pre-line",
              }}
            >
              {message}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  flex: 1,
                  padding: "11px 0",
                  borderRadius: 10,
                  border: "1px solid var(--border, #e5e7eb)",
                  background: "var(--white, #fff)",
                  color: "var(--t1, #191f28)",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onConfirm();
                }}
                style={{
                  flex: 1,
                  padding: "11px 0",
                  borderRadius: 10,
                  border: "none",
                  background: "#F03E3E",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
