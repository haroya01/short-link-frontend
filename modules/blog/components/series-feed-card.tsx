import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Mark } from "@/components/common/logo";
import type { PublicSeriesCard } from "@/modules/blog/api/public-posts";
import { authorHref, postHref } from "@/modules/blog/components/feed-card";
import { SeriesSubscribeButton } from "@/modules/blog/components/series-subscribe-button";

const DATE_LOCALE: Record<string, string> = { ko: "ko-KR", ja: "ja-JP", en: "en-US" };

/**
 * A series in the feed flow — kept in the same quiet, typographic family as the post cards (no boxed
 * widget): a series eyebrow (kurl mark + name + count), then its first members as a list where each
 * title is its own link straight to that post, and an author/date meta line like a normal card. The
 * members cascade in (shared `.profile-fade` stagger) so the block feels alive rather than static.
 *
 * Each episode title and the eyebrow are separate links (siblings, never nested) — the block has no
 * single wrapping anchor, so clicking a title goes to that post and the eyebrow/"+N" go to the series.
 */
export async function SeriesFeedCard({
  series,
  locale,
}: {
  series: PublicSeriesCard;
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: "publicFeed" });
  const date = new Date(series.lastPublishedAt).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
    month: "long",
    day: "numeric",
  });
  // Defensive: tolerate a payload without `posts` (e.g. a brief window before the backend that adds it
  // finishes deploying) instead of throwing on .length / .map.
  const posts = series.posts ?? [];
  const more = series.postCount - posts.length;
  const seriesUrl = authorHref(series.author.username, locale, `series/${series.slug}`);

  return (
    <section className="group/series" aria-label={series.title}>
      {/* Series eyebrow (kurl mark + "시리즈") where a post card shows its tag, with the subscribe
          toggle on the right (the series equivalent of follow). Then the series name as the card's
          headline — bigger than the members so the series itself reads as the subject. */}
      <div className="flex items-center justify-between gap-3">
        <a
          href={seriesUrl}
          className="focus-ring inline-flex items-center gap-1.5 rounded text-[12px] font-semibold tracking-wide text-accent-700 transition-colors hover:text-accent-800 dark:text-accent-400 dark:hover:text-accent-300"
        >
          <Mark className="h-2.5 w-auto shrink-0" />
          {t("seriesEyebrow")}
        </a>
        <SeriesSubscribeButton seriesId={series.id} />
      </div>
      <a href={seriesUrl} className="focus-ring group/title mt-1 block rounded">
        <h3 className="line-clamp-2 text-[20px] font-bold leading-snug tracking-tight text-slate-900 transition-colors group-hover/title:text-accent-700 dark:text-slate-100 dark:group-hover/title:text-accent-400">
          {series.title}
        </h3>
      </a>

      {/* Members — each title is a link straight to that post. Quiet leading dot, hover lifts the row. */}
      <ol className="mt-2 flex flex-col">
        {posts.map((post, i) => (
          <li
            key={post.slug}
            className="profile-fade"
            style={{ ["--idx" as string]: i } as React.CSSProperties}
          >
            <a
              href={postHref(series.author.username, post.slug, locale)}
              className="group/ep focus-ring -mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <span
                aria-hidden
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-300 transition-colors group-hover/ep:bg-accent-500 dark:bg-accent-500/40"
              />
              <span className="truncate text-[14px] font-medium text-slate-700 transition-colors group-hover/ep:text-accent-700 dark:text-slate-300 dark:group-hover/ep:text-accent-300">
                {post.title}
              </span>
            </a>
          </li>
        ))}
        {more > 0 && (
          <li
            className="profile-fade"
            style={{ ["--idx" as string]: posts.length } as React.CSSProperties}
          >
            <a
              href={seriesUrl}
              className="group/ep focus-ring -mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1 text-[13px] text-slate-400 transition-colors hover:text-accent-700 dark:text-slate-500 dark:hover:text-accent-300"
            >
              <span aria-hidden className="h-1.5 w-1.5 shrink-0" />
              <span>{t("seriesMoreCount", { count: more })}</span>
              <ArrowRight className="h-3 w-3 transition-transform group-hover/ep:translate-x-0.5 motion-reduce:transform-none" />
            </a>
          </li>
        )}
      </ol>

      {/* Author/date meta — same grammar as a post card's meta line. */}
      <div className="mt-2 flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
        {series.author.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={series.author.avatarUrl} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-100 text-[10px] font-semibold text-accent-700">
            {series.author.username.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="truncate font-medium">{series.author.username}</span>
        <span aria-hidden>·</span>
        <span className="shrink-0">{t("seriesEpisodeCount", { count: series.postCount })}</span>
        <span aria-hidden>·</span>
        <span className="shrink-0">{t("seriesLastPublished", { date })}</span>
      </div>
    </section>
  );
}
