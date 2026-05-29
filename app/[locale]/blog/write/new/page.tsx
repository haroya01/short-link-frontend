"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { createPost } from "@/modules/blog/api/posts";

/**
 * "글쓰기" lands here, not on a title/slug form. Create a draft on the fly (generated slug +
 * placeholder title) and drop straight into the editor — velog-style. The slug stays editable in
 * the editor until the post is published.
 */
function randomSlug(): string {
  // lowercase + digits only; backend requires >= 2 chars and unique-per-user.
  return "draft-" + Math.random().toString(36).slice(2, 9);
}

export default function NewPostPage() {
  const router = useRouter();
  const t = useTranslations("postEditor");
  const { ready, authenticated, signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!ready || !authenticated || started.current) return;
    started.current = true;
    (async () => {
      // One retry covers the (rare) generated-slug collision.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const post = await createPost({ slug: randomSlug(), title: t("untitled") });
          // Navigate to the sibling editor by swapping the trailing "/new" for the id — this
          // preserves the current path prefix (locale + /blog-preview on the apex, or the bare
          // path on blog.kurl.me). A root-relative `/write/${id}` would drop the prefix → 404.
          router.replace(window.location.pathname.replace(/\/new\/?$/, `/${post.id}`));
          return;
        } catch (e) {
          if (attempt === 1) {
            setError(e instanceof Error ? e.message : "create failed");
            started.current = false;
          }
        }
      }
    })();
  }, [ready, authenticated, router, t]);

  if (ready && !authenticated) {
    return (
      <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
        <p className="text-slate-600">{t("loginRequired")}</p>
        <button
          type="button"
          onClick={() => signInWithGoogle()}
          className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700"
        >
          {t("loginRequired")}
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-24 text-center text-slate-500">
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <>
          <Loader2 className="h-5 w-5 animate-spin text-accent-600" />
          <p className="text-sm">{t("creating")}</p>
        </>
      )}
    </main>
  );
}
