"use client";

import { useMemo, useState } from "react";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PublicPostListItem } from "@/modules/blog/api/public-posts";
import { postHref } from "@/modules/blog/components/feed-card";
import { FeedCardBookmark } from "@/modules/blog/components/feed-card-bookmark";
import { showLikes } from "@/modules/blog/lib/public-metrics";

const DATE_LOCALE: Record<string, string> = { ko: "ko-KR", ja: "ja-JP", en: "en-US" };

/**
 * The series' ordered episodes, with a tag filter strip on top. A long series mixes topics (an author
 * folds "개발" and "회고" pieces into one run); the chips let a reader pull just the thread they want
 * without leaving the series. Filtering is client-side + instant (no nav, no reload) — the posts
 * already carry their tags, so there's nothing to fetch. Episode numbers stay the post's real position
 * in the series (so a filtered view reads "#1, #3", not a renumbered 1–2) — the series order is the
 * point. Re-keying the list on the active tag replays the top-down cascade on each switch.
 */
export function SeriesEpisodeBrowser({
  posts,
  username,
  locale,
}: {
  posts: PublicPostListItem[];
  username: string;
  locale: string;
}) {
  const t = useTranslations("publicFeed");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  // Tags this series actually uses, most-common first (then first-seen) so the strip leads with the
  // series' dominant threads rather than an arbitrary order.
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    const order: string[] = [];
    for (const p of posts) {
      for (const tag of p.tags) {
        if (!counts.has(tag)) order.push(tag);
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return order.sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
  }, [posts]);

  // Pin the real episode number before filtering, so a narrowed view keeps the series positions.
  const rows = posts
    .map((p, i) => ({ post: p, n: i + 1 }))
    .filter((r) => !activeTag || r.post.tags.includes(activeTag));

  const chip = (active: boolean) =>
    `touch-target inline-flex h-7 shrink-0 items-center rounded-full border px-3 text-[12px] font-medium transition-colors focus-ring ${
      active
        ? "border-transparent bg-accent-600 text-white"
        : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
    }`;

  return (
    <>
      {tags.length > 0 && (
        <div className="relative -mx-4 mb-6 sm:-mx-6">
          <nav
            aria-label={t("seriesEyebrow")}
            className="overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden"
          >
            <ul className="flex gap-2">
              <li className="shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTag(null)}
                  aria-pressed={activeTag === null}
                  className={chip(activeTag === null)}
                >
                  {t("seriesFilterAll")}
                </button>
              </li>
              {tags.map((tag) => {
                const active = activeTag === tag;
                return (
                  <li key={tag} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveTag(active ? null : tag)}
                      aria-pressed={active}
                      className={chip(active)}
                    >
                      {tag}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent dark:from-slate-950"
          />
        </div>
      )}

      {rows.length === 0 ? (
        <p className="py-6 text-[14px] text-slate-500 dark:text-slate-400">
          {t("seriesFilterEmpty", { tag: activeTag ?? "" })}
        </p>
      ) : (
        // Re-keyed on the active tag so the whole list remounts and the cascade replays on each switch.
        <ol key={activeTag ?? "all"} className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map(({ post: p, n }, i) => {
            const hasImage = Boolean(p.ogImageUrl);
            return (
              <li
                key={p.slug}
                className="profile-fade group group/row relative"
                style={{ ["--idx" as string]: i } as React.CSSProperties}
              >
                <a
                  href={postHref(username, p.slug, locale)}
                  className="-mx-3 flex items-start gap-3 rounded-xl px-3 py-4 transition-colors hover:bg-slate-50 focus-ring dark:hover:bg-slate-800/40 sm:gap-4"
                >
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-50 text-[13px] font-semibold text-accent-700 dark:bg-accent-500/15 dark:text-accent-300">
                    {n}
                  </span>
                  {/* No-image rows reserve a right gutter so the title never runs under the save toggle. */}
                  <span className={`min-w-0 flex-1 ${hasImage ? "" : "pr-9"}`}>
                    <span className="block text-[17px] font-semibold leading-snug text-slate-900 transition-colors group-hover/row:text-accent-700 dark:text-slate-100 dark:group-hover/row:text-accent-400">
                      {p.title}
                    </span>
                    <span className="mt-1 flex items-center gap-2 text-[12px] text-slate-400 dark:text-slate-500">
                      <time dateTime={p.publishedAt}>{fmtDate(p.publishedAt)}</time>
                      {showLikes(p.likeCount) && (
                        <>
                          <span aria-hidden>·</span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3 text-accent-500" />
                            {p.likeCount}
                          </span>
                        </>
                      )}
                    </span>
                    {p.excerpt && (
                      <span className="mt-1.5 line-clamp-2 block text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">
                        {p.excerpt}
                      </span>
                    )}
                  </span>
                  {hasImage && (
                    <span className="block h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 sm:h-24 sm:w-32">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.ogImageUrl as string}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover/row:scale-[1.03] motion-reduce:transform-none"
                      />
                    </span>
                  )}
                </a>
                {/* Save toggle — sibling of the post link (never nested), pinned to the row's top-right. */}
                <div className="absolute right-3 top-4 z-10">
                  <FeedCardBookmark postId={p.id} username={username} slug={p.slug} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
