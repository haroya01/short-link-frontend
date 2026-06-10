"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, MousePointerClick } from "lucide-react";
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
      <div className="my-8 h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900" />
    );
  }

  if (state === "fallback" || !data) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="my-8 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-5 py-4 no-underline transition-colors hover:border-accent-300 hover:bg-accent-50/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-accent-500/40 dark:hover:bg-slate-800"
      >
        <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
          <MousePointerClick className="h-4 w-4 shrink-0 text-accent-600" />
          <span className="truncate">{shortLabel}</span>
        </span>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-accent-600" />
      </a>
    );
  }

  const country = top<CountryClick>(data.countryClicks);
  const device = top<DeviceClick>(data.deviceClicks);
  const spark = data.dailyClicks.slice(-24);
  const sparkMax = Math.max(1, ...spark.map((d) => d.count));

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-2.5 no-underline transition-colors hover:bg-accent-50/40 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800"
      >
        <span className="flex min-w-0 items-center gap-1.5 font-mono text-[13px] font-medium text-slate-700 dark:text-slate-300">
          <MousePointerClick className="h-3.5 w-3.5 shrink-0 text-accent-600" />
          <span className="truncate">{shortLabel}</span>
        </span>
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </a>

      <div className="flex flex-wrap items-end gap-x-8 gap-y-4 px-5 py-4">
        <div>
          <div className="text-[26px] font-bold leading-none tracking-tight text-slate-900 dark:text-slate-100">
            {data.totalClicks.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            clicks
          </div>
        </div>

        {country && (
          <Metric label="top country" value={country.country} sub={pct(country.count, data.totalClicks)} />
        )}
        {device && (
          <Metric label="top device" value={device.device} sub={pct(device.count, data.totalClicks)} />
        )}

        {spark.length > 1 && (
          <div className="ml-auto flex h-9 items-end gap-[2px]" aria-hidden>
            {spark.map((d, i) => (
              <span
                key={i}
                className="w-[3px] rounded-sm bg-accent-200"
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
        className="block border-t border-slate-100 px-5 py-2 text-[12px] font-medium text-accent-700 no-underline transition-colors hover:bg-accent-50/40 dark:border-slate-800 dark:text-accent-400 dark:hover:bg-accent-500/10"
      >
        Full stats on kurl →
      </a>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline gap-1.5">
        <span className="truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">{value}</span>
        <span className="text-[12px] font-medium text-accent-700">{sub}</span>
      </div>
      <div className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}
