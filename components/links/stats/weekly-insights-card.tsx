"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, ChevronDown, Minus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getWeeklyInsights } from "@/lib/api";
import type { WeeklyInsights } from "@/types";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";

const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export function WeeklyInsightsCard() {
  const t = useTranslations("weeklyInsights");
  const fmt = useFormatter();
  const { ready, authenticated } = useAuth();
  const [data, setData] = useState<WeeklyInsights | null>(null);
  const [loading, setLoading] = useState(true);
  // Collapsed on mobile so the dashboard table sits one viewport away instead of three.
  // The delta badge + eyebrow stays visible — the high-signal "did this week go better" question
  // is answerable without expanding. Desktop ignores this; the card is always open on sm+.
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // The insights endpoint is authenticated (401 for anon). Wait for auth to settle and gate on a
    // signed-in viewer so we never fire a guaranteed-401 (which triggers a cross-subdomain refresh);
    // a signed-out viewer keeps the skeleton until the dashboard's login-wall branch unmounts this.
    if (!ready || !authenticated) return;
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
  }, [ready, authenticated]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between p-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="hidden gap-4 px-5 pb-5 sm:grid sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5 p-1.5 -m-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // `!== 0` alone let a malformed/absent totalClicks (undefined or a non-finite division result) skip
  // the empty state, and the card then rendered "NaN" through every fmt.number. Fall back to the
  // intended empty state whenever there's no finite, positive click count to show.
  if (!data || !Number.isFinite(data.totalClicks) || data.totalClicks <= 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 p-5">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("eyebrow")}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("emptyDesc")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        aria-expanded={mobileOpen}
        className="flex w-full items-baseline justify-between gap-3 p-5 text-left sm:cursor-default"
      >
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("eyebrow")}</p>
        <div className="flex items-center gap-2">
          <DeltaBadge delta={data.deltaPercent} t={t} fmt={fmt} />
          <ChevronDown
            aria-hidden
            className={cn(
              "h-4 w-4 text-slate-400 dark:text-slate-500 transition-transform sm:hidden",
              mobileOpen && "rotate-180",
            )}
          />
        </div>
      </button>

      <div
        className={cn(
          "grid gap-4 px-5 pb-5 sm:grid-cols-2 sm:!grid lg:grid-cols-4",
          mobileOpen ? "grid" : "hidden",
        )}
      >
        <Stat
          label={t("humanClicks")}
          value={fmt.number(data.humanClicks)}
          sub={
            Number.isFinite(data.humanRatio)
              ? t("humanRatio", { percent: Math.round((data.humanRatio as number) * 100) })
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
  // `== null` alone let a NaN delta (a 0/0 growth ratio when the prior week had no clicks) render as
  // "NaN%". Treat any non-finite delta as "no baseline" — the same intent the null case already had.
  if (!Number.isFinite(delta)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
        <Minus className="h-3 w-3" />
        {t("noBaseline")}
      </span>
    );
  }
  const value = delta as number;
  const positive = value > 0;
  const flat = Math.abs(value) < 0.005;
  const Icon = flat ? Minus : positive ? ArrowUpRight : ArrowDownRight;
  const tone = flat
    ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
    : positive
      ? "bg-accent-50 dark:bg-accent-500/10 text-accent-700 dark:text-accent-400 ring-1 ring-inset ring-accent-200 dark:ring-accent-500/30"
      : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 ring-1 ring-inset ring-red-200 dark:ring-red-500/30";
  return (
    <span className={"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium " + tone}>
      <Icon className="h-3 w-3" />
      {fmt.number(value, { style: "percent", maximumFractionDigits: 0 })}
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
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p
        className={
          (mono ? "font-mono " : "") +
          "mt-1 truncate text-lg font-semibold text-slate-900 dark:text-slate-100"
        }
        title={value}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">{sub}</p>}
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="group block rounded-md border border-transparent p-1.5 -m-1.5 hover:border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
      >
        {content}
        <ArrowRight className="mt-1 h-3 w-3 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
      </Link>
    );
  }
  return <div className="p-1.5 -m-1.5">{content}</div>;
}
