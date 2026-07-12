"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

const TAB_SEGMENTS = ["series", "collections", "about", "liked", "bookmarks"];

/** True on the author's tab pages (글 · 시리즈 · 컬렉션 · 소개 · 좋아요 · 북마크) — NOT a post (/p/user/{slug})
 *  or a series detail (/p/user/series/{slug}). Static tab segments win route resolution over [slug],
 *  so a post can never own one of those names.
 *
 *  THREE URL topologies reach this layout, and `usePathname()` reflects the VISIBLE browser URL:
 *   - apex path form `/{locale}/p/{user}/...` → take the segments after the username.
 *   - blog host `blog.kurl.me/@{user}[/...]` (the canonical author URL — middleware rewrites to
 *     `/{locale}/p/{user}[/...]` server-side, no locale prefix in the browser) → the first segment
 *     is the `@handle` itself, so the tail starts AFTER it. Treating the handle as the tail made
 *     `/@user` (and every tab under it) drop the avatar + tab bar + page frame entirely.
 *   - author subdomain `{user}.kurl.me/...` → rewritten to `/p/{user}` server-side too, so the
 *     browser path has NO `/p/` and NO `@` — the whole path IS the post-username tail.
 *  Exported for unit tests (topology matrix). */
export function isTabRoute(pathname: string): boolean {
  const parts = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  const pIdx = parts.indexOf("p");
  const after =
    pIdx !== -1
      ? parts.slice(pIdx + 2) // apex: segments after the username
      : parts[0]?.startsWith("@")
        ? parts.slice(1) // blog-host @handle: tail after the handle
        : parts; // subdomain: the whole path is the tail
  if (after.length === 0) return true; // /p/{user}, /@{user} or subdomain root → 글
  if (after.length === 1) return TAB_SEGMENTS.includes(after[0]); // tab vs post slug
  return false; // /p/{user}/series/{slug}, deeper → not a tab
}

/**
 * Holds the author header (identity + tabs) in the persistent layout so it NEVER re-mounts on a tab
 * switch — the content below swaps (with its own loading skeleton) while the avatar / handle / bio /
 * follow / tabs stay rock-still. (Before, the header lived in each page, so the route loading.tsx
 * replaced the WHOLE header with a skeleton on every tab switch → the "전체요소 깜빡".) On a post /
 * series-detail route the header is dropped and children render their own layout. Reads the live
 * pathname (SSR-safe) so it shows/hides correctly on the first paint and every client navigation.
 */
export function ProfileChrome({ header, children }: { header: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  if (!isTabRoute(pathname)) return <>{children}</>;
  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl">{header}</div>
      {children}
    </main>
  );
}
