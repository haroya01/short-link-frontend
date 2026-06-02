"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { deletePost, listMyPosts, type PostView } from "@/modules/blog/api/posts";

/**
 * Loads the signed-in author's posts and owns the optimistic row-delete, shared by the published
 * (/blog/posts) and drafts (/blog/drafts) lists — they differ only in how they filter the result and
 * their copy, so the fetch + delete + auth gating lived as a verbatim copy in each. The list loads
 * once the viewer is known; delete confirms, removes the row optimistically, and restores it (with a
 * toast) if the request fails.
 *
 * Returns `ready`/`authenticated` so the page keeps rendering its own login-required state (the markup
 * differs per page), then filters `posts` itself.
 */
export function useMyPosts() {
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

  return { ready, authenticated, posts, loading, handleDelete };
}
