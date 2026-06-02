"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * 발행 글 was merged into the unified /write list (전체·발행·임시저장 tabs), so this path now just
 * redirects there. Kept as a route so old links / bookmarks don't 404. Swaps only the last segment so
 * it works on every host model (subdomain `/posts`, dev `/blog-preview/posts`, path `/{locale}/blog/posts`).
 */
export default function PostsRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    router.replace(pathname.replace(/\/posts\/?$/, "/write"));
  }, [pathname, router]);
  return null;
}
