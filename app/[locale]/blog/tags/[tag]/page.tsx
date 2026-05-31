import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Hash, PenSquare } from "lucide-react";
import { blogHref } from "@/lib/host";
import { cn } from "@/lib/utils";
import { blogCta } from "@/modules/blog/components/blog-cta";
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
    <a href={blogHref("/write/new")} className={cn(blogCta(), "shrink-0")}>
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
        <header className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <FeedTabs locale={locale} />
          <div className="hidden sm:block">{writeCta}</div>
        </header>

        {/* Persistent tag chips (current one highlighted) so switching topics doesn't require going
            back to the index — works on mobile where there's no rail. Centered on the reading column. */}
        <div className="mx-auto max-w-2xl">
          <TagFilterStrip tags={tags} activeTag={decoded} sort={sort} />
        </div>

        {items.length === 0 ? (
          <FeedEmpty
            icon={Hash}
            title={t("emptyTagTitle")}
            action={
              <a href={blogHref("/tags")} className={blogCta({ variant: "secondary" })}>
                <Hash className="h-4 w-4 text-accent-600" />
                {t("browseTopics")}
              </a>
            }
          />
        ) : (
          <div className="mx-auto mt-8 max-w-2xl xl:grid xl:max-w-7xl xl:grid-cols-[1fr_minmax(0,42rem)_1fr] xl:gap-10">
            <div className="xl:col-start-2">
              <FeedInfinite
                locale={locale}
                initialItems={items}
                initialHasNext={hasNext}
                sort={sort}
                tag={decoded}
              />
            </div>
            {hasRail ? (
              <aside className="mt-12 hidden xl:col-start-3 xl:mt-0 xl:block">
                {/* Tags live in the strip above now; the rail carries author discovery only. */}
                <div className="sticky top-20">
                  <DiscoveryRail locale={locale} tags={[]} authors={authors} />
                </div>
              </aside>
            ) : null}
          </div>
        )}
      </main>
    </>
  );
}
