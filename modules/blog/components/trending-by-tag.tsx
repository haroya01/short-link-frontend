import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { blogPath } from "@/lib/host";
import type { TrendingTagSection } from "@/modules/blog/api/public-posts";
import { FeedCard, FeedList } from "@/modules/blog/components/feed-card";

/** A topic section shows a handful of its posts, then "더 보기" deep-links into the full tag feed. */
const POSTS_PER_TOPIC = 3;

/**
 * The 인기 tab's "주제별" layout — one section per popular tag, each a heading + a short vertical list
 * of that topic's top posts, with "더 보기" into the tag's full feed. Keeps the topic separation that
 * makes the tab distinct from 최신, but in the same calm list grammar as the rest of the blog (no
 * horizontal carousels — those read as a content-platform feed and hide their swipe affordance on
 * mobile). Reuses {@link FeedCard}/{@link FeedList} verbatim so every surface matches.
 *
 * Backed by `GET /api/v1/public/feed/trending-by-tag` (see docs/feed-home-api.md); the backend ranks
 * tags + posts and avoids near-empty rows on a young feed.
 */
export function TrendingByTag({
  sections,
  locale,
  moreLabel,
  heading,
}: {
  sections: TrendingTagSection[];
  locale: string;
  moreLabel: string;
  /** Framing line above the sections, e.g. "주제별로 많이 읽힌 글" — so raw tag headers read as topics. */
  heading?: string;
}) {
  // No own centering / max-width / top margin — the caller wraps this in <ReadingShell> so the column
  // (and the optional discovery rail beside it) match the recent feed exactly.
  return (
    <>
      {heading && (
        <p className="mb-8 text-[14px] text-slate-500 dark:text-slate-400">{heading}</p>
      )}
      <div className="flex flex-col gap-12">
        {sections.map((section) => (
          <section key={section.tag}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <h2 className="flex items-center gap-2 text-[15px] font-bold tracking-tight text-slate-900 dark:text-slate-100">
                <span aria-hidden className="h-3.5 w-[3px] shrink-0 rounded-full bg-accent-600" />
                {section.tag}
              </h2>
              <Link
                // Carry the trending order into the full tag feed so "더 보기" from a popularity-ranked
                // section doesn't land on a time-ordered one. Soft-nav so the chrome doesn't reload.
                href={blogPath(`/tags/${encodeURIComponent(section.tag)}?sort=trending`)}
                className="group inline-flex shrink-0 items-center gap-1 rounded text-[13px] font-medium text-accent-700 transition-colors hover:text-accent-800 focus-ring dark:text-accent-400 dark:hover:text-accent-300"
              >
                {moreLabel}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
              </Link>
            </div>
            <FeedList>
              {section.posts.slice(0, POSTS_PER_TOPIC).map((item) => (
                <FeedCard
                  key={`${item.author.username}/${item.slug}`}
                  item={item}
                  locale={locale}
                />
              ))}
            </FeedList>
          </section>
        ))}
      </div>
    </>
  );
}
