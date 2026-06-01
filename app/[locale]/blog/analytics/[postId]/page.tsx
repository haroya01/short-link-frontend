"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Eye, Heart, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getPostAnalytics, type PostAnalytics } from "@/modules/blog/api/analytics";
import { AnalyticsAreaChart } from "@/modules/blog/components/workspace/analytics-area-chart";
import { StatCard, WindowTabs } from "@/modules/blog/components/workspace/analytics-bits";

export default function PostAnalyticsPage() {
  const t = useTranslations("blogWorkspace");
  const params = useParams();
  const postId = Number(params.postId);
  const { ready, authenticated } = useAuth();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<PostAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !authenticated || !Number.isFinite(postId)) return;
    setLoading(true);
    getPostAnalytics(postId, days)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [ready, authenticated, postId, days]);

  if (!ready) return null;
  if (!authenticated) {
    return <main className="px-6 py-12 text-slate-600">{t("loginRequired")}</main>;
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <a
        href="/analytics"
        className="focus-ring inline-flex items-center gap-1.5 rounded text-[13px] font-medium text-slate-500 transition-colors hover:text-accent-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("analyticsTitle")}
      </a>

      {loading && !data ? (
        <p className="mt-6 text-sm text-slate-400">{t("loading")}</p>
      ) : !data ? (
        <p className="mt-6 text-sm text-slate-400">{t("analyticsEmpty")}</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <h1 className="max-w-xl text-2xl font-bold tracking-tight text-slate-900">
              {data.title || data.slug}
            </h1>
            <WindowTabs days={days} onChange={setDays} />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <StatCard icon={<TrendingUp className="h-4 w-4" />} label={t("analyticsWindowViews", { days })} value={data.windowViews} />
            <StatCard icon={<Eye className="h-4 w-4" />} label={t("analyticsLifetimeViews")} value={data.lifetimeViews} />
            <StatCard icon={<Heart className="h-4 w-4" />} label={t("analyticsLifetimeLikes")} value={data.lifetimeLikes} />
          </div>

          <section className="mt-8 rounded-2xl border border-slate-200 p-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">{t("analyticsOverTime")}</h2>
            <AnalyticsAreaChart data={data.daily} />
          </section>
        </>
      )}
    </main>
  );
}
