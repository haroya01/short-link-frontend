"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { listMyPosts, type PostStatus, type PostView } from "@/modules/blog/api/posts";

export default function AnalyticsPage() {
  const { ready, authenticated } = useAuth();
  const t = useTranslations("postAnalytics");
  const tc = useTranslations("common");
  const [posts, setPosts] = useState<PostView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPosts(await listMyPosts());
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready || !authenticated) return;
    void load();
  }, [ready, authenticated, load]);

  const stats = useMemo(() => {
    let totalViews = 0;
    let published = 0;
    let drafts = 0;
    for (const p of posts) {
      totalViews += p.viewCount;
      if (p.status === "PUBLISHED") published++;
      else if (p.status === "DRAFT") drafts++;
    }
    return { totalViews, published, drafts };
  }, [posts]);

  if (!ready) return null;
  if (!authenticated) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-slate-600 dark:text-slate-400">{tc("loginRequired")}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-headline-sm font-bold text-slate-900 dark:text-slate-100">{t("title")}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("description")}</p>
      </header>

      <section className="mb-10 grid grid-cols-3 gap-4">
        <StatCard label={t("totalViews")} value={stats.totalViews.toLocaleString()} />
        <StatCard label={t("published")} value={stats.published.toString()} />
        <StatCard label={t("drafts")} value={stats.drafts.toString()} />
      </section>

      {loading && <p className="text-slate-500 dark:text-slate-400">{tc("loading")}</p>}
      {error && (
        <p className="text-red-600 dark:text-red-400">
          {tc("errorPrefix")} {error}
        </p>
      )}

      {!loading && posts.length === 0 && <p className="text-slate-500 dark:text-slate-400">{t("empty")}</p>}

      {!loading && posts.length > 0 && (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs uppercase text-slate-500 dark:text-slate-400">
              <th className="px-2 py-2">{t("colTitle")}</th>
              <th className="px-2 py-2">{t("colStatus")}</th>
              <th className="px-2 py-2 text-right">{t("colViews")}</th>
              <th className="px-2 py-2">{t("colPublished")}</th>
            </tr>
          </thead>
          <tbody>
            {[...posts]
              .sort((a, b) => b.viewCount - a.viewCount)
              .map((p) => (
                <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="px-2 py-3 max-w-xs">
                    <a
                      href={`/write/${p.id}`}
                      className="block truncate text-slate-900 dark:text-slate-100 hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
                    >
                      {p.title}
                    </a>
                    <span className="block text-xs text-slate-500 dark:text-slate-400 font-mono">{p.slug}</span>
                  </td>
                  <td className="px-2 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-2 py-3 text-right font-mono">
                    {p.viewCount.toLocaleString()}
                  </td>
                  <td className="px-2 py-3 text-xs text-slate-500 dark:text-slate-400">
                    {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <p className="text-xs uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: PostStatus }) {
  const map: Record<PostStatus, string> = {
    DRAFT: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
    SCHEDULED: "bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300",
    PUBLISHED: "bg-accent-100 dark:bg-accent-500/15 text-accent-800 dark:text-accent-300",
    UNPUBLISHED: "bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${map[status]}`}>{status}</span>
  );
}
