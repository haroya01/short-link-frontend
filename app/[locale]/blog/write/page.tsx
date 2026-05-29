"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PenSquare } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { listMyPosts, type PostStatus, type PostView } from "@/modules/blog/api/posts";

export default function WriteIndexPage() {
  const t = useTranslations("postEditor");
  const { ready, authenticated } = useAuth();
  const [posts, setPosts] = useState<PostView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Preserve the current path prefix (locale + /blog-preview on the apex) for intra-blog links —
  // a root-relative "/write/..." would drop the prefix and 404.
  const [writeBase, setWriteBase] = useState("/write");

  useEffect(() => {
    const i = window.location.pathname.indexOf("/write");
    if (i >= 0) setWriteBase(window.location.pathname.slice(0, i + "/write".length));
  }, []);

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

  if (!ready) return null;
  if (!authenticated) {
    return <main className="mx-auto max-w-2xl px-6 py-12 text-slate-600">{t("loginRequired")}</main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("myPosts")}</h1>
        <a
          href={`${writeBase}/new`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-700"
        >
          <PenSquare className="h-4 w-4" />
          {t("newPost")}
        </a>
      </header>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-slate-400">{t("listLoading")}</p>}
      {!loading && posts.length === 0 && <p className="text-slate-400">{t("noPosts")}</p>}
      {!loading && posts.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {posts.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-3">
              <StatusBadge status={p.status} />
              <a
                href={`${writeBase}/${p.id}`}
                className={`flex-1 truncate text-sm transition-colors hover:text-accent-700 ${
                  p.title.trim() ? "text-slate-900" : "text-slate-400"
                }`}
              >
                {p.title.trim() || t("untitled")}
              </a>
              <span className="font-mono text-xs text-slate-400">{p.slug}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: PostStatus }) {
  const map: Record<PostStatus, string> = {
    DRAFT: "bg-slate-100 text-slate-600",
    SCHEDULED: "bg-blue-100 text-blue-700",
    PUBLISHED: "bg-accent-100 text-accent-800",
    UNPUBLISHED: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${map[status]}`}>{status}</span>
  );
}
