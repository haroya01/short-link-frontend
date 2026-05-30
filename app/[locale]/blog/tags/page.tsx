import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PenSquare } from "lucide-react";
import { blogHref } from "@/lib/host";
import { listPopularTags, listPublicFeed } from "@/modules/blog/api/public-posts";
import { FeedCard, FeedGrid } from "@/modules/blog/components/feed-card";
import { FeedEmpty } from "@/modules/blog/components/feed-empty";
import { FeedMasthead } from "@/modules/blog/components/feed-masthead";
import { FeedTabs } from "@/modules/blog/components/feed-tabs";

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
    <>
      {/* Same masthead band as the feed home / tag pages — the topics index is part of the same
          surface, just titled "주제". */}
      <FeedMasthead locale={locale} title={t("topics")} sub={t("topicsIntro")} />

      <main className="mx-auto max-w-7xl px-4 pt-6 pb-24 sm:px-6 sm:py-8">
        {/* Same header row as the feed/tag surfaces — feed tabs (linking home) + Write. */}
        <header className="mb-8 flex items-center justify-between gap-4 border-b border-slate-200/80 pb-3">
          <FeedTabs locale={locale} />
          <a
            href={blogHref("/write/new")}
            className="hidden shrink-0 items-center gap-1.5 rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(5,150,105,0.45)] transition-colors hover:bg-accent-700 sm:inline-flex"
          >
            <PenSquare className="h-4 w-4" />
            {t("write")}
          </a>
        </header>

        {/* Tag cloud — same chip style as the tag-page filter strip (uniform slate chip + count +
            accent hover); wraps to show the full set. */}
        {tags.length === 0 ? (
          <FeedEmpty title={t("empty")} />
        ) : (
          <ul className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li key={tag.tag}>
                <a
                  href={blogHref(`/tags/${encodeURIComponent(tag.tag)}`)}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-accent-50 hover:text-accent-700"
                >
                  <span>{tag.tag}</span>
                  <span className="text-slate-400">{tag.count}</span>
                </a>
              </li>
            ))}
          </ul>
        )}

        {recent.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-slate-500">
              {t("topicsRecent")}
            </h2>
            <FeedGrid>
              {recent.map((item) => (
                <FeedCard
                  key={`${item.author.username}/${item.slug}`}
                  item={item}
                  locale={locale}
                  labels={{ views: (count) => t("views", { count }) }}
                />
              ))}
            </FeedGrid>
          </section>
        )}
      </main>
    </>
  );
}
