"use client";

import { useTranslations } from "next-intl";
import { PostRow } from "@/modules/blog/components/workspace/post-row";
import { SkeletonRows } from "@/modules/blog/components/skeleton";
import { useMyPosts } from "@/modules/blog/lib/use-my-posts";

export default function BlogDraftsPage() {
  const t = useTranslations("blogWorkspace");
  const { ready, authenticated, posts, loading, handleDelete } = useMyPosts();

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
              <PostRow key={p.id} post={p} onDelete={handleDelete} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
