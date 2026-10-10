import type { ComponentProps, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicFeedItem } from "@/modules/blog/api/public-posts";
import { isRenderablePost } from "@/modules/blog/lib/public-metrics";
import { isDisplayableTag } from "@/modules/blog/lib/tag-normalize";
import { FeedCardBookmark } from "@/modules/blog/components/feed-card-bookmark";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { HideIfBlocked } from "@/modules/blog/components/hide-if-blocked";
import { FeedRow, RowAuthor, RowDot } from "@/modules/blog/components/feed-row";
import { RowTime } from "@/modules/blog/components/row-time";
import { PostBelongingLine } from "@/modules/blog/components/post-belonging-line";
import { BelongingProvider } from "@/modules/blog/components/post-belonging-context";
import { authorHref, postHref } from "@/modules/blog/lib/author-href";
import { contentLang } from "@/modules/blog/lib/content-lang";

export function FeedList({ children }: { children: ReactNode }) {
  return (
    <BelongingProvider>
      <ul className="flex max-w-2xl flex-col">{children}</ul>
    </BelongingProvider>
  );
}

function SeriesLine({
  item,
  series,
  locale,
}: {
  item: PublicFeedItem;
  series: NonNullable<PublicFeedItem["series"]>;
  locale: string;
}) {
  const t = useTranslations("publicFeed");
  return (
    <BlogLink
      href={authorHref(item.author.username, locale, `series/${series.slug}`)}
      data-testid="feed-card-series"
      className="focus-ring -mx-1 mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded px-1 py-1 text-meta text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
    >
      <Layers aria-hidden className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">
        {t("seriesEyebrow")} · <span lang={contentLang(series.title, item.languageTag)}>{series.title}</span>
      </span>
      <span aria-hidden>·</span>
      <span className="shrink-0 tabular-nums">{t("seriesEpisodeCount", { count: series.postCount })}</span>
    </BlogLink>
  );
}

function ReasonLabel({ reason }: { reason: NonNullable<PublicFeedItem["followReason"]> }) {
  const t = useTranslations("publicFeed");
  if (reason.kind === "AUTHOR") return null;
  return (
    <span className="truncate">
      {reason.kind === "TOPIC" ? t("feedReasonTopic", { tag: reason.tag ?? "" }) : t("feedReasonSeries")}
    </span>
  );
}

/** Loading placeholder shaped like a {@link FeedCard} list row — used while a client feed (following,
 *  search) fetches, so the transition reads as the same list filling in, not a blank gap. */
export function FeedListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul role="status" aria-busy className="flex max-w-2xl animate-pulse flex-col">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="border-b border-slate-100 py-4 last:border-b-0 dark:border-slate-800">
          <div className="h-3 w-14 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="mt-2.5 flex items-start gap-3.5 sm:gap-4">
            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="h-4 w-4/5 rounded bg-slate-200/80 dark:bg-slate-700/80" />
              <div className="h-3.5 w-full rounded bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="h-[72px] w-[72px] shrink-0 rounded-inner bg-slate-100 dark:bg-slate-800 sm:h-24 sm:w-24" />
          </div>
          <div className="mt-2.5 h-3 w-28 rounded bg-slate-100 dark:bg-slate-800" />
        </li>
      ))}
    </ul>
  );
}

export function FeedCard(props: ComponentProps<typeof FeedCardRow>) {
  return (
    <HideIfBlocked username={props.item.author.username}>
      <FeedCardRow {...props} />
    </HideIfBlocked>
  );
}

function FeedCardRow({
  item,
  locale,
  className,
  hideAuthor = false,
  flushTop = false,
  showBookmark = true,
  eager = false,
  entranceDelay,
}: {
  item: PublicFeedItem;
  locale: string;
  className?: string;
  hideAuthor?: boolean;
  flushTop?: boolean;
  showBookmark?: boolean;
  /** Above-fold row: load the thumbnail eagerly. Lazy thumbnails in the first viewport made the
   *  feed's LCP image wait for hydration — Lighthouse modeled that as LCP ≈ TTI. */
  eager?: boolean;
  /** Mount fade + stagger (ms) for rows appended by the infinite scroll.
   *  Left unset on the initial SSR rows so they never re-animate. */
  entranceDelay?: number;
}) {
  if (!isRenderablePost(item)) return null;
  const bookmarkable = showBookmark && typeof item.id === "number";
  // Representative tag = first DISPLAYABLE tag (skip junk — incomplete jamo, single-char, mash), so a
  // reading-surface row never surfaces "#ㄴ" / "#dddd" as its eyebrow.
  const eyebrowTag = item.tags.find(isDisplayableTag);
  const reason = item.followReason && item.followReason.kind !== "AUTHOR" ? item.followReason : null;

  return (
    <FeedRow
      href={postHref(item.author.username, item.slug, locale)}
      title={item.title}
      titleLang={contentLang(item.title, item.languageTag)}
      excerpt={item.excerpt}
      excerptLang={item.excerpt ? contentLang(item.excerpt, item.languageTag) : undefined}
      cover={item.ogImageUrl}
      eager={eager}
      readId={typeof item.id === "number" ? item.id : null}
      flushTop={flushTop}
      className={cn(entranceDelay != null && "animate-fade-in", className)}
      style={
        entranceDelay != null
          ? { animationDelay: `${entranceDelay}ms`, animationFillMode: "backwards" }
          : undefined
      }
      linkData={{ "data-bhv": "post", "data-bhv-id": `${item.author.username}/${item.slug}` }}
      top={
        (eyebrowTag || reason) && (
          <>
            {eyebrowTag && <span className="truncate font-medium">{eyebrowTag}</span>}
            {eyebrowTag && reason && <RowDot />}
            {reason && <ReasonLabel reason={reason} />}
          </>
        )
      }
      byline={
        <>
          {!hideAuthor && (
            <>
              <RowAuthor username={item.author.username} avatarUrl={item.author.avatarUrl} locale={locale} />
              <RowDot />
            </>
          )}
          <RowTime iso={item.publishedAt} locale={locale} className="shrink-0" />
          {bookmarkable && (
            <span className="-my-1.5 -mr-1.5 ml-auto">
              <FeedCardBookmark postId={item.id} username={item.author.username} slug={item.slug} />
            </span>
          )}
        </>
      }
      after={
        <>
          {item.series && item.series.postCount > 1 && (
            <SeriesLine item={item} series={item.series} locale={locale} />
          )}
          {typeof item.id === "number" && <PostBelongingLine postId={item.id} />}
        </>
      }
    />
  );
}
