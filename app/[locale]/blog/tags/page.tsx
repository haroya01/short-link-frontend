import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { blogPath } from "@/lib/host";
import { TagChip } from "@/modules/blog/components/tag-chip";
import { listPopularTags, listPublicFeed } from "@/modules/blog/api/public-posts";
import { FeedCard, FeedList } from "@/modules/blog/components/feed-card";
import { FeedEmpty } from "@/modules/blog/components/feed-empty";
import { FeedTabs } from "@/modules/blog/components/feed-tabs";
import { RailHeading } from "@/modules/blog/components/rail-heading";

// Rendered per request (not prerendered at build): the popular-tags fetch needs the runtime API
// base, which isn't available during static generation.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "publicFeed" });
  return { title: `${t("topics")} · blog.kurl` };
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
  const tags = tagsResult.ok ? tagsResult.data : [];
  // Slice to a small peek (the mock returns a full page; the real API honors size=3).
  const recent = recentResult.ok ? recentResult.data.items.slice(0, 3) : [];

  return (
    // Same shell as a single topic's page (/tags/[tag]) so selecting a topic is a seamless soft-nav:
    // identical max-w-7xl main → centered max-w-2xl tabs header → heading → chips → content.
    <main className="mx-auto max-w-7xl px-4 pt-6 pb-24 sm:px-6 sm:py-8">
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
          a topic client-routes (no chrome reload) into the matching /tags/[tag] page. */}
      <div className="mx-auto mt-5 max-w-2xl">
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
    </main>
  );
}
