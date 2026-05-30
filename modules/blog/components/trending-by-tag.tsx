import { ArrowRight } from "lucide-react";
import { blogHref } from "@/lib/host";
import type { TrendingTagSection } from "@/modules/blog/api/public-posts";
import { FeedCard } from "@/modules/blog/components/feed-card";

/**
 * The 인기 tab's "주제별 인기" layout — one horizontal row per popular tag, each holding that topic's
 * top posts (most-viewed first). Gives the trending tab an identity distinct from 최신 (a flat
 * time-ordered grid) and surfaces the feed's breadth by topic. Reuses {@link FeedCard} (fixed-width
 * in the scroller) so cards match the rest of the product. Rows scroll horizontally; "더보기" deep-
 * links into the tag's full feed at /tags/{tag}.
 *
 * Backed by `GET /api/v1/public/feed/trending-by-tag` (see docs/feed-home-api.md); the backend is
 * responsible for ranking tags + posts and for not returning near-empty rows on a young feed.
 */
export function TrendingByTag({
  sections,
  locale,
  labels,
  moreLabel,
}: {
  sections: TrendingTagSection[];
  locale: string;
  labels: { views: (count: number) => string };
  moreLabel: string;
}) {
  return (
    <div className="mt-8 space-y-12">
      {sections.map((section) => (
        <section key={section.tag}>
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="text-[20px] font-bold tracking-tight text-slate-900">{section.tag}</h2>
            <a
              // Carry the trending order into the full tag feed so "모두 보기" from a popularity-ranked
              // row doesn't land on a time-ordered one.
              href={blogHref(`/tags/${encodeURIComponent(section.tag)}?sort=trending`)}
              className="group inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-accent-700 transition-colors hover:text-accent-800"
            >
              {moreLabel}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
          {/* Horizontal scroll row — hidden scrollbar, snap to card starts. Negative margin lets the
              row bleed to the container edge so the last card hints there's more to scroll. */}
          <ul className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
            {section.posts.map((item) => (
              <FeedCard
                key={`${item.author.username}/${item.slug}`}
                item={item}
                locale={locale}
                labels={labels}
                className="w-64 shrink-0 snap-start sm:w-72"
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
