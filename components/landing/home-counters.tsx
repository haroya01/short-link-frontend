"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useCountUp } from "@/lib/animations";
import { getPublicTotals } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

export function usePublicTotals() {
  const [totals, setTotals] = useState<{ links: number; clicks: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    getPublicTotals()
      .then((d) => {
        if (!cancelled) setTotals(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return totals;
}

export function HomeCounters({
  totals,
}: {
  totals: { links: number; clicks: number };
}) {
  const t = useTranslations("homeStats");
  const links = useCountUp(totals.links, 1200, true);
  const clicks = useCountUp(totals.clicks, 1200, true);

  return (
    <dl className="grid grid-cols-2 divide-x divide-slate-100 text-center">
      <Stat value={formatNumber(links)} label={t("linksLabel")} />
      <Stat value={formatNumber(clicks)} label={t("clicksLabel")} />
    </dl>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-6 py-2">
      <dd className="font-mono text-4xl font-semibold tracking-tight tabular-nums text-slate-900 sm:text-5xl">
        {value}
      </dd>
      <dt className="mt-2 text-xs uppercase tracking-wider text-slate-500">{label}</dt>
    </div>
  );
}
