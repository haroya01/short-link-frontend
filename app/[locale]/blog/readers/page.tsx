"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { getPostStats } from "@/modules/blog/api/analytics";
import { listMyPosts, type PostView } from "@/modules/blog/api/posts";
import { AnalyticsTabs } from "@/modules/blog/components/workspace/analytics-tabs";
import { ProfileStatsDashboard } from "@/modules/profile/components/stats-dashboard";
import type { ProfileStats } from "@/types";
import { SkeletonRows, SkeletonStatCards } from "@/modules/blog/components/skeleton";

/**
 * 방문자 = blog READERS, per post — who read each post and from where, at short-link-stats depth.
 * (Not the /u/ link-in-bio profile-visit dashboard — that lives on the public /u/{user}/stats page.)
 * Pick a published post; its reader breakdown renders via the shared ProfileStatsDashboard, fed by
 * GET /api/v1/posts/{id}/stats. Per-post deep analytics also reachable from 글 분석 → a post.
 */
export default function ReadersPage() {
  const t = useTranslations("blogWorkspace");
  const { ready, authenticated } = useAuth();
  const [posts, setPosts] = useState<PostView[] | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Published posts only — drafts have no public reads. Most-viewed first so the default selection
  // lands on the post worth looking at.
  const published = useMemo(
    () =>
      (posts ?? [])
        .filter((p) => p.status === "PUBLISHED")
        .sort((a, b) => b.viewCount - a.viewCount),
    [posts],
  );

  useEffect(() => {
    if (!ready || !authenticated) return;
    listMyPosts()
      .then(setPosts)
      .catch(() => setPosts([]));
  }, [ready, authenticated]);

  // Default-select the top post once the list loads.
  useEffect(() => {
    if (selected == null && published.length > 0) setSelected(published[0].id);
  }, [published, selected]);

  useEffect(() => {
    if (selected == null) return;
    setStatsLoading(true);
    getPostStats(selected)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  }, [selected]);

  if (!ready) return null;
  if (!authenticated) {
    return <main className="px-6 py-12 text-slate-600 dark:text-slate-300">{t("loginRequired")}</main>;
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <AnalyticsTabs active="readers" />
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {t("readersTitle")}
        </h1>
        <p className="mt-1 text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
          {t("readersIntro")}
        </p>
      </div>

      {posts === null ? (
        <div className="mt-6">
          <SkeletonRows count={2} />
          <div className="mt-6">
            <SkeletonStatCards />
          </div>
        </div>
      ) : published.length === 0 ? (
        <p className="mt-8 text-sm text-slate-400 dark:text-slate-500">{t("readersNoPosts")}</p>
      ) : (
        <>
          {/* Post selector — pick which post's readers to inspect. */}
          <div className="mt-5 flex flex-wrap gap-1.5">
            {published.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelected(p.id)}
                aria-pressed={selected === p.id}
                className={`focus-ring max-w-[18rem] truncate rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  selected === p.id
                    ? "bg-accent-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-accent-50 hover:text-accent-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-accent-500/15 dark:hover:text-accent-400"
                }`}
              >
                {p.title || p.slug}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {statsLoading && !stats ? (
              <>
                <SkeletonStatCards />
                <div className="mt-8">
                  <SkeletonRows count={4} />
                </div>
              </>
            ) : stats ? (
              <ProfileStatsDashboard data={stats} />
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500">{t("analyticsEmpty")}</p>
            )}
          </div>
        </>
      )}
    </main>
  );
}
