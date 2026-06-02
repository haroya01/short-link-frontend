import { DATE_LOCALE } from "@/lib/date";
import { getTranslations } from "next-intl/server";
import { Mark } from "@/components/common/logo";
import type { PublicSeriesCard } from "@/modules/blog/api/public-posts";
import { Avatar } from "@/modules/blog/components/avatar";
import { authorHref } from "@/modules/blog/components/feed-card";
import { SeriesEpisodeList } from "@/modules/blog/components/series-episode-list";
import { SeriesSubscribeButton } from "@/modules/blog/components/series-subscribe-button";


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
  const seriesUrl = authorHref(series.author.username, locale, `series/${series.slug}`);

  return (
    // `mark-hoverable` replays the kurl mark's line-draw (the "사사삭" loading stroke) whenever the card
    // is hovered — so resting on a series animates its mark like a quiet "selected" cue.
    <section className="group/series mark-hoverable" aria-label={series.title}>
      {/* Series eyebrow (kurl mark + "시리즈") where a post card shows its tag, with the subscribe
          toggle on the right (the series equivalent of follow). Then the series name as the card's
          headline — bigger than the members so the series itself reads as the subject. */}
      <div className="flex items-center justify-between gap-3">
        <a
          href={seriesUrl}
          className="focus-ring inline-flex items-center gap-1.5 rounded text-[12px] font-semibold tracking-wide text-accent-700 transition-colors hover:text-accent-800 dark:text-accent-400 dark:hover:text-accent-300"
        >
          <Mark className="h-2.5 w-auto shrink-0" animated />
          {t("seriesEyebrow")}
        </a>
        <SeriesSubscribeButton seriesId={series.id} />
      </div>
      <a href={seriesUrl} className="focus-ring group/title mt-1 block rounded">
        <h3 className="line-clamp-2 text-[20px] font-bold leading-snug tracking-tight text-slate-900 transition-colors group-hover/title:text-accent-700 dark:text-slate-100 dark:group-hover/title:text-accent-400">
          {series.title}
        </h3>
      </a>

      {/* Members — each title links straight to its post; a slow spotlight cycles the bold emphasis
          through them (client component). */}
      <SeriesEpisodeList
        authorUsername={series.author.username}
        locale={locale}
        posts={posts}
        postCount={series.postCount}
        seriesUrl={seriesUrl}
      />

      {/* Author/date meta — same grammar as a post card's meta line. */}
      <div className="mt-2 flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
        <Avatar src={series.author.avatarUrl} name={series.author.username} size="xs" />
        <span className="truncate font-medium">{series.author.username}</span>
        <span aria-hidden>·</span>
        <span className="shrink-0">{t("seriesEpisodeCount", { count: series.postCount })}</span>
        <span aria-hidden>·</span>
        <span className="shrink-0">{t("seriesLastPublished", { date })}</span>
      </div>
    </section>
  );
}
