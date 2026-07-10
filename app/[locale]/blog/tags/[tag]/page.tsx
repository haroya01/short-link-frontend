import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Hash } from "lucide-react";
import { routing } from "@/i18n/routing";
import { blogPath } from "@/lib/host";
import { BlogLink } from "@/modules/blog/components/blog-link";
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
import { ReadingShell } from "@/modules/blog/components/reading-shell";
import { FeedTabs } from "@/modules/blog/components/feed-tabs";
import { TagFilterStrip } from "@/modules/blog/components/tag-filter-strip";
import { TagFollowControls } from "@/modules/blog/components/tag-follow-controls";

export const revalidate = 30;

// Same absolute-origin constant as the feed home (and sitemap.ts) — metadata canonicals must be
// absolute on the blog host, not the kurl.me metadataBase the root layout sets.
const BLOG_URL =
  process.env.NEXT_PUBLIC_BLOG_URL ??
  (process.env.NEXT_PUBLIC_BLOG_HOST
    ? `https://${process.env.NEXT_PUBLIC_BLOG_HOST}`
    : "https://blog.kurl.me");

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; tag: string }>;
}): Promise<Metadata> {
  const { locale, tag } = await params;
  const t = await getTranslations({ locale, namespace: "publicFeed" });
  const path = `/tags/${tag}`;
  const title = `#${decodeURIComponent(tag)} · blog.kurl`;
  const description = t("tagFeedSubtitle");
  const url = `${BLOG_URL}/${locale}${path}`;
  // Without OG/twitter the tag feed unfurled as a bare title. Reuse the blog's generated card so a
  // shared topic link shows the brand image instead of a blank preview.
  const ogImage = `${BLOG_URL}/${locale}/blog/opengraph-image`;
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        ...Object.fromEntries(routing.locales.map((l) => [l, `${BLOG_URL}/${l}${path}`])),
        "x-default": `${BLOG_URL}/${routing.defaultLocale}${path}`,
      },
    },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: "blog.kurl",
      images: [{ url: ogImage, width: 2400, height: 1260, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
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

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 pb-24 sm:px-6 sm:py-8">
      <header className="mx-auto flex w-full max-w-2xl items-center border-b border-slate-100 pb-3 dark:border-slate-800">
        <FeedTabs locale={locale} />
      </header>

      {/* Topic heading inside the centered reading column — aligns with the tabs + feed below,
          instead of a full-width masthead band that floated left of the centered content. */}
      <div className="mx-auto mt-6 max-w-2xl">
        <h1 className="text-[22px] font-bold tracking-tight text-slate-900 dark:text-slate-100">{decoded}</h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">{t("tagFeedSubtitle")}</p>
        <TagFollowControls tag={decoded} />
      </div>

      {/* Persistent tag chips (current highlighted) so switching topics needs no back-trip. */}
      <div className="mx-auto mt-5 max-w-2xl">
        <TagFilterStrip tags={tags} activeTag={decoded} sort={sort} />
      </div>

        {items.length === 0 ? (
          <FeedEmpty
            icon={Hash}
            title={t("emptyTagTitle")}
            action={
              <BlogLink href={blogPath("/tags")} className={blogCta({ variant: "secondary" })}>
                <Hash className="h-4 w-4 text-accent-600" />
                {t("browseTopics")}
              </BlogLink>
            }
          />
        ) : (
          <ReadingShell
            className="mt-8"
            // Tags live in the strip above now; the rail carries author discovery only.
            rail={hasRail ? <DiscoveryRail locale={locale} tags={[]} authors={authors} /> : undefined}
          >
            {/* Keyed by topic so only the post list crossfades when switching topics (soft nav) — the
                title/filter/rail above stay put. */}
            <div key={decoded} className="tag-list-enter">
              <FeedInfinite
                locale={locale}
                initialItems={items}
                initialHasNext={hasNext}
                sort={sort}
                tag={decoded}
              />
            </div>
          </ReadingShell>
        )}
    </div>
  );
}
