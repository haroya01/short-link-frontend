"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useCountUp } from "@/lib/animations";
import { getPublicTotals } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

export function HomeCounters() {
  const t = useTranslations("homeStats");
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

  const links = useCountUp(totals?.links ?? 0, 1200, totals !== null);
  const clicks = useCountUp(totals?.clicks ?? 0, 1200, totals !== null);

  if (!totals) return null;
  if (totals.links === 0 && totals.clicks === 0) return null;

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
