"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { listMyPosts, type PostView } from "@/modules/blog/api/posts";
import { PostRow } from "@/modules/blog/components/workspace/post-row";

export default function BlogOverviewPage() {
  const t = useTranslations("blogWorkspace");
  const { ready, authenticated } = useAuth();
  const [posts, setPosts] = useState<PostView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !authenticated) return;
    listMyPosts()
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [ready, authenticated]);

  if (!ready) return null;
  if (!authenticated) {
    return <main className="px-6 py-12 text-slate-600">{t("loginRequired")}</main>;
  }

  const published = posts.filter((p) => p.status === "PUBLISHED");
  const drafts = posts.filter((p) => p.status !== "PUBLISHED");
  const views = published.reduce((sum, p) => sum + p.viewCount, 0);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("overviewTitle")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("overviewSubtitle")}</p>
        </div>
        <a
          href="/write"
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-700"
        >
          <Plus className="h-4 w-4" />
          {t("newPost")}
        </a>
      </header>

      <div className="mt-8 grid grid-cols-3 gap-3">
        <Stat label={t("statPublished")} value={published.length} />
        <Stat label={t("statDrafts")} value={drafts.length} />
        <Stat label={t("statViews")} value={views} />
      </div>

      <section className="mt-10">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">{t("recent")}</h2>
        {loading ? (
          <p className="text-sm text-slate-400">{t("loading")}</p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-slate-400">{t("postsEmpty")}</p>
        ) : (
          <ul>
            {posts.slice(0, 6).map((p) => (
              <PostRow key={p.id} post={p} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 px-4 py-4">
      <p className="text-[13px] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
    </div>
  );
}
