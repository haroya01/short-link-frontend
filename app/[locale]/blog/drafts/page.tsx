"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { listMyPosts, type PostView } from "@/modules/blog/api/posts";
import { PostRow } from "@/modules/blog/components/workspace/post-row";
import { SkeletonRows } from "@/modules/blog/components/skeleton";

export default function BlogDraftsPage() {
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
    return <main className="px-6 py-12 text-slate-600 dark:text-slate-300">{t("loginRequired")}</main>;
  }

  const drafts = posts.filter((p) => p.status !== "PUBLISHED");

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{t("draftsTitle")}</h1>
      <div className="mt-6">
        {loading ? (
          <SkeletonRows count={5} thumb />
        ) : drafts.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">{t("draftsEmpty")}</p>
        ) : (
          <ul>
            {drafts.map((p) => (
              <PostRow key={p.id} post={p} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
