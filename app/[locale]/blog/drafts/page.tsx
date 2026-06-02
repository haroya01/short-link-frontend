"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * 임시저장 was merged into the unified /write list (전체·발행·임시저장 tabs), so this path now just
 * redirects there. Kept as a route so old links / bookmarks don't 404. Swaps only the last segment so
 * it works on every host model (subdomain `/drafts`, dev `/blog-preview/drafts`, path `/{locale}/blog/drafts`).
 */
export default function DraftsRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    router.replace(pathname.replace(/\/drafts\/?$/, "/write"));
  }, [pathname, router]);
  return null;
}
