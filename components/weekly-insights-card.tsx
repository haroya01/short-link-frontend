"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getWeeklyInsights } from "@/lib/api";
import type { WeeklyInsights } from "@/types";
import { Skeleton } from "./ui/skeleton";

const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export function WeeklyInsightsCard() {
  const t = useTranslations("weeklyInsights");
  const fmt = useFormatter();
  const [data, setData] = useState<WeeklyInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getWeeklyInsights()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-3 h-7 w-32" />
        <Skeleton className="mt-2 h-3 w-48" />
      </div>
    );
  }

  if (!data || data.totalClicks === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-5 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
          {t("eyebrow")}
        </p>
        <p className="mt-2 text-sm text-slate-600">{t("emptyDesc")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
          {t("eyebrow")}
        </p>
        <DeltaBadge delta={data.deltaPercent} t={t} fmt={fmt} />
      </div>

      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={t("humanClicks")}
          value={fmt.number(data.humanClicks)}
          sub={
            data.humanRatio != null
              ? t("humanRatio", { percent: Math.round(data.humanRatio * 100) })
              : undefined
          }
        />
        <Stat
          label={t("topLink")}
          value={data.topLink ? `/${data.topLink.shortCode}` : "—"}
          sub={
            data.topLink
              ? t("topLinkSub", {
                  count: data.topLink.clicks,
                  source: data.topLink.topUtmSource ?? t("noUtm"),
                })
              : undefined
          }
          mono
          href={data.topLink ? `/stats/${data.topLink.shortCode}` : undefined}
        />
        <Stat
          label={t("peak")}
          value={
            data.peak
              ? t("peakValue", {
                  day: t(`days.${DAY_NAMES[(data.peak.dayOfWeek - 1) % 7]}`),
                  hour: data.peak.hour,
                })
              : "—"
          }
          sub={data.peak ? t("peakSub", { count: data.peak.clicks }) : undefined}
        />
        <Stat
          label={t("compareLabel")}
          value={fmt.number(data.previousHumanClicks)}
          sub={t("compareSub")}
        />
      </div>
    </div>
  );
}

function DeltaBadge({
  delta,
  t,
  fmt,
}: {
  delta: number | null;
  t: ReturnType<typeof useTranslations<"weeklyInsights">>;
  fmt: ReturnType<typeof useFormatter>;
}) {
  if (delta == null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
        <Minus className="h-3 w-3" />
        {t("noBaseline")}
      </span>
    );
  }
  const positive = delta > 0;
  const flat = Math.abs(delta) < 0.005;
  const Icon = flat ? Minus : positive ? ArrowUpRight : ArrowDownRight;
  const tone = flat
    ? "bg-slate-100 text-slate-600"
    : positive
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
      : "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200";
  return (
    <span className={"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium " + tone}>
      <Icon className="h-3 w-3" />
      {fmt.number(delta, { style: "percent", maximumFractionDigits: 0 })}
    </span>
  );
}

function Stat({
  label,
  value,
  sub,
  mono,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  mono?: boolean;
  href?: string;
}) {
  const content = (
    <>
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className={
          (mono ? "font-mono " : "") +
          "mt-1 truncate text-lg font-semibold text-slate-900"
        }
        title={value}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 truncate text-[11px] text-slate-500">{sub}</p>}
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="group block rounded-md border border-transparent p-1.5 -m-1.5 hover:border-slate-200 hover:bg-slate-50"
      >
        {content}
        <ArrowRight className="mt-1 h-3 w-3 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
      </Link>
    );
  }
  return <div className="p-1.5 -m-1.5">{content}</div>;
}
