"use client";

import { ArrowDownRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Sparkline } from "@/components/links/stats/sparkline";
import { buildJournal } from "@/lib/stats-journal";
import { cn } from "@/lib/utils";
import type { LinkStats } from "@/types";

/**
 * 링크 일지 — "읽는 통계"의 표면. 문장이 1급 시민이고 차트는 증거다:
 * 각 문장은 실데이터 룰(lib/stats-journal)이 썼고, 클릭하면 근거 섹션으로 내려간다.
 * 대시보드 카드 그리드(구 InsightSummary)를 대체한다 — 숫자 나열이 아니라 판단을 준다.
 */
export function StatsJournal({
  data,
  onNavigate,
}: {
  data: LinkStats;
  onNavigate: (section: string) => void;
}) {
  const t = useTranslations("stats.journal");
  const entries = buildJournal(data);
  if (entries.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="font-mono text-[11px] uppercase tracking-tagline text-accent-700 dark:text-accent-400">
        {t("title")}
      </p>
      <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
        {entries.map((entry) => (
          <li key={entry.key}>
            <button
              type="button"
              onClick={() => onNavigate(entry.evidence)}
              className="focus-ring group flex w-full items-center gap-3 rounded-lg px-1 py-3 text-left transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
            >
              <span
                aria-hidden
                className="mt-0.5 inline-flex h-1.5 w-1.5 shrink-0 self-start rounded-full bg-accent-600 dark:bg-accent-400"
              />
              <span className="min-w-0 flex-1 text-[15px] font-medium leading-relaxed text-slate-800 dark:text-slate-200">
                {t(entry.key, entry.params)}
              </span>
              {entry.spark && entry.spark.length > 1 && (
                <Sparkline
                  values={entry.spark}
                  width={64}
                  height={18}
                  className="shrink-0 text-accent-600 dark:text-accent-400"
                />
              )}
              {entry.ratio !== undefined && !entry.spark && (
                <span
                  aria-hidden
                  className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                >
                  <span
                    className="block h-full rounded-full bg-accent-600 dark:bg-accent-400"
                    style={{ width: `${Math.round(Math.min(1, entry.ratio) * 100)}%` }}
                  />
                </span>
              )}
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-0.5 font-mono text-[10px] uppercase tracking-tagline",
                  "text-slate-400 transition-colors group-hover:text-accent-700 dark:text-slate-500 dark:group-hover:text-accent-400",
                )}
              >
                {t("evidence")}
                <ArrowDownRight className="h-3 w-3" />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
