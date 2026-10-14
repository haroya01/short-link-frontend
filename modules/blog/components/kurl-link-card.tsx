"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { getPublicLinkStats } from "@/lib/api/stats";
import { linksHref } from "@/lib/host";
import { SHORT_HOST } from "@/modules/blog/lib/kurl-link";
import type { CountryClick, DeviceClick } from "@/types/clicks";
import type { LinkStats } from "@/types/stats";

function top<T extends { count: number }>(arr: T[]): T | null {
  return arr.length ? arr.reduce((a, b) => (b.count > a.count ? b : a)) : null;
}

function pct(n: number, total: number): string {
  return total > 0 ? `${Math.round((n / total) * 100)}%` : "—";
}

/**
 * A kurl short link embedded in a post, rendered as a live mini-dashboard — total clicks, top
 * country, top device, a click sparkline — pulled from the link's public stats. This is the
 * "people who share links" wedge: the post is backed by measured links, which only kurl can show.
 * Links that aren't opted into public stats fall back to a plain link card.
 */
export function KurlLinkCard({ code, url }: { code: string; url: string }) {
  const t = useTranslations("publicPost");
  // Plain fetch (not react-query) — the public reader isn't wrapped in a QueryProvider.
  const [data, setData] = useState<LinkStats | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "fallback">("loading");
  const shortLabel = `${SHORT_HOST}/${code}`;

  useEffect(() => {
    let active = true;
    getPublicLinkStats(code)
      .then((d) => {
        if (active) {
          setData(d);
          setState("ok");
        }
      })
      // 404 = not opted into public stats; any error → plain link card.
      .catch(() => active && setState("fallback"));
    return () => {
      active = false;
    };
  }, [code]);

  if (state === "loading") {
    return (
      <div className="my-8 h-28 animate-pulse rounded-surface border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900" />
    );
  }

  if (state === "fallback" || !data) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="my-8 flex items-center justify-between gap-3 rounded-surface border border-slate-200 bg-slate-50/60 px-5 py-4 !no-underline transition-colors hover:border-slate-300 hover:bg-slate-100/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-800"
      >
        <span className="min-w-0 truncate text-sm font-medium text-slate-900 dark:text-slate-100">{shortLabel}</span>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
      </a>
    );
  }

  const country = top<CountryClick>(data.countryClicks);
  const device = top<DeviceClick>(data.deviceClicks);
  const spark = data.dailyClicks.slice(-24);
  const sparkMax = Math.max(1, ...spark.map((d) => d.count));

  return (
    <div className="my-8 overflow-hidden rounded-surface border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-2.5 !no-underline transition-colors hover:bg-slate-100/60 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800"
      >
        <span className="min-w-0 truncate font-mono text-[13px] font-medium text-slate-700 dark:text-slate-300">{shortLabel}</span>
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </a>

      <div className="flex flex-wrap items-end gap-x-8 gap-y-4 px-5 py-4">
        <div>
          <div className="text-[26px] font-bold leading-none tracking-tight text-slate-900 dark:text-slate-100">
            {data.totalClicks.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {t("linkClicks")}
          </div>
        </div>

        {country && (
          <Metric label={t("linkTopCountry")} value={country.country} sub={pct(country.count, data.totalClicks)} />
        )}
        {device && (
          <Metric label={t("linkTopDevice")} value={device.device} sub={pct(device.count, data.totalClicks)} />
        )}

        {spark.length > 1 && (
          <div className="ml-auto flex h-9 items-end gap-[2px]" aria-hidden>
            {spark.map((d, i) => (
              <span
                key={i}
                className="w-[3px] rounded-sm bg-slate-300 dark:bg-slate-600"
                style={{ height: `${Math.max(8, (d.count / sparkMax) * 100)}%` }}
              />
            ))}
          </div>
        )}
      </div>

      <a
        href={linksHref(`/stats/${code}/public`)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 border-t border-slate-100 px-5 py-2 text-[12px] font-medium text-slate-700 !no-underline transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        {t("linkFullStats")}
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
      </a>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline gap-1.5">
        <span className="truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">{value}</span>
        <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">{sub}</span>
      </div>
      <div className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}
