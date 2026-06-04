"use client";

import { useEffect, useState } from "react";
import { Layers } from "lucide-react";
import { useTranslations } from "next-intl";
import { DATE_LOCALE } from "@/lib/date";
import { useAuth } from "@/lib/auth";
import { listSubscribedSeries } from "@/modules/blog/api/series-subscription";
import type { PublicSeriesCard } from "@/modules/blog/api/public-posts";
import { Mark } from "@/components/common/logo";
import { Avatar } from "@/modules/blog/components/avatar";
import { authorHref, FeedListSkeleton } from "@/modules/blog/components/feed-card";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { SeriesEpisodeList } from "@/modules/blog/components/series-episode-list";
import { SeriesSubscribeButton } from "@/modules/blog/components/series-subscribe-button";
import { ReadingShell } from "@/modules/blog/components/reading-shell";

/**
 * The home feed's "시리즈" tab — series the signed-in viewer subscribes to, latest active first.
 * Authenticated (subscriptions are per-user), so it fetches client-side with the access token, like
 * the 팔로잉 tab. Signed-out viewers get a sign-in prompt; no subscriptions yet → a quiet nudge.
 */
export function SubscribedSeriesFeed({ locale }: { locale: string }) {
  const t = useTranslations("publicFeed");
  const { ready, authenticated, signInWithGoogle } = useAuth();
  const [series, setSeries] = useState<PublicSeriesCard[] | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      setSeries([]);
      return;
    }
    let alive = true;
    listSubscribedSeries()
      .then((s) => alive && setSeries(s))
      .catch(() => alive && setSeries([]));
    return () => {
      alive = false;
    };
  }, [ready, authenticated]);

  if (!ready || series === null) {
    return (
      <ReadingShell>
        <FeedListSkeleton />
      </ReadingShell>
    );
  }

  if (!authenticated) {
    return (
      <ReadingShell>
        <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-16 text-center dark:border-slate-800">
          <Layers className="mx-auto h-7 w-7 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-[15px] font-medium text-slate-700 dark:text-slate-200">
            {t("seriesTabSignedOut")}
          </p>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="focus-ring mt-4 inline-flex items-center rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-700"
          >
            {t("seriesTabSignIn")}
          </button>
        </div>
      </ReadingShell>
    );
  }

  if (series.length === 0) {
    return (
      <ReadingShell>
        <p className="rounded-2xl border border-dashed border-slate-200 px-6 py-16 text-center text-sm text-slate-400 dark:border-slate-800 dark:text-slate-500">
          {t("seriesTabEmpty")}
        </p>
      </ReadingShell>
    );
  }

  // Backend returns the list latest-active-first, so series[0] is the freshest. But "freshest of a
  // stale set" isn't worth a hero — only feature the lead when its newest episode landed recently, so
  // a returning subscriber's eye goes straight to a series that actually has something new to read.
  const [lead, ...rest] = series;
  const featureLead = isRecent(lead.lastPublishedAt);

  return (
    <ReadingShell>
      <div className="flex flex-col gap-10 divide-y divide-slate-100 dark:divide-slate-800 [&>*:not(:first-child)]:pt-10">
        <SubscribedSeriesCard key={lead.id} series={lead} locale={locale} featured={featureLead} />
        {rest.map((s) => (
          <SubscribedSeriesCard key={s.id} series={s} locale={locale} />
        ))}
      </div>
    </ReadingShell>
  );
}

/** A series whose newest episode landed within the last two weeks reads as "actively updating". */
function isRecent(iso: string): boolean {
  const published = new Date(iso).getTime();
  if (Number.isNaN(published)) return false;
  return Date.now() - published < 14 * 24 * 60 * 60 * 1000;
}

/** Client mirror of SeriesFeedCard (the server card can't render inside this auth-gated client tab).
 *  `featured` promotes the freshly-updated lead series: a "최신 업데이트" eyebrow + a larger title. */
function SubscribedSeriesCard({
  series,
  locale,
  featured = false,
}: {
  series: PublicSeriesCard;
  locale: string;
  featured?: boolean;
}) {
  const t = useTranslations("publicFeed");
  const date = new Date(series.lastPublishedAt).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
    month: "long",
    day: "numeric",
  });
  const posts = series.posts ?? [];
  const seriesUrl = authorHref(series.author.username, locale, `series/${series.slug}`);

  return (
    <section className="group/series mark-hoverable" aria-label={series.title}>
      <div className="flex items-center justify-between gap-3">
        {featured ? (
          <BlogLink
            href={seriesUrl}
            className="focus-ring inline-flex items-center gap-1.5 rounded text-[12px] font-semibold tracking-wide text-accent-600 transition-colors hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300"
          >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent-500" />
            {t("seriesTabFreshBadge")}
          </BlogLink>
        ) : (
          <BlogLink
            href={seriesUrl}
            className="focus-ring inline-flex items-center gap-1.5 rounded text-[12px] font-semibold tracking-wide text-accent-700 transition-colors hover:text-accent-800 dark:text-accent-400 dark:hover:text-accent-300"
          >
            <Mark className="h-2.5 w-auto shrink-0" animated />
            {t("seriesEyebrow")}
          </BlogLink>
        )}
        <SeriesSubscribeButton seriesId={series.id} />
      </div>
      <BlogLink href={seriesUrl} className="focus-ring group/title mt-1 block rounded">
        <h3
          className={`line-clamp-2 font-bold leading-snug tracking-tight text-slate-900 transition-colors group-hover/title:text-accent-700 dark:text-slate-100 dark:group-hover/title:text-accent-400 ${
            featured ? "text-[24px] sm:text-[28px] sm:leading-[1.2]" : "text-[20px]"
          }`}
        >
          {series.title}
        </h3>
      </BlogLink>
      <SeriesEpisodeList
        authorUsername={series.author.username}
        locale={locale}
        posts={posts}
        postCount={series.postCount}
        seriesUrl={seriesUrl}
      />
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
