"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { cn, formatNumber } from "@/lib/utils";

type Props = {
  // `title` overrides the hover tooltip when the visible `label` is a truncated stand-in for a
  // longer string (e.g. a referrer URL shown host-first but hovered for the full path).
  items: { label: string; count: number; title?: string }[];
};

function BreakdownListImpl({ items }: Props) {
  const t = useTranslations("stats");
  if (items.length === 0) {
    return <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">{t("noData")}</p>;
  }
  const total = items.reduce((a, b) => a + b.count, 0) || 1;
  const top = [...items].sort((a, b) => b.count - a.count).slice(0, 10);
  // Same leader-highlight convention used by CountryTable so the two side-by-side rails on
  // /demo's Audience group read as one consistent visual language — the row that owns the
  // category steps a shade darker than the long-tail.
  const topCount = top.length > 0 ? top[0].count : 0;

  return (
    <ul className="space-y-2.5">
      {top.map((item, i) => {
        const ratio = item.count / total;
        const pct = ratio >= 0.1 ? (ratio * 100).toFixed(0) : (ratio * 100).toFixed(1);
        const isLeader = item.count === topCount && topCount > 0;
        return (
          <li key={item.label} className="flex items-center gap-2 text-sm sm:gap-3">
            <span
              className={cn(
                "w-20 shrink-0 truncate text-[13px] sm:w-32",
                isLeader ? "font-medium text-slate-900 dark:text-slate-100" : "text-slate-700 dark:text-slate-300",
              )}
              title={item.title ?? item.label}
            >
              {item.label}
            </span>
            <div className="flex-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={cn(
                    "h-full rounded-full",
                    isLeader ? "bg-accent-700" : "bg-accent-600",
                  )}
                  style={{
                    width: `${pct}%`,
                    animation: `bdGrow 600ms ${i * 50}ms ease-out backwards`,
                  }}
                />
              </div>
            </div>
            <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300 sm:w-16">
              {formatNumber(item.count)}
            </span>
            <span className="hidden w-12 text-right font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400 sm:inline">
              {pct}%
            </span>
          </li>
        );
      })}
      <style jsx>{`
        @keyframes bdGrow {
          from {
            width: 0;
          }
        }
      `}</style>
    </ul>
  );
}

// 부모 상태 변화(라이브 틱·기간 프리셋)에 데이터가 같으면 재렌더 생략 — 벤토 부드러움의 절반.
export const BreakdownList = memo(BreakdownListImpl);
