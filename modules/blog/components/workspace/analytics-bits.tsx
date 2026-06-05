"use client";

import type { ReactNode } from "react";
import { ChevronRight, Eye, Heart, UserPlus, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SeriesMemberStat } from "@/modules/blog/api/analytics";

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

// 0 = all-time ("전체"); the backend reads days<=0 as the lifetime window.
const WINDOWS = [7, 30, 0] as const;

/** 7 / 30 / 전체 window switcher shared by the overview + per-post analytics pages. */
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
          {d === 0 ? t("analyticsAll") : t("analyticsDays", { days: d })}
        </button>
      ))}
    </div>
  );
}

/**
 * Series read-through funnel + per-episode performance. Each episode is a bar sized by its unique
 * readers (relative to the strongest episode), with the continue-rate to the next episode shown
 * between rows — so the author sees both each episode's traction and where readers drop off.
 * {@link postHref} maps an episode's postId to its per-post analytics page.
 */
export function SeriesReadThrough({
  members,
  postHref,
}: {
  members: SeriesMemberStat[];
  postHref: (postId: number) => string;
}) {
  const t = useTranslations("blogWorkspace");
  const max = Math.max(1, ...members.map((m) => m.uniqueReaders));
  return (
    <ol className="space-y-1">
      {members.map((m, i) => {
        const pct = Math.round((m.uniqueReaders / max) * 100);
        const rate = m.uniqueReaders > 0 ? Math.round((m.continuedToNext / m.uniqueReaders) * 100) : 0;
        const isLast = i === members.length - 1;
        return (
          <li key={m.postId}>
            <a
              href={postHref(m.postId)}
              aria-label={`${t("analyticsViewPost")}: ${m.title || m.slug}`}
              className="focus-ring group block rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/60"
            >
              <div className="flex items-baseline gap-2">
                <span className="shrink-0 text-[12px] font-semibold tabular-nums text-accent-700 dark:text-accent-300">
                  {t("analyticsEpisode", { n: m.episode })}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] text-slate-700 group-hover:text-accent-700 dark:text-slate-200 dark:group-hover:text-accent-300">
                  {m.title || m.slug}
                </span>
                <span
                  className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold tabular-nums text-slate-700 dark:text-slate-200"
                  title={t("analyticsUniqueReaders")}
                >
                  <Users className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                  {m.uniqueReaders.toLocaleString()}
                </span>
                {/* 글별로 따로 분석 — 이 화의 per-post 분석으로 들어가는 드릴인임을 명시. */}
                <ChevronRight className="h-4 w-4 shrink-0 self-center text-slate-300 transition-colors group-hover:text-accent-500 dark:text-slate-600 dark:group-hover:text-accent-400" />
              </div>
              {/* Reader bar, sized against the strongest episode. */}
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-accent-500" style={{ width: `${pct}%` }} />
              </div>
              {/* Per-episode performance — secondary to the funnel. */}
              <div className="mt-1.5 flex items-center gap-3 text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {m.views.toLocaleString()}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  {m.likes.toLocaleString()}
                </span>
                <span className="inline-flex items-center gap-1">
                  <UserPlus className="h-3 w-3" />
                  {m.follows.toLocaleString()}
                </span>
              </div>
            </a>
            {/* Continue-rate connector to the next episode. */}
            {!isLast && (
              <div className="flex items-center gap-1.5 px-3 py-1 text-[12px] text-slate-500 dark:text-slate-400">
                <ChevronRight className="h-3.5 w-3.5 rotate-90 text-accent-500" />
                <span className="font-medium text-accent-700 dark:text-accent-300">{rate}%</span>
                <span>{t("analyticsContinued", { count: m.continuedToNext })}</span>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
