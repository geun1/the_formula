"use client";

import { useState } from "react";
import { Modal } from "./modal";

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
 * 파괴적 동작(삭제 등) 확인 모달 버튼.
 * 트리거 클릭 → 모달 팝업(백드롭·Esc 닫기) → "삭제" 확인 시 onConfirm 실행.
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
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setOpen(false)}
            >
              취소
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ background: "#F03E3E", borderColor: "#F03E3E" }}
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
            >
              {confirmLabel}
            </button>
          </>
        }
      >
        {message}
      </Modal>
    </>
  );
}
