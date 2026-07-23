"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type RangeDays = 7 | 30;

const SECTIONS = [
  { id: "section-live", labelKey: null },
  { id: "section-heatmap", labelKey: "section.heatmap.title" },
  { id: "section-daily", labelKey: "section.daily.title" },
  { id: "section-hourly", labelKey: "section.hourly.title" },
  { id: "section-sources", labelKey: "tabs.sources" },
  { id: "section-device", labelKey: "tabs.audience" },
] as const;

/**
 * 단일 스크롤 허브의 점프 바 — 유리 캡슐(§12 크롬) 안에 섹션 칩 + 기간 프리셋.
 * 5탭 시절 "카드 클릭 → 탭 전환 → 스크롤" 3단 점프를 1단(스크롤)으로 줄인 UX 개선의 짝.
 * 활성 칩은 IntersectionObserver 스크롤 스파이. 기간 프리셋(7D/30D)은 히어로 스파크라인과
 * 일별 추이 차트의 클라이언트 절환 — 90D+/전체는 API 기간 파라미터가 생기면 백엔드 후속.
 */
export function JumpBar({
  range,
  onRange,
}: {
  range: RangeDays;
  onRange: (r: RangeDays) => void;
}) {
  const t = useTranslations("stats");
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (els.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    for (const el of els) obs.observe(el);
    return () => obs.disconnect();
  }, []);

  function jump(id: string) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(id)?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  }

  return (
    <div className="sticky top-16 z-20 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="glass-capsule inline-flex max-w-full items-center gap-1 rounded-full border border-slate-200/70 p-1 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.18)] dark:border-slate-700/70">
        {SECTIONS.map((s) => {
          const selected = active === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => jump(s.id)}
              aria-current={selected ? "true" : undefined}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600",
                selected
                  ? "bg-accent-700 text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100",
              )}
            >
              {s.labelKey === null ? "LIVE" : t(s.labelKey)}
            </button>
          );
        })}
        <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />
        {([7, 30] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onRange(d)}
            aria-pressed={range === d}
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1.5 font-mono text-[11px] font-medium uppercase transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600",
              range === d
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
            )}
          >
            {d}D
          </button>
        ))}
      </div>
    </div>
  );
}
