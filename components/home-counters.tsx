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

  return (
    <div className="container max-w-3xl py-8">
      <dl className="grid grid-cols-2 gap-3">
        <Stat value={formatNumber(links)} label={t("linksLabel")} />
        <Stat value={formatNumber(clicks)} label={t("clicksLabel")} />
      </dl>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 text-center">
      <dd className="font-mono text-3xl font-semibold tracking-tight tabular-nums text-slate-900">
        {value}
      </dd>
      <dt className="mt-1 text-xs uppercase tracking-wider text-slate-500">{label}</dt>
    </div>
  );
}
