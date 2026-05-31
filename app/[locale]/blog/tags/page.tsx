import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PenSquare } from "lucide-react";
import { blogHref } from "@/lib/host";
import { cn } from "@/lib/utils";
import { blogCta } from "@/modules/blog/components/blog-cta";
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
    <main className="mx-auto max-w-2xl px-4 pt-6 pb-24 sm:px-6 sm:py-8">
      {/* Shared feed nav (links home) + Write, on the same centered reading column as the feed —
          no marketing band, matching the quiet home. */}
      <header className="mb-8 flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
        <FeedTabs locale={locale} />
        <a
          href={blogHref("/write/new")}
          className={cn(blogCta(), "hidden shrink-0 sm:inline-flex")}
        >
          <PenSquare className="h-4 w-4" />
          {t("write")}
        </a>
      </header>

      <div className="mb-6">
        <h1 className="text-[20px] font-bold tracking-tight text-slate-900">{t("topics")}</h1>
        <p className="mt-1 text-[14px] leading-relaxed text-slate-500">{t("topicsIntro")}</p>
      </div>

        {/* Tag cloud — same chip style as the tag-page filter strip (uniform slate chip + count +
            accent hover); wraps to show the full set. */}
        {tags.length === 0 ? (
          <FeedEmpty title={t("empty")} />
        ) : (
          <ul className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li key={tag.tag}>
                <TagChip
                  href={blogHref(`/tags/${encodeURIComponent(tag.tag)}`)}
                  label={tag.tag}
                  count={tag.count}
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
                <FeedCard
                  key={`${item.author.username}/${item.slug}`}
                  item={item}
                  locale={locale}
                />
              ))}
            </FeedList>
          </section>
        )}
    </main>
  );
}
