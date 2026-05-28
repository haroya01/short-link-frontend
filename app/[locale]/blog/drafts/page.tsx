"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { listMyPosts, type PostView } from "@/lib/api/posts";
import { PostRow } from "@/components/blog/workspace/post-row";

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
    return <main className="px-6 py-12 text-slate-600">{t("loginRequired")}</main>;
  }

  const drafts = posts.filter((p) => p.status !== "PUBLISHED");

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("draftsTitle")}</h1>
      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-slate-400">{t("loading")}</p>
        ) : drafts.length === 0 ? (
          <p className="text-sm text-slate-400">{t("draftsEmpty")}</p>
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
