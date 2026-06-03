"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Series management moved into 내 글 (the unified content home) as its "시리즈별 보기" view, so this
 * standalone route just forwards there — keeping any existing /…/series links/bookmarks working.
 * Client-side so the deploy prefix (/blog-preview · /blog · "") is preserved from the live pathname.
 */
export default function SeriesRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    router.replace(pathname.replace(/\/series(?:\/.*)?$/, "/write?view=series"));
  }, [router, pathname]);
  return null;
}
