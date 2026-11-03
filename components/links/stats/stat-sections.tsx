"use client";

import { useTranslations } from "next-intl";
import { CopyButton } from "@/components/common/copy-button";
import { EmptyState } from "@/components/common/empty-state";
import { cn, countryFlag } from "@/lib/utils";
import type { StatsLabels } from "@/lib/stats-labels";
import type { CountryClick } from "@/types";
import { STAT_HEADING } from "./stat-heading";

export { STAT_HEADING };

export function BreakdownGrid({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "space-y-10 sm:grid sm:grid-cols-[minmax(0,max-content)_minmax(4rem,1fr)_auto_auto] sm:gap-x-4 sm:gap-y-10 sm:space-y-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Breakdown({
  id,
  title,
  aside,
  note,
  children,
}: {
  id?: string;
  title: string;
  aside?: React.ReactNode;
  note?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 sm:col-span-full sm:grid sm:grid-cols-subgrid sm:content-start sm:gap-y-3">
      <div className="mb-3 flex items-baseline justify-between gap-3 sm:col-span-full sm:mb-0">
        <h2 className={STAT_HEADING}>{title}</h2>
        {aside && <span className="shrink-0 text-[12px] text-slate-500 dark:text-slate-400">{aside}</span>}
      </div>
      {children}
      {note && <p className="mt-3 text-[13px] text-slate-500 dark:text-slate-400 sm:col-span-full sm:mt-0">{note}</p>}
    </section>
  );
}

export function StatsEmpty({ title, shortUrl }: { title: string; shortUrl?: string }) {
  const t = useTranslations("stats");
  return (
    <EmptyState
      title={title}
      className="border-t-0 pt-1"
      action={shortUrl ? <CopyButton variant="outline" size="sm" value={shortUrl} label={t("copyLink")} /> : undefined}
    />
  );
}

export function countryItems(countries: CountryClick[], labels: StatsLabels) {
  return countries.map((c) => {
    const name = labels.country(c.country);
    const code = c.country?.toUpperCase() ?? "";
    const known = name !== labels.unknown && code.length === 2;
    return { label: known ? `${countryFlag(code)} ${name}` : name, count: c.count };
  });
}
