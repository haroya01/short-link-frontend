import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { blogPath } from "@/lib/host";
import { TagChip } from "@/modules/blog/components/tag-chip";
import { listPopularTags, listPublicFeed } from "@/modules/blog/api/public-posts";
import { isDisplayableTag } from "@/modules/blog/lib/tag-normalize";
import { FeedCard, FeedList } from "@/modules/blog/components/feed-card";
import { FeedEmpty } from "@/modules/blog/components/feed-empty";
import { FeedTabs } from "@/modules/blog/components/feed-tabs";
import { RailHeading } from "@/modules/blog/components/rail-heading";

// Static + ISR: nothing here is per-visitor, and the public fetches degrade to an empty state if
// the API is unreachable while the page prerenders at build (fetchPublic catches), so the index
// can live on the edge cache and refresh every 30s instead of paying per-request SSR.
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
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "publicFeed" });
  const title = `${t("topics")} · blog.kurl`;
  const description = t("topicsIntro");
  const url = `${BLOG_URL}/${locale}/tags`;
  const ogImage = `${BLOG_URL}/${locale}/blog/opengraph-image`;
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        ...Object.fromEntries(routing.locales.map((l) => [l, `${BLOG_URL}/${l}/tags`])),
        "x-default": `${BLOG_URL}/${routing.defaultLocale}/tags`,
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

export default async function TagsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "publicFeed" });
  // Tag cloud + a few recent posts so the topics page reads as a browsing surface, not a bare
  // chip row over empty space.
  const [tagsResult, recentResult] = await Promise.all([
    listPopularTags(100),
    // A small peek, not a second home feed — the tag cloud is this page's job.
    listPublicFeed("recent", 0, 3),
  ]);
  // Drop junk tags (incomplete jamo, single-char, mash) so the cloud only offers real topics.
  const tags = (tagsResult.ok ? tagsResult.data : []).filter((tag) => isDisplayableTag(tag.tag));
  // Slice to a small peek (the mock returns a full page; the real API honors size=3).
  const recent = recentResult.ok ? recentResult.data.items.slice(0, 3) : [];

  return (
    // Same shell as a single topic's page (/tags/[tag]) so selecting a topic is a seamless soft-nav:
    // identical max-w-7xl main → centered max-w-2xl tabs header → heading → chips → content.
    <div className="mx-auto max-w-7xl px-4 pt-6 pb-24 sm:px-6 sm:py-8">
      <header className="mx-auto flex w-full max-w-2xl items-center border-b border-slate-100 pb-3 dark:border-slate-800">
        <FeedTabs locale={locale} />
      </header>

      <div className="mx-auto mt-6 max-w-2xl">
        <h1 className="text-[22px] font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {t("topics")}
        </h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">
          {t("topicsIntro")}
        </p>
      </div>

      {/* Tag cloud — same chip primitive + position as the tag page's filter strip; soft-nav so picking
          a topic client-routes (no chrome reload) into the matching /tags/[tag] page. The content
          crossfades in (tag-list-enter) so arriving via "모두 보기" reads smooth, not a hard swap. */}
      <div className="tag-list-enter mx-auto mt-5 max-w-2xl">
        {tags.length === 0 ? (
          <FeedEmpty title={t("empty")} />
        ) : (
          <ul className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li key={tag.tag}>
                <TagChip
                  href={blogPath(`/tags/${encodeURIComponent(tag.tag)}`)}
                  label={tag.tag}
                  count={tag.count}
                  soft
                />
              </li>
            ))}
          </ul>
        )}

        {recent.length > 0 && (
          <section className="mt-12">
            <RailHeading className="mb-4">{t("topicsRecent")}</RailHeading>
            <FeedList>
              {recent.map((item) => (
                <FeedCard key={`${item.author.username}/${item.slug}`} item={item} locale={locale} />
              ))}
            </FeedList>
          </section>
        )}
      </div>
    </div>
  );
}
