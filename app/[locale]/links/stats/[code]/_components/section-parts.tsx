"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type RangeDays = 7 | 30;

export const HEADING = "text-base font-semibold text-slate-900 dark:text-slate-100";

export function RangeSwitch({ range, onRange }: { range: RangeDays; onRange: (r: RangeDays) => void }) {
  const t = useTranslations("stats");
  return (
    <div className="inline-flex gap-0.5 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
      {([7, 30] as const).map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onRange(d)}
          aria-pressed={range === d}
          className={cn(
            "min-h-9 whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600",
            range === d
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
          )}
        >
          {t("rangeDays", { days: d })}
        </button>
      ))}
    </div>
  );
}
