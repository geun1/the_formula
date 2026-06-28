"use client";

import { useTransition } from "react";
import { ConfirmDialog } from "@/components/ui";
import { deactivateAccount } from "@/app/actions";

/** 계정 탈퇴(소프트) — 모달 확인 후 deactivateAccount. 콘텐츠·이름은 보존됨을 안내. */
export function DeactivateSection() {
  const [pending, startTransition] = useTransition();

  return (
    <div
      style={{
        marginTop: 28,
        paddingTop: 20,
        borderTop: "1px solid var(--border, #e5e7eb)",
      }}
    >
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>계정 탈퇴</h2>
      <p className="page-sub" style={{ marginTop: 0, marginBottom: 12 }}>
        탈퇴하면 다시 로그인할 수 없어요. 작성한 공식·댓글·모임은 이름과 함께 남아요.
      </p>
      <ConfirmDialog
        onConfirm={() =>
          startTransition(async () => {
            await deactivateAccount();
          })
        }
        label="계정 탈퇴"
        title="정말 탈퇴할까요?"
        message="탈퇴하면 다시 로그인할 수 없어요. 작성한 콘텐츠(공식·댓글·모임)는 이름과 함께 보존돼요."
        confirmLabel="탈퇴하기"
        className="btn btn-ghost"
        disabled={pending}
      />
    </div>
  );
}
