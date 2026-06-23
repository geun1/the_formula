"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

// =============================================================================
// Toast — 토스풍 하단 중앙 토스트. 공유 복사 등 가벼운 피드백용.
// 두 가지 사용법:
//  1) <ToastProvider> 로 감싸고 useToast().show("복사됐어요") 호출
//  2) Provider 없이도 어디서나 toast("복사됐어요") 헬퍼 호출(전역 이벤트)
// =============================================================================

type ToastCtx = { show: (message: string) => void };

const Ctx = createContext<ToastCtx | null>(null);

const TOAST_EVENT = "formula:toast";

/** Provider 없이 전역으로 토스트를 띄우는 헬퍼(클립보드 복사 등). */
export function toast(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: message }));
}

export type ToastViewportProps = { className?: string };

/** 단일 메시지 토스트 뷰. ToastProvider 내부 또는 전역 이벤트 수신용. */
function ToastView({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-toast-in fixed bottom-7 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-[#191f28] px-4 py-3 text-sm font-semibold text-white shadow-lift"
    >
      {message}
    </div>
  );
}

/** 앱 루트 또는 페이지에서 감싸 토스트를 활성화. useToast() / toast() 둘 다 지원. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  const show = useCallback((msg: string) => {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), 1800);
  }, []);

  // 전역 이벤트도 수신 (toast() 헬퍼 호환)
  if (typeof window !== "undefined") {
    // 한 번만 바인딩되도록 플래그
    const w = window as unknown as { __formulaToastBound?: boolean };
    if (!w.__formulaToastBound) {
      w.__formulaToastBound = true;
      window.addEventListener(TOAST_EVENT, (e) => {
        const detail = (e as CustomEvent<string>).detail;
        if (detail) show(detail);
      });
    }
  }

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {message && <ToastView message={message} />}
    </Ctx.Provider>
  );
}

/** Provider 내부에서 토스트 호출. */
export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (ctx) return ctx;
  // Provider 없이도 동작하도록 전역 헬퍼로 폴백
  return { show: toast };
}
