"use client";

import { useTranslations } from "next-intl";
import type { EventAnalytics } from "@/modules/events/api/events";

/** 이 기능의 차별화 핵심 화면 — "신청자 23명: 카톡 12 · 트위터 6 · 직접 3".
 *  종이 문법: 상자 대신 헤어라인 섹션, 숫자가 텍스처를 만들고 색은 초록 한 가닥(신청 채널)만. */
export function AnalyticsPanel({ analytics }: { analytics: EventAnalytics }) {
  const t = useTranslations("events.analytics");

  return (
    <section className="border-t border-slate-200 pt-6 dark:border-slate-800">
      <h2 className="text-[11px] font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-500">
        {t("title")}
      </h2>

      {analytics.totalClicks === 0 ? (
        <p className="mt-3 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
          {t("shareNudge")}
        </p>
      ) : null}

      <div className="mt-4 flex divide-x divide-slate-100 dark:divide-slate-800/60">
        <Stat label={t("totalClicks")} value={String(analytics.totalClicks)} first />
        <Stat label={t("totalRegistrations")} value={String(analytics.totalRegistrations)} />
        <Stat
          label={t("conversion")}
          value={
            analytics.totalClicks > 0
              ? `${Math.round((analytics.totalRegistrations / analytics.totalClicks) * 100)}%`
              : "—"
          }
        />
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

function Stat({ label, value, first = false }: { label: string; value: string; first?: boolean }) {
  return (
    <div className={first ? "flex-1 pr-4" : "flex-1 px-4"}>
      <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500">{label}</div>
      <div className="mt-0.5 text-xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-50">
        {value}
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
    <div className="mt-6">
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
              <span className="h-3.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <span
                  className={
                    accent
                      ? "block h-full rounded-full bg-emerald-600"
                      : "block h-full rounded-full bg-slate-300 dark:bg-slate-600"
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
