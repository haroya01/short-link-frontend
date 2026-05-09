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
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">
                {t("th.feature")}
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-accent-700">
                kurl
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                {t("th.others")}
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.key} className="border-t border-slate-100">
                <td className="px-4 py-3.5">
                  <div className="font-medium text-slate-900">{t(`rows.${row.key}.label`)}</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {t(`rows.${row.key}.note`)}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-center">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                </td>
                <td className="px-4 py-3.5 text-center">
                  {row.others === "limited" ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                      {t("paidTier")}
                    </span>
                  ) : (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <Minus className="h-3.5 w-3.5" />
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-center text-xs text-slate-500">{t("disclaimer")}</p>
    </div>
  );
}
