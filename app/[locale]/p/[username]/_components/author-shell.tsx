"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { PublicAuthor } from "@/modules/blog/api/public-posts";
import { authorPath } from "@/modules/blog/components/feed-card";
import { FeedContentTransition } from "@/modules/blog/components/feed-content-transition";
import { AuthorProfileHeader } from "./author-profile-header";

const norm = (p: string) => p.replace(/\/+$/, "") || "/";

/**
 * Wraps the author surface so the 글/시리즈/소개 tabs read like the feed home's 최신/인기/팔로잉: one
 * persistent header (mounted once here in the layout → the underline glides on switch) over a content
 * column that slides left/right by tab order ({@link FeedContentTransition}, index 글 0 · 시리즈 1 ·
 * 소개 2).
 *
 * The author layout also wraps the post detail (`/p/{user}/{slug}`) and series detail
 * (`/p/{user}/series/{slug}`), which must NOT get the tab chrome. So we render the tabbed shell ONLY
 * when the current path is exactly one of the three tab paths; any other path (a detail page) passes
 * straight through with its own layout untouched.
 */
export function AuthorShell({
  author,
  locale,
  children,
}: {
  author: PublicAuthor;
  locale: string;
  children: ReactNode;
}) {
  const cur = norm(usePathname());
  const tabPaths = [
    authorPath(author.username, locale),
    authorPath(author.username, locale, "series"),
    authorPath(author.username, locale, "about"),
  ].map(norm);
  const index = tabPaths.indexOf(cur);

  // Detail page (post / series detail) — not a tab, so no tab chrome and no slide.
  if (index === -1) return <>{children}</>;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <AuthorProfileHeader author={author} locale={locale} />
      </div>
      <FeedContentTransition index={index} contentKey={cur}>
        {children}
      </FeedContentTransition>
    </main>
  );
}
