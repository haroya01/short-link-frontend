"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { deletePost, listMyPosts, type PostView } from "@/modules/blog/api/posts";
import { PostRow } from "@/modules/blog/components/workspace/post-row";
import { SkeletonRows } from "@/modules/blog/components/skeleton";
import { useToast } from "@/components/ui/toast";

export default function BlogPostsPage() {
  const t = useTranslations("blogWorkspace");
  const { ready, authenticated } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<PostView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !authenticated) return;
    listMyPosts()
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [ready, authenticated]);

  function handleDelete(post: PostView) {
    if (!window.confirm(t("rowDeleteConfirm", { title: post.title || post.slug }))) return;
    const prev = posts;
    setPosts((cur) => cur.filter((p) => p.id !== post.id)); // optimistic
    deletePost(post.id).catch(() => {
      setPosts(prev);
      toast(t("rowDeleteFailed"), "error");
    });
  }

  if (!ready) return null;
  if (!authenticated) {
    return <main className="px-6 py-12 text-slate-600 dark:text-slate-300">{t("loginRequired")}</main>;
  }

  const published = posts.filter((p) => p.status === "PUBLISHED");

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{t("postsTitle")}</h1>
      <div className="mt-6">
        {loading ? (
          <SkeletonRows count={6} thumb />
        ) : published.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">{t("postsEmpty")}</p>
        ) : (
          <ul>
            {published.map((p) => (
              <PostRow key={p.id} post={p} onDelete={handleDelete} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
