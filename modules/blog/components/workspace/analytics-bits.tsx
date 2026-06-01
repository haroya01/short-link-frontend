"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

/** Small stat tile for the analytics dashboards. */
export function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
        {icon}
        <span className="text-[12px] font-medium">{label}</span>
      </div>
      <div className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

const WINDOWS = [7, 30, 90] as const;

/** 7 / 30 / 90-day window switcher shared by the overview + per-post analytics pages. */
export function WindowTabs({ days, onChange }: { days: number; onChange: (d: number) => void }) {
  const t = useTranslations("blogWorkspace");
  return (
    <div className="inline-flex rounded-full border border-slate-200 p-0.5 dark:border-slate-800">
      {WINDOWS.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          aria-pressed={days === d}
          className={`focus-ring rounded-full px-3 py-1 text-[13px] font-medium transition-colors ${
            days === d
              ? "bg-accent-600 text-white"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          {t("analyticsDays", { days: d })}
        </button>
      ))}
    </div>
  );
}
