"use client";
// 마이페이지 매너온도 바 — 등급 세그먼트 + 내 위치 마커 + 팁(isMe).
// 진입 시 카드 fade-in 후 핀이 0→현재 위치로 카운트업.
import { useEffect, useRef, useState } from "react";
import type { ActivityStats } from "@/lib/contract";
import {
  computeTrust,
  gaugeRatio,
  nextTier,
  nextTierChecklist,
  tierBandFor,
  TIER_BANDS,
  TRUST_BASE,
  TRUST_MAX,
  WEIGHTS,
} from "@/lib/trust";

export function MannerTempCard({ stats }: { stats: ActivityStats }) {
  const { trustScore } = computeTrust(stats);
  const ref = useRef<HTMLDivElement>(null);
  const [val, setVal] = useState(0); // 애니메이션 현재값 (0 → trustScore)
  const [played, setPlayed] = useState(false);

  // 카드가 화면에 들어올 때 1회 재생.
  useEffect(() => {
    const el = ref.current;
    if (!el || played) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setPlayed(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [played]);

  // 0 → 내 온도 카운트업.
  useEffect(() => {
    if (!played) return;
    let raf = 0;
    let start: number | null = null;
    const dur = 1300;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // ease-out cubic
    const tick = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      setVal(trustScore * ease(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [played, trustScore]);

  // 오름차순(새싹→마스터) 세그먼트 + 척도상 폭. 뒤로 갈수록 색 진하게(opacity 램프).
  const asc = [...TIER_BANDS].reverse();
  const bounds = asc.map((b) => Math.max(b.min, TRUST_BASE));
  const segs = asc.map((b, i) => ({
    band: b,
    width: (bounds[i + 1] ?? TRUST_MAX) - bounds[i],
    opacity: 0.45 + 0.55 * (i / (asc.length - 1)),
    isFirst: i === 0,
    isLast: i === asc.length - 1,
    scoreRange: `${b.min}점 이상`,
  }));

  const pos = gaugeRatio(val) * 100;
  const live = tierBandFor(val);
  const { next } = nextTier(trustScore);
  const checklist = next ? nextTierChecklist(stats, next.tier) : [];

  return (
    <div className="mt-card" ref={ref} data-played={played ? "true" : undefined}>
      <div className="mt-wrap">
      <div className="mt-help">
        ?
        <div className="mt-tooltip">
          <p className="mt-tooltip-title">활동별 온도 점수</p>
          <ul className="mt-tooltip-list">
            <li>
              <span className="mt-tooltip-icon">🌡️</span>
              <span className="mt-tooltip-body">
                <span className="mt-tooltip-label">프로필 채우기</span>
                <span className="mt-tooltip-desc">+{WEIGHTS.onboarded}점 — 기본 온도 부여</span>
              </span>
            </li>
            <li>
              <span className="mt-tooltip-icon">🏁</span>
              <span className="mt-tooltip-body">
                <span className="mt-tooltip-label">모임·스터디 완주</span>
                <span className="mt-tooltip-desc">+{WEIGHTS.completion}점/회 — 가장 빠른 상승</span>
              </span>
            </li>
            <li>
              <span className="mt-tooltip-icon">✅</span>
              <span className="mt-tooltip-body">
                <span className="mt-tooltip-label">검증된 공식</span>
                <span className="mt-tooltip-desc">+{WEIGHTS.verifiedFormula}점/개</span>
              </span>
            </li>
            <li>
              <span className="mt-tooltip-icon">💾</span>
              <span className="mt-tooltip-body">
                <span className="mt-tooltip-label">공식 저장받기</span>
                <span className="mt-tooltip-desc">+{WEIGHTS.saveReceived}점/회</span>
              </span>
            </li>
            <li>
              <span className="mt-tooltip-icon">❤️</span>
              <span className="mt-tooltip-body">
                <span className="mt-tooltip-label">하트 받기</span>
                <span className="mt-tooltip-desc">+{WEIGHTS.memberSave}점/개</span>
              </span>
            </li>
          </ul>
        </div>
      </div>
        <div className="mt-track">
          {segs.map((s) => (
            <div
              key={s.band.tier}
              className="mt-seg"
              style={{
                flexGrow: s.width,
                background: s.band.color,
                opacity: s.opacity,
                borderRadius: s.isFirst ? "4px 0 0 4px" : s.isLast ? "0 4px 4px 0" : "0",
              }}
            >
              <span className="mt-seg-label">{s.band.emoji} {s.band.label}</span>
              {s.band.condition && (
                <div className="mt-seg-tooltip">
                  <span className="mt-seg-tooltip-name">{s.band.emoji} {s.band.label}</span>
                  <span className="mt-seg-tooltip-cond">조건 : {s.band.condition}</span>
                  <span className="mt-seg-tooltip-score">{s.scoreRange}</span>
                </div>
              )}
            </div>
          ))}
          <div className="mt-marker" style={{ left: `${pos}%` }}>
            <span className="mt-marker-pin" style={{ background: live.color }} />
          </div>
          <span
            className="mt-marker-label"
            style={{
              left: `clamp(32px, ${pos}%, calc(100% - 32px))`,
              transform: "translateX(-50%)",
              ["--mc" as string]: live.color,
            }}
          >
            <span className="mt-ml-main">{live.emoji} {live.label}</span>
            <span className="mt-ml-score">
              {val.toFixed(1)}점{next ? ` / ${next.min}점` : ""}
            </span>
            {checklist.map((c, i) => (
              <span key={i} className={`mt-ml-cond${c.met ? " met" : ""}`}>
                {c.met ? "✓" : "✗"} {c.label}
              </span>
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
