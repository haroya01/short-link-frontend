"use client";

import { formatNumber, formatShare, cn } from "@/lib/utils";

export type BreakdownRowsProps = {
  // `title` overrides the hover tooltip when the visible `label` is a truncated stand-in for a
  // longer string (e.g. a referrer URL shown host-first but hovered for the full path).
  items: { label: string; count: number; title?: string }[];
  /** Limit visible rows only; percentages retain the complete population as their denominator. */
  maxItems?: number;
  subgrid?: boolean;
};

export function BreakdownRows({ items, maxItems = 10, subgrid = false }: BreakdownRowsProps) {
  const total = items.reduce((a, b) => a + b.count, 0) || 1;
  const top = [...items].sort((a, b) => b.count - a.count).slice(0, maxItems);
  return (
    <ul
      data-testid="breakdown-list"
      className={cn(
        "space-y-3 sm:grid sm:items-center sm:gap-x-4 sm:gap-y-2.5 sm:space-y-0",
        subgrid
          ? "sm:col-span-full sm:grid-cols-subgrid"
          : "sm:grid-cols-[minmax(0,max-content)_minmax(4rem,1fr)_auto_auto]",
      )}
    >
      {top.map((item, i) => {
        const share = item.count / total;
        return (
          <li
            key={item.label}
            className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-x-3 sm:col-span-full sm:grid-cols-subgrid sm:items-center sm:gap-x-4"
          >
            <span
              data-testid="breakdown-name"
              className="truncate text-[14px] text-slate-900 dark:text-slate-100"
              title={item.title ?? item.label}
            >
              {item.label}
            </span>
            <span aria-hidden className="col-span-full row-start-2 mt-1 flex h-1 sm:col-span-1 sm:row-start-auto sm:mt-0 sm:h-1.5">
              <span
                className="bar-grow-x block h-full bg-slate-300 dark:bg-slate-700"
                style={{ width: `max(2px, ${share * 100}%)`, animationDelay: `${i * 40}ms` }}
              />
            </span>
            <span className="text-right text-[13px] tabular-nums text-slate-700 dark:text-slate-300">
              {formatNumber(item.count)}
            </span>
            <span className="w-10 text-right text-[12px] tabular-nums text-slate-500 dark:text-slate-400 sm:w-auto">
              {formatShare(share)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
