"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { formatNumber } from "@/lib/utils";
import {
  getBlogAdminMetrics,
  type BlogAdminMetrics,
} from "@/modules/blog/api/admin";

/**
 * Blog-wide admin metrics — the cross-author rollup (total reads, active authors, top posts). Admin
 * gated like the moderation queue; the data comes from {@link getBlogAdminMetrics} (mock until the
 * backend endpoint lands).
 */
export default function BlogAdminMetricsPage() {
  const { ready, authenticated, isAdmin } = useAuth();
  const t = useTranslations("blogAdminMetrics");
  const tc = useTranslations("common");
  const [data, setData] = useState<BlogAdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !authenticated || !isAdmin) return;
    let alive = true;
    setLoading(true);
    setError(null);
    getBlogAdminMetrics()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e instanceof Error ? e.message : t("loadFailed")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [ready, authenticated, isAdmin, t]);

  if (!ready) return null;
  if (!authenticated || !isAdmin) notFound();

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t("title")}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("subtitle")}</p>
      </header>

      {loading && <p className="text-slate-500 dark:text-slate-400">{tc("loading")}</p>}
      {error && (
        <p className="text-red-600 dark:text-red-400">
          {tc("errorPrefix")} {error}
        </p>
      )}

      {!loading && !error && data && (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard label={t("metric.totalPosts")} value={formatNumber(data.totalPosts)} />
            <MetricCard label={t("metric.totalReads")} value={formatNumber(data.totalReads)} />
            <MetricCard label={t("metric.activeAuthors")} value={formatNumber(data.activeAuthors)} />
            <MetricCard label={t("metric.openReports")} value={formatNumber(data.openReports)} />
          </section>

          <section className="mt-10">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t("topPosts.title")}
            </h2>
            {data.topPosts.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("empty")}</p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs uppercase text-slate-500 dark:text-slate-400">
                    <th className="px-2 py-2">{t("topPosts.post")}</th>
                    <th className="px-2 py-2">{t("topPosts.author")}</th>
                    <th className="px-2 py-2 text-right">{t("topPosts.reads")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topPosts.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="px-2 py-3 max-w-sm">
                        {p.url ? (
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block truncate font-medium text-slate-900 dark:text-slate-100 hover:underline"
                          >
                            {p.title}
                          </a>
                        ) : (
                          <span className="block truncate font-medium text-slate-900 dark:text-slate-100">
                            {p.title}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-slate-600 dark:text-slate-400">@{p.authorHandle}</td>
                      <td className="px-2 py-3 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100">
                        {formatNumber(p.reads)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
        {value}
      </p>
    </div>
  );
}
