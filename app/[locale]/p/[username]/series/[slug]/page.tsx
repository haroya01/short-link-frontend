import { DATE_LOCALE } from "@/lib/date";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { findPublicSeries } from "@/modules/blog/api/public-posts";
import { Mark } from "@/components/common/logo";
import { authorHref } from "@/modules/blog/components/feed-card";
import { Avatar } from "@/modules/blog/components/avatar";
import { FollowButton } from "@/modules/blog/components/follow-button";
import { RailHeading } from "@/modules/blog/components/rail-heading";
import { SeriesReadingShell } from "@/modules/blog/components/series-reading-shell";
import { SeriesSubscribeButton } from "@/modules/blog/components/series-subscribe-button";
import { BlogLink } from "@/modules/blog/components/blog-link";

// Always render fresh — same reasoning as the post detail page: never serve a stale 404 for a
// just-published series. findPublicSeries fetches no-store to match.
export const dynamic = "force-dynamic";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}): Promise<Metadata> {
  const { username, slug } = await params;
  const result = await findPublicSeries(username, slug);
  if (!result.ok) return { title: `@${username}` };
  return { title: `${result.data.series.title} · @${result.data.author.username}` };
}

export default async function PublicSeriesPage({
  params,
}: {
  params: Promise<{ locale: string; username: string; slug: string }>;
}) {
  const { locale, username, slug } = await params;
  const result = await findPublicSeries(username, slug);
  const t = await getTranslations({ locale, namespace: "publicPost" });
  const tf = await getTranslations({ locale, namespace: "publicFeed" });
  if (!result.ok) notFound();

  const { author, series, posts } = result.data;
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  // Series order ≠ publish order, so derive the latest publish for the header summary.
  const lastPublished = posts.reduce<string | null>(
    (max, p) => (max === null || p.publishedAt > max ? p.publishedAt : max),
    null,
  );
  const profileHref = authorHref(author.username, locale);

  // Left gutter: who this series belongs to — avatar + handle (→ profile) + bio + follow, and a way
  // back to the rest of their series. Replaces the old "← 시리즈" link, which masqueraded as browser
  // back but always dumped you on the author's series tab regardless of where you arrived from.
  const authorRail = (
    <div className="flex flex-col gap-4">
      <RailHeading>{tf("seriesByAuthor")}</RailHeading>
      <BlogLink href={profileHref} className="focus-ring group flex items-center gap-3 rounded-lg">
        <Avatar src={author.avatarUrl} name={author.username} size="lg" />
        <span className="min-w-0 text-[15px] font-semibold text-slate-900 transition-colors group-hover:text-accent-700 dark:text-slate-100 dark:group-hover:text-accent-400">
          @{author.username}
        </span>
      </BlogLink>
      {author.bio && (
        <p className="text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{author.bio}</p>
      )}
      <FollowButton username={author.username} initialFollowerCount={0} compact />
      <BlogLink
        href={authorHref(author.username, locale, "series")}
        className="focus-ring inline-flex w-fit items-center gap-1 rounded text-[13px] font-medium text-slate-500 dark:text-slate-400 transition-colors hover:text-accent-700 dark:hover:text-accent-400"
      >
        {tf("seriesAllByAuthor")}
        <ArrowRight className="h-3.5 w-3.5" />
      </BlogLink>
    </div>
  );

  const header = (
    <header>
          <div className="flex items-center gap-1.5 text-[12px] font-semibold tracking-wide text-accent-700 dark:text-accent-400">
            {/* Mark draws itself in when the series page loads — shared entrance with the on-post banner. */}
            <Mark animated className="mark-draw-in h-2.5 w-auto shrink-0" />
            {tf("seriesEyebrow")}
          </div>
          {/* Title + subscribe on one row — 구독 is the series equivalent of following the author
              (author follow lives in the rail), so it sits with the series identity, not buried. */}
          <div className="mt-1.5 flex items-start justify-between gap-4">
            <h1 className="font-serif text-headline-sm font-semibold tracking-display text-slate-900 dark:text-slate-100 sm:text-headline-md">
              {series.title}
            </h1>
            <div className="mt-1 shrink-0">
              <SeriesSubscribeButton seriesId={series.id} />
            </div>
          </div>
          {/* Author (→ profile) + count + last-published, lifted to the header so the heart/date
              context reads at a glance instead of being buried per-row. */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400">
            <BlogLink
              href={profileHref}
              className="focus-ring group flex items-center gap-2 rounded transition-colors hover:text-accent-700 dark:hover:text-accent-400"
            >
              <Avatar src={author.avatarUrl} name={author.username} size="xs" />
              <span className="font-medium text-slate-700 group-hover:text-accent-700 dark:text-slate-300 dark:group-hover:text-accent-400">
                {author.username}
              </span>
            </BlogLink>
            <span aria-hidden>·</span>
            <span>{tf("seriesEpisodeCount", { count: series.postCount })}</span>
            {lastPublished && (
              <>
                <span aria-hidden>·</span>
                <span>{tf("seriesLastPublished", { date: fmtDate(lastPublished) })}</span>
              </>
            )}
          </div>
          {/* The left rail (author follow + 모든 시리즈) is xl-only, so surface both here for <xl too —
              else mobile readers can 구독 the series but never follow the author or reach their other
              series. Hidden on xl where the rail carries it. */}
          <div className="mt-4 flex flex-wrap items-center gap-3 xl:hidden">
            <FollowButton username={author.username} initialFollowerCount={0} compact />
            <BlogLink
              href={authorHref(author.username, locale, "series")}
              className="focus-ring inline-flex w-fit items-center gap-1 rounded text-[13px] font-medium text-slate-500 dark:text-slate-400 transition-colors hover:text-accent-700 dark:hover:text-accent-400"
            >
              {tf("seriesAllByAuthor")}
              <ArrowRight className="h-3.5 w-3.5" />
            </BlogLink>
          </div>
    </header>
  );

  // Left gutter = author card, right gutter = 태그 + 아카이브 filters, center = the episodes. The shell
  // is client-orchestrated so the right-rail filters and the list share one filter state (see comment
  // there); the header + author card are server-rendered and passed in as held nodes.
  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 sm:py-16">
      <SeriesReadingShell
        leftRail={authorRail}
        header={header}
        posts={posts}
        username={author.username}
        locale={locale}
      />
    </main>
  );
}
