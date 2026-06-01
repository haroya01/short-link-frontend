import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Heart } from "lucide-react";
import { findPublicSeries } from "@/modules/blog/api/public-posts";
import { Mark } from "@/components/common/logo";
import { authorHref, postHref } from "@/modules/blog/components/feed-card";
import { FeedCardBookmark } from "@/modules/blog/components/feed-card-bookmark";
import { showLikes } from "@/modules/blog/lib/public-metrics";

// Always render fresh — same reasoning as the post detail page: never serve a stale 404 for a
// just-published series. findPublicSeries fetches no-store to match.
export const dynamic = "force-dynamic";

const DATE_LOCALE: Record<string, string> = { ko: "ko-KR", ja: "ja-JP", en: "en-US" };

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

  return (
    <main className="mx-auto max-w-2xl px-6 py-14 sm:py-20">
      <a
        href={authorHref(username, locale, "series")}
        className="inline-flex items-center gap-1.5 rounded text-sm text-slate-500 transition-colors hover:text-accent-700 focus-ring dark:text-slate-400 dark:hover:text-accent-400"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("tabSeries")}
      </a>

      <header className="mt-6">
        <div className="flex items-center gap-1.5 text-[12px] font-semibold tracking-wide text-accent-700 dark:text-accent-400">
          <Mark className="h-2.5 w-auto shrink-0" />
          {tf("seriesEyebrow")}
        </div>
        <h1 className="mt-1.5 text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
          {series.title}
        </h1>
        {/* Author + count + last-published, lifted to the header so the heart/date context reads at a
            glance instead of being buried per-row. */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400">
          {author.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={author.avatarUrl} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-100 text-[10px] font-semibold text-accent-700">
              {author.username.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="font-medium text-slate-700 dark:text-slate-300">{author.username}</span>
          <span aria-hidden>·</span>
          <span>{tf("seriesEpisodeCount", { count: series.postCount })}</span>
          {lastPublished && (
            <>
              <span aria-hidden>·</span>
              <span>{tf("seriesLastPublished", { date: fmtDate(lastPublished) })}</span>
            </>
          )}
        </div>
      </header>

      <div className="section-divider my-10" />

      {/* Cascade in from the top — the run reveals itself episode by episode. Rows are divided (칸
          구분) and carry a cover thumbnail (when present) + a save toggle, like the feed cards. */}
      <ol className="divide-y divide-slate-100 dark:divide-slate-800">
        {posts.map((p, i) => {
          const hasImage = Boolean(p.ogImageUrl);
          return (
            <li
              key={p.slug}
              className="profile-fade group/row relative"
              style={{ ["--idx" as string]: i } as React.CSSProperties}
            >
              <a
                href={postHref(author.username, p.slug, locale)}
                className="-mx-3 flex items-start gap-3 rounded-xl px-3 py-4 transition-colors hover:bg-slate-50 focus-ring dark:hover:bg-slate-800/40 sm:gap-4"
              >
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-50 text-[13px] font-semibold text-accent-700 dark:bg-accent-500/15 dark:text-accent-300">
                  {i + 1}
                </span>
                {/* No-image rows reserve a right gutter so the title never runs under the save toggle. */}
                <span className={`min-w-0 flex-1 ${hasImage ? "" : "pr-9"}`}>
                  <span className="block text-[17px] font-semibold leading-snug text-slate-900 transition-colors group-hover/row:text-accent-700 dark:text-slate-100 dark:group-hover/row:text-accent-400">
                    {p.title}
                  </span>
                  {/* Date · ♥ lifted directly under the title so it reads before the excerpt. */}
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
                <FeedCardBookmark postId={p.id} username={author.username} slug={p.slug} />
              </div>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
