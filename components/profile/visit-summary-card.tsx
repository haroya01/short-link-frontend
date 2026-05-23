"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BarChart3 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { getProfileStatsSummary } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import type { ProfileVisitSummary } from "@/types";

/**
 * Compact 4-bucket summary of profile visits (today / 7d / 30d / all-time) for the top of the
 * /profile/edit page. Click-through links to /profile/stats for the full chart breakdown. Skips
 * its own render when the summary is all-zero so the editor doesn't get visual debt before
 * any visits have happened.
 */
export function ProfileVisitSummaryCard({ hasUsername }: { hasUsername: boolean }) {
  const t = useTranslations("settings.profile.stats");
  const locale = useLocale();
  const [data, setData] = useState<ProfileVisitSummary | null>(null);

  useEffect(() => {
    if (!hasUsername) return;
    getProfileStatsSummary()
      .then(setData)
      .catch(() => setData(null));
  }, [hasUsername]);

  if (!hasUsername || !data) return null;
  if (data.today + data.week + data.month + data.allTime === 0) return null;

  const buckets = [
    { label: t("summary.today"), value: data.today },
    { label: t("summary.week"), value: data.week },
    { label: t("summary.month"), value: data.month },
    { label: t("summary.allTime"), value: data.allTime },
  ];

  return (
    <Link
      href={`/${locale}/profile/stats`}
      className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition hover:border-slate-300 hover:bg-slate-50/60"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
          <BarChart3 className="h-3.5 w-3.5" />
          {t("summary.title")}
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 group-hover:text-slate-900">
          {t("summary.viewAll")}
          <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {buckets.map((b) => (
          <div key={b.label} className="rounded-md border border-slate-100 bg-slate-50/50 p-3">
            <dt className="text-[10px] uppercase tracking-wider text-slate-500">{b.label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
              {formatNumber(b.value)}
            </dd>
          </div>
        ))}
      </dl>
    </Link>
  );
}
