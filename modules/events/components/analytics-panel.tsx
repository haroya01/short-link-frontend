"use client";

import { useTranslations } from "next-intl";
import type { EventAnalytics } from "@/modules/events/api/events";

/** 이 기능의 차별화 핵심 화면 — "신청자 23명: 카톡 12 · 트위터 6 · 직접 3". */
export function AnalyticsPanel({ analytics }: { analytics: EventAnalytics }) {
  const t = useTranslations("events.analytics");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-50">{t("title")}</h2>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat label={t("totalClicks")} value={analytics.totalClicks} />
        <Stat label={t("totalRegistrations")} value={analytics.totalRegistrations} />
      </div>

      <BucketBars
        title={t("registrationsByChannel")}
        buckets={analytics.registrationsByChannel}
        emptyLabel={t("noRegistrations")}
        accent
      />
      <BucketBars
        title={t("clicksByLink")}
        buckets={analytics.clicksByLink}
        emptyLabel={t("noClicks")}
      />
      <BucketBars
        title={t("clicksByClientApp")}
        buckets={analytics.clicksByClientApp}
        emptyLabel={t("noClicks")}
      />
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 text-xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function BucketBars({
  title,
  buckets,
  emptyLabel,
  accent = false,
}: {
  title: string;
  buckets: { key: string; count: number }[];
  emptyLabel: string;
  accent?: boolean;
}) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <div className="mt-5">
      <h3 className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">{title}</h3>
      {buckets.length === 0 ? (
        <p className="mt-2 text-[12px] text-slate-400">{emptyLabel}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {buckets.slice(0, 8).map((bucket) => (
            <li key={bucket.key} className="flex items-center gap-2.5">
              <span className="w-24 shrink-0 truncate text-[12px] text-slate-600 dark:text-slate-300">
                {bucket.key}
              </span>
              <span className="h-4 flex-1 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                <span
                  className={
                    accent
                      ? "block h-full rounded bg-slate-900 dark:bg-slate-200"
                      : "block h-full rounded bg-slate-300 dark:bg-slate-600"
                  }
                  style={{ width: `${Math.round((bucket.count / max) * 100)}%` }}
                />
              </span>
              <span className="w-8 shrink-0 text-right text-[12px] font-medium tabular-nums text-slate-700 dark:text-slate-300">
                {bucket.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
