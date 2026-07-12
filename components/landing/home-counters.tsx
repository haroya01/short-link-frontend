"use client";

import { useTranslations } from "next-intl";
import { useCountUp } from "@/lib/animations";
import { formatNumber } from "@/lib/utils";

export function HomeCounters({
  totals,
}: {
  totals: { links: number; clicks: number };
}) {
  const t = useTranslations("homeStats");
  const links = useCountUp(totals.links, 1200, true);
  const clicks = useCountUp(totals.clicks, 1200, true);

  return (
    <dl className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800 text-center">
      <Stat value={formatNumber(links)} label={t("linksLabel")} />
      <Stat value={formatNumber(clicks)} label={t("clicksLabel")} />
    </dl>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-6 py-2">
      <dd className="font-mono text-4xl font-semibold tracking-tight tabular-nums text-slate-900 dark:text-slate-100 sm:text-5xl">
        {value}
      </dd>
      <dt className="mt-2 text-xs text-slate-500 dark:text-slate-400">{label}</dt>
    </div>
  );
}
