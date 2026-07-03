"use client";

import { useEffect, useRef, useState } from "react";
import { notFound } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ApiError, getAdminActivity } from "@/lib/api";
import { Section } from "@/components/common/section";
import { Link } from "@/i18n/navigation";
import { dateLocale } from "@/lib/date";
import { formatNumber } from "@/lib/utils";
import type { AdminActivity } from "@/types";

const MAX_ROWS = 8;

/**
 * Live admin activity band on the overview page. Refetches every 30s, skipping a tick while a
 * request is still in flight so a slow response never stacks. Only the very first load hard-404s on
 * an auth rejection (the same gate the rest of the admin surface uses); later poll errors are
 * swallowed so a transient blip doesn't wipe a working panel.
 */
export function ActivityFeed() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [data, setData] = useState<AdminActivity | null>(null);
  const inFlight = useRef(false);
  const initial = useRef(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const next = await getAdminActivity();
        if (!cancelled) setData(next);
      } catch (err) {
        if (
          initial.current &&
          err instanceof ApiError &&
          (err.status === 401 || err.status === 403)
        ) {
          notFound();
        }
        // Poll errors are swallowed on purpose.
      } finally {
        inFlight.current = false;
        initial.current = false;
      }
    }

    load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const recentLinks = data?.recentLinks ?? [];
  const recentClicks = data?.recentClicks ?? [];
  const trending = data?.trending24h ?? [];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Section
        title={t("activity.recentLinksTitle")}
        description={t("activity.recentLinksDesc")}
      >
        {recentLinks.length === 0 ? (
          <EmptyLine text={t("activity.empty.links")} />
        ) : (
          <ul className="space-y-2.5">
            {recentLinks.slice(0, MAX_ROWS).map((l) => (
              <li key={l.shortCode} className="flex items-center gap-2 text-[13px]">
                <Link
                  href={`/admin/links/${l.shortCode}`}
                  className="shrink-0 font-mono font-medium text-slate-900 hover:underline dark:text-slate-100"
                >
                  /{l.shortCode}
                </Link>
                <span
                  className="min-w-0 flex-1 truncate text-slate-500 dark:text-slate-400"
                  title={l.originalUrl}
                >
                  {hostOf(l.originalUrl)}
                </span>
                <time className="shrink-0 font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                  {shortTime(l.createdAt, locale)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title={t("activity.recentClicksTitle")}
        description={t("activity.recentClicksDesc")}
      >
        {recentClicks.length === 0 ? (
          <EmptyLine text={t("activity.empty.clicks")} />
        ) : (
          <ul className="space-y-2.5">
            {recentClicks.slice(0, MAX_ROWS).map((c, i) => (
              <li
                key={`${c.shortCode}-${c.clickedAt}-${i}`}
                className="flex items-center gap-2 text-[13px]"
              >
                <Link
                  href={`/admin/links/${c.shortCode}`}
                  className="shrink-0 font-mono font-medium text-slate-900 hover:underline dark:text-slate-100"
                >
                  /{c.shortCode}
                </Link>
                {c.country && (
                  <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {c.country}
                  </span>
                )}
                {c.deviceClass && (
                  <span className="shrink-0 text-slate-500 dark:text-slate-400">
                    {c.deviceClass}
                  </span>
                )}
                {c.referrerHost && (
                  <span
                    className="min-w-0 flex-1 truncate text-slate-500 dark:text-slate-400"
                    title={c.referrerHost}
                  >
                    {c.referrerHost}
                  </span>
                )}
                <time className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                  {shortTime(c.clickedAt, locale)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t("activity.trendingTitle")} description={t("activity.trendingDesc")}>
        {trending.length === 0 ? (
          <EmptyLine text={t("activity.empty.trending")} />
        ) : (
          <ul className="space-y-2.5">
            {trending.slice(0, MAX_ROWS).map((l) => (
              <li key={l.shortCode} className="flex items-center gap-2 text-[13px]">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-600" aria-hidden />
                <Link
                  href={`/admin/links/${l.shortCode}`}
                  className="shrink-0 font-mono font-medium text-slate-900 hover:underline dark:text-slate-100"
                >
                  /{l.shortCode}
                </Link>
                <span
                  className="min-w-0 flex-1 truncate text-slate-500 dark:text-slate-400"
                  title={l.ownerEmail ?? undefined}
                >
                  {l.ownerEmail ?? t("table.anonymous")}
                </span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                  {formatNumber(l.clickCount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">{text}</p>;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function shortTime(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(dateLocale(locale), {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Seoul",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
