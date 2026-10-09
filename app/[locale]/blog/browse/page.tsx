import type { Metadata } from "next";
import { cookies } from "next/headers";
import { BLOG_FEED_COOKIE, rememberedBlogTab } from "@/modules/blog/lib/feed-memory";
import { FeedScreen, feedMetadata } from "@/modules/blog/components/feed-screen";

/**
 * Per-request feed variant: explicit ?sort/?q/?tag/?lang, plus the reader's last switcher tab
 * (cookie, so SSR opens the right tab with no flash). Only reached through the middleware
 * rewrite from the bare feed URL — the static sibling at ../page.tsx serves the cacheable
 * no-params case. Not linked directly, and canonical points at the bare URL (feedMetadata).
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return feedMetadata(locale);
}

export default async function BlogFeedBrowsePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sort?: string; q?: string; lang?: string; tag?: string; view?: string }>;
}) {
  const { locale } = await params;
  const { sort: sortParam, q: qParam, lang: langParam, tag: tagParam, view: viewParam } = await searchParams;
  const searching = (qParam ?? "").trim().length > 0;
  const activeTag = !searching ? (tagParam ?? "").trim() : "";
  // No explicit ?sort, and not in a search/tag context → reopen the reader's last switcher tab.
  const saved = rememberedBlogTab(cookies().get(BLOG_FEED_COOKIE)?.value);
  const resolvedSort = sortParam ?? (!searching && !activeTag && saved ? saved : "recent");
  return (
    <FeedScreen
      locale={locale}
      sortParam={resolvedSort}
      qParam={qParam}
      langParam={langParam}
      tagParam={tagParam}
      viewParam={viewParam}
    />
  );
}
