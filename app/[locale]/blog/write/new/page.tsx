"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { createPost } from "@/modules/blog/api/posts";
import { EditorSkeleton } from "@/modules/blog/components/editor/editor-skeleton";

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
  const { ready, authenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!ready || !authenticated || started.current) return;
    started.current = true;
    (async () => {
      // One retry covers the (rare) generated-slug collision.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          // Untitled draft — the editor title field starts empty (placeholder), title is required
          // only at publish.
          const post = await createPost({ slug: randomSlug(), title: "" });
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
  }, [ready, authenticated, router]);

  // Signed-out / expired session is handled one level up by the workspace layout, which redirects
  // to the blog login screen before this page ever renders its content. Nothing to show here.
  if (ready && !authenticated) return null;

  if (error) {
    return (
      <main className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-24 text-center text-slate-500">
        <p className="text-sm text-red-600">{error}</p>
      </main>
    );
  }

  // While the draft is being created, show the editor's skeleton so this page → /write/[id] → the
  // editor is one continuous reveal (no spinner-then-skeleton-then-editor jump).
  return <EditorSkeleton />;
}
