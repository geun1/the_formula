"use client";
// 마이페이지 매너온도 바 — 전체 척도(36.5~99°)에 단계 라벨 + 내 위치 마커.
// 진입 시 0°→내 온도로 카운트업하며 마커가 왼쪽에서 슬라이드(등급도 함께 상승).
import { useEffect, useRef, useState } from "react";
import type { ActivityStats } from "@/lib/contract";
import {
  computeTrust,
  gaugeRatio,
  tierBandFor,
  TIER_BANDS,
  TRUST_BASE,
  TRUST_MAX,
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
  }));

  const pos = gaugeRatio(val) * 100; // 마커 위치 %
  const live = tierBandFor(val); // 현재값 기준 등급(상승하며 바뀜)

  return (
    <div className="mt-card" ref={ref}>
      <div className="mt-track">
        {segs.map((s) => (
          <div
            key={s.band.tier}
            className="mt-seg"
            style={{ flexGrow: s.width, background: s.band.color, opacity: s.opacity }}
          >
            <span className="mt-seg-label">{s.band.label}</span>
          </div>
        ))}
        <div className="mt-marker" style={{ left: `${pos}%` }}>
          <span className="mt-marker-label" style={{ color: live.color }}>
            {live.emoji} {live.label} {val.toFixed(1)}°
          </span>
          <span className="mt-marker-pin" style={{ background: live.color }} />
        </div>
      </div>
      <div className="mt-scale">
        <span>{TRUST_BASE}°</span>
        <span>{TRUST_MAX}°</span>
      </div>
    </div>
  );
}
