"use client";

import { useEffect, useRef } from "react";
import { incrementView } from "@/app/actions";

export type ViewTrackerProps = {
  /** 조회수를 올릴 post id */
  postId: string;
};

/**
 * 상세 진입 시 조회수 +1 (REFERENCE_DIFF §B-2).
 * 마운트 시 1회만 incrementView 를 호출한다. 익명 사용자는 서버에서 무시돼요.
 */
export function ViewTracker({ postId }: ViewTrackerProps) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void incrementView(postId).catch(() => {
      // 조회 집계 실패는 조용히 무시 (UX 영향 없음)
    });
  }, [postId]);
  return null;
}
