"use client";

import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { useTranslations } from "next-intl";
import { getProfileStatsSummary } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import type { ProfileVisitSummary } from "@/types";

/**
 * Compact 4-bucket summary of profile visits (today / 7d / 30d / all-time) for the top of the
 * /settings/profile page. Static card — the standalone full-breakdown page was removed when reader
 * analytics folded into post-detail (#602), so there's no longer a drill-down target. Skips its own
 * render when the summary is all-zero so the editor doesn't get visual debt before any visits.
 */
export function ProfileVisitSummaryCard({ hasUsername }: { hasUsername: boolean }) {
  const t = useTranslations("settings.profile.stats");
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
    <div className="rounded-card-lg border border-slate-200 bg-white p-5 shadow-card-flat">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
        <BarChart3 className="h-3.5 w-3.5" />
        {t("summary.title")}
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
    </div>
  );
}
