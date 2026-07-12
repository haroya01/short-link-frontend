"use client";

import { useTranslations } from "next-intl";
import { Check, Minus } from "lucide-react";

/**
 * "Why kurl" — feature comparison vs typical free-tier shorteners (bit.ly, short.io, rebrandly,
 * tinyurl). Rows are differentiators we ship for free that most competitors gate behind paid
 * tiers. Naming is generic ("Free shorteners 평균") to avoid singling out any one product.
 */
type Row = {
  key:
    | "abtest"
    | "webhooks"
    | "realtime"
    | "insights"
    | "twofa"
    | "botDefense"
    | "asnTracking"
    | "geoRouting";
  ours: true;
  others: false | "limited";
};

const ROWS: Row[] = [
  { key: "abtest", ours: true, others: false },
  { key: "geoRouting", ours: true, others: false },
  { key: "webhooks", ours: true, others: "limited" },
  { key: "realtime", ours: true, others: false },
  { key: "insights", ours: true, others: false },
  { key: "asnTracking", ours: true, others: false },
  { key: "botDefense", ours: true, others: "limited" },
  { key: "twofa", ours: true, others: "limited" },
];

export function WhyKurl() {
  const t = useTranslations("whyKurl");

  return (
    <div className="space-y-6">
      <div className="card-highlight overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            {/*
             * Header palette pulls the kurl column out — it sits on a soft accent tint with a
             * 2px accent bottom-bar so the eye reads it as the "ours" column without us having
             * to rely on column-level borders, which read as spreadsheet chrome and were the
             * single biggest "this is a Tailwind UI table" tell in the previous version.
             */}
            <tr className="text-left">
              <th className="bg-slate-50/70 dark:bg-slate-800/70 px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-tagline text-slate-500 dark:text-slate-400">
                {t("th.feature")}
              </th>
              <th className="border-b-2 border-accent-600 bg-accent-50/60 dark:bg-accent-500/10 px-4 py-3 text-center font-mono text-[10px] font-semibold uppercase tracking-tagline text-accent-700 dark:text-accent-400">
                kurl
              </th>
              <th className="bg-slate-50/70 dark:bg-slate-800/70 px-4 py-3 text-center font-mono text-[10px] font-semibold uppercase tracking-tagline text-slate-500 dark:text-slate-400">
                {t("th.others")}
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
              <tr
                key={row.key}
                className="border-t border-slate-100 dark:border-slate-800 transition-colors hover:bg-slate-50/40"
                style={{ animation: `rowFadeIn 360ms ${i * 40}ms ease-out backwards` }}
              >
                <td className="px-4 py-4">
                  <div className="font-medium text-slate-900 dark:text-slate-100">{t(`rows.${row.key}.label`)}</div>
                  <div className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
                    {t(`rows.${row.key}.note`)}
                  </div>
                </td>
                <td className="bg-accent-50/30 dark:bg-accent-500/10 px-4 py-4 text-center">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-100 text-accent-700 dark:text-accent-400 ring-1 ring-inset ring-accent-200">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                </td>
                <td className="px-4 py-4 text-center">
                  {row.others === "limited" ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                      {t("paidTier")}
                    </span>
                  ) : (
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
                      <Minus className="h-3.5 w-3.5" />
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-center text-[12px] text-slate-500 dark:text-slate-400">{t("disclaimer")}</p>
      <style jsx>{`
        @keyframes rowFadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
        }
      `}</style>
    </div>
  );
}
