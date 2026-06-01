"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, MousePointerClick } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { linksHref } from "@/lib/host";
import { listMyPosts } from "@/modules/blog/api/posts";
import {
  getAuthorAnalyticsOverview,
  getPostAnalytics,
  type AuthorAnalyticsOverview,
  type PostAnalytics,
} from "@/modules/blog/api/analytics";
import { StatCard, WindowTabs } from "@/modules/blog/components/workspace/analytics-bits";
import { SkeletonRows, SkeletonStatCards } from "@/modules/blog/components/skeleton";

/**
 * "글 안 링크" — author-side view of the clicks the kurl links embedded in their posts have earned
 * (the kurl × weblog tie-in). Built on the existing analytics API: the overview gives lifetime /
 * window totals, and per-post analytics gives the by-post breakdown so an author sees *which* post
 * drives link clicks. Matches the workspace dashboard conventions (StatCard / WindowTabs / ranked
 * rows), not the public reading column.
 */
type LinkRow = {
  postId: number;
  title: string;
  slug: string;
  lifetimeClicks: number;
};

export default function BlogLinksPage() {
  const t = useTranslations("blogWorkspace");
  const { ready, authenticated } = useAuth();
  const [days, setDays] = useState(30);
  const [overview, setOverview] = useState<AuthorAnalyticsOverview | null>(null);
  const [rows, setRows] = useState<LinkRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !authenticated) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [ov, posts] = await Promise.all([
          getAuthorAnalyticsOverview(days),
          listMyPosts(),
        ]);
        if (cancelled) return;
        setOverview(ov);
        // No list endpoint returns clicks-per-post, so fan out per published post and rank by the
        // link clicks each one earned. A failed fetch drops out rather than sinking the whole view.
        const published = posts.filter((p) => p.status === "PUBLISHED");
        const detail = await Promise.all(
          published.map((p) => getPostAnalytics(p.id, days).catch(() => null)),
        );
        if (cancelled) return;
        const built = detail
          .filter((d): d is PostAnalytics => d !== null)
          .map((d) => ({
            postId: d.postId,
            title: d.title,
            slug: d.slug,
            lifetimeClicks: d.lifetimeLinkClicks,
          }))
          .filter((r) => r.lifetimeClicks > 0)
          .sort((a, b) => b.lifetimeClicks - a.lifetimeClicks);
        setRows(built);
      } catch {
        if (!cancelled) {
          setOverview(null);
          setRows(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, days]);

  if (!ready) return null;
  if (!authenticated) {
    return <main className="px-6 py-12 text-slate-600 dark:text-slate-300">{t("loginRequired")}</main>;
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{t("linksTitle")}</h1>
          <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{t("linksSubtitle")}</p>
        </div>
        <WindowTabs days={days} onChange={setDays} />
      </div>

      {loading && !overview ? (
        <div className="mt-6">
          <SkeletonStatCards count={2} />
          <div className="mt-8">
            <SkeletonRows count={5} />
          </div>
        </div>
      ) : !overview ? (
        <p className="mt-8 text-sm text-slate-400 dark:text-slate-500">{t("linksEmpty")}</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <StatCard
              icon={<MousePointerClick className="h-4 w-4" />}
              label={t("analyticsLinkClicks")}
              value={overview.lifetimeLinkClicks}
            />
            <StatCard
              icon={<MousePointerClick className="h-4 w-4" />}
              label={t("linksWindowClicks", { days })}
              value={overview.windowLinkClicks}
            />
          </div>

          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{t("linksByPost")}</h2>
            {rows && rows.length > 0 ? (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((r, i) => (
                  <li key={r.postId}>
                    <a
                      href={`/analytics/${r.postId}`}
                      className="group -mx-3 flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <span className="w-5 shrink-0 text-center text-[13px] font-semibold text-slate-300 dark:text-slate-500">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium text-slate-900 group-hover:text-accent-700 dark:text-slate-100 dark:group-hover:text-accent-300">
                          {r.title || r.slug}
                        </span>
                        <span className="block truncate font-mono text-[12px] text-slate-400 dark:text-slate-500">
                          /{r.slug}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-accent-700 dark:text-accent-300">
                        <MousePointerClick className="h-3.5 w-3.5" />
                        {r.lifetimeClicks.toLocaleString()}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-[13px] text-slate-400 dark:border-slate-700 dark:text-slate-500">
                {t("linksByPostEmpty")}
              </p>
            )}
          </section>

          <a
            href={linksHref("/dashboard")}
            target="_blank"
            rel="noreferrer"
            className="focus-ring mt-8 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/60"
          >
            {t("linksFullDashboard")}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </>
      )}
    </main>
  );
}
