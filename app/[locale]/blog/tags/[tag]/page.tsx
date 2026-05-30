import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Hash, PenSquare } from "lucide-react";
import { blogHref } from "@/lib/host";
import {
  listFeedByTag,
  listPopularTags,
  listSuggestedAuthors,
  type FeedSort,
} from "@/modules/blog/api/public-posts";
import { DiscoveryRail } from "@/modules/blog/components/discovery-rail";
import { FeedEmpty } from "@/modules/blog/components/feed-empty";
import { FeedInfinite } from "@/modules/blog/components/feed-infinite";
import { FeedMasthead } from "@/modules/blog/components/feed-masthead";
import { FeedTabs } from "@/modules/blog/components/feed-tabs";
import { TagFilterStrip } from "@/modules/blog/components/tag-filter-strip";

export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  return { title: `#${decodeURIComponent(tag)} · blog.kurl` };
}

/**
 * A single tag's feed. Deliberately the SAME shell as the feed home (masthead band → header row with
 * Write → grid + discovery rail) so arriving here from a popular-tag click reads as the feed filtered
 * to a topic, not a different page. The header carries the same 최신·인기·팔로잉 tabs (linking to the
 * feed home) so the user can hop laterally, not just back. A `?sort=trending` deep-link from a
 * "주제별 인기" row keeps that row's popularity order here.
 */
export default async function TagFeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; tag: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { locale, tag } = await params;
  const { sort: sortParam } = await searchParams;
  const sort: FeedSort = sortParam === "trending" ? "trending" : "recent";
  const decoded = decodeURIComponent(tag);
  const t = await getTranslations({ locale, namespace: "publicFeed" });

  const [feedResult, tagsResult, authorsResult] = await Promise.all([
    listFeedByTag(decoded, sort, 0, 24),
    listPopularTags(20),
    listSuggestedAuthors(5),
  ]);
  const items = feedResult.ok ? feedResult.data.items : [];
  const hasNext = feedResult.ok ? feedResult.data.hasNext : false;
  const tags = tagsResult.ok ? tagsResult.data : [];
  const authors = authorsResult.ok ? authorsResult.data : [];
  // Keep the (authors-only) rail whenever there are authors, so the grid stays 3-up like the feed —
  // a few posts fill the row instead of shrinking to a 4-up grid with an empty trailing column.
  const hasRail = authors.length > 0;

  const writeCta = (
    <a
      href={blogHref("/write/new")}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(5,150,105,0.45)] transition-colors hover:bg-accent-700"
    >
      <PenSquare className="h-4 w-4" />
      {t("write")}
    </a>
  );

  return (
    <>
      <FeedMasthead
        locale={locale}
        eyebrow={t("topics")}
        title={decoded}
        sub={t("tagFeedSubtitle")}
      />

      <main className="mx-auto max-w-7xl px-4 pt-6 pb-24 sm:px-6 sm:py-8">
        {/* Same header row as the feed home — the feed tabs (linking home, none active here) so the
            user can jump into any feed mode, plus Write on the right. */}
        <header className="flex items-center justify-between gap-4 border-b border-slate-200/80 pb-3">
          <FeedTabs locale={locale} />
          <div className="hidden sm:block">{writeCta}</div>
        </header>

        {/* Persistent tag chips (current one highlighted) so switching topics doesn't require going
            back to the index — works on mobile where there's no rail. */}
        <TagFilterStrip tags={tags} activeTag={decoded} sort={sort} />

        {items.length === 0 ? (
          <FeedEmpty
            icon={Hash}
            title={t("emptyTagTitle")}
            action={
              <a
                href={blogHref("/tags")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
              >
                <Hash className="h-4 w-4 text-accent-600" />
                {t("browseTopics")}
              </a>
            }
          />
        ) : (
          <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_clamp(240px,22vw,300px)] lg:items-start lg:gap-10">
            <div>
              <FeedInfinite
                locale={locale}
                initialItems={items}
                initialHasNext={hasNext}
                sort={sort}
                tag={decoded}
                hasRail={hasRail}
              />
            </div>
            {hasRail ? (
              <aside className="mt-12 hidden lg:sticky lg:top-20 lg:mt-0 lg:block">
                {/* Tags live in the strip above now; the rail carries author discovery only. */}
                <DiscoveryRail locale={locale} tags={[]} authors={authors} />
              </aside>
            ) : null}
          </div>
        )}
      </main>
    </>
  );
}
