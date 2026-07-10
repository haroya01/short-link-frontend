"use client";

import { useTranslations } from "next-intl";
import { BreakdownList } from "@/components/links/stats/breakdown-list";
import type { ReferrerClick } from "@/types";

type Props = { data: ReferrerClick[] };

/**
 * Referrer URLs read as a ranking, not a distribution — the question is "which links sent people
 * here, in what order", so it uses the same text + fill-bar list language as every other breakdown
 * on the page (referrer hosts, UTM, channel) instead of a standalone vertical bar chart. The
 * visible label keeps the host + path so it stays distinct from the host-only panel beside it; the
 * full URL rides in the hover title.
 */
export function ReferrerChart({ data }: Props) {
  const t = useTranslations("stats");
  if (data.length === 0) {
    return <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">{t("referrerNoData")}</p>;
  }
  const items = data.map((d) => ({
    label: prettyReferrer(d.referrer),
    count: d.count,
    title: d.referrer,
  }));
  return <BreakdownList items={items} />;
}

function prettyReferrer(ref: string): string {
  try {
    const u = new URL(ref);
    const path = u.pathname === "/" ? "" : u.pathname;
    return (u.host.replace(/^www\./, "") + path).replace(/\/$/, "");
  } catch {
    return ref.length > 40 ? ref.slice(0, 40) + "…" : ref;
  }
}
