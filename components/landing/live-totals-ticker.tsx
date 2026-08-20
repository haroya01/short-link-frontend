"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { LiveDot } from "@/components/common/live-dot";
import { usePublicTotals } from "@/lib/api/stats.queries";

/**
 * 히어로 라이브 티커 — 실제 공개 누적(링크·클릭)이 히어로에서 숨쉰다. 30초마다 재조회하고
 * 값이 갱신되면 굴러 올라간다. 수치는 언제나 서버가 준 실값으로 수렴(가짜 드리프트 없음 —
 * 무대의 과장광고 방지 계약과 동일).
 */
export function LiveTotalsTicker() {
  const t = useTranslations("home");
  const { data } = usePublicTotals({ refetchInterval: 30_000 });

  if (!data || (data.links <= 0 && data.clicks <= 0)) {
    // 자리만 지킨다 — 도착 시 레이아웃이 밀리지 않게.
    return <p aria-hidden className="h-5" />;
  }

  return (
    <p className="flex h-5 items-center justify-center gap-2 text-[12px] tabular-nums text-slate-500 dark:text-slate-400">
      <LiveDot />
      <span>
        {t.rich("heroTicker", {
          l: () => (
            <span className="font-medium text-slate-600 dark:text-slate-300">
              <RollingNumber value={data.links} />
            </span>
          ),
          c: () => (
            <span className="font-medium text-slate-600 dark:text-slate-300">
              <RollingNumber value={data.clicks} />
            </span>
          ),
        })}
      </span>
    </p>
  );
}

/** 표시값이 목표 실값으로 이징 롤업 — 첫 도착도 짧게 굴러 "살아있음"이 보인다. */
function RollingNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(() => Math.max(0, Math.floor(value * 0.985)));
  const prevRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevRef.current ?? Math.max(0, Math.floor(value * 0.985));
    prevRef.current = value;
    if (from === value) {
      setDisplay(value);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    const started = performance.now();
    const duration = 1100;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{display.toLocaleString()}</>;
}
