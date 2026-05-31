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
  heading,
}: {
  sections: TrendingTagSection[];
  locale: string;
  labels: { views: (count: number) => string };
  moreLabel: string;
  /** Framing line above the rows, e.g. "주제별로 많이 읽힌 글" — so raw tag headers read as topics. */
  heading?: string;
}) {
  return (
    <div className="mt-8">
      {heading && <p className="mb-6 text-[14px] text-slate-500">{heading}</p>}
      <div className="space-y-12">
        {sections.map((section) => (
          <section key={section.tag}>
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="text-[20px] font-bold tracking-tight text-slate-900">{section.tag}</h2>
              <a
                // Carry the trending order into the full tag feed so "모두 보기" from a popularity-ranked
                // row doesn't land on a time-ordered one.
                href={blogHref(`/tags/${encodeURIComponent(section.tag)}?sort=trending`)}
                className="group inline-flex shrink-0 items-center gap-1 rounded text-[13px] font-medium text-accent-700 transition-colors hover:text-accent-800 focus-ring"
              >
                {moreLabel}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
              </a>
            </div>
            {/* Horizontal scroll row. The right-edge fade (desktop) signals there's more to scroll
                since the scrollbar is hidden; mobile relies on natural swipe + the clipped last card. */}
            <div className="relative -mx-4 sm:-mx-6">
              {/* Focusable scroll region so keyboard users can arrow-scroll the row (cards are also
                  tabbable, but the container itself needs to be reachable per WCAG 2.1.1). */}
              <ul
                tabIndex={0}
                aria-label={section.tag}
                className="flex snap-x gap-4 overflow-x-auto rounded-lg px-4 pb-2 [scrollbar-width:none] focus-ring sm:px-6 [&::-webkit-scrollbar]:hidden"
              >
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
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-0 hidden w-12 bg-gradient-to-l from-white to-transparent sm:block"
              />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
