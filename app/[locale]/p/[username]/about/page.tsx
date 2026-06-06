import { DATE_LOCALE } from "@/lib/date";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, Link2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { linksHref } from "@/lib/host";
import { listPublicPosts, listPublicSeries } from "@/modules/blog/api/public-posts";
import { authorHref } from "@/modules/blog/components/feed-card";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { AuthorRail } from "@/modules/blog/components/author-rail";
import { RailHeading } from "@/modules/blog/components/rail-heading";
import { ReadingShell } from "@/modules/blog/components/reading-shell";
import { AuthorContentTransition } from "@/modules/blog/components/author-content-transition";

export const revalidate = 30;


export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `About · @${username}` };
}

export default async function PublicAuthorAboutPage({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { locale, username } = await params;
  const result = await listPublicPosts(username);
  if (!result.ok) notFound();
  const { author, posts } = result.data;
  const seriesResult = await listPublicSeries(username);
  const series = seriesResult.ok ? seriesResult.data.series : [];
  const t = await getTranslations({ locale, namespace: "publicPost" });

  const dateLocale = DATE_LOCALE[locale] ?? "ko-KR";
  const totalLikes = posts.reduce((sum, p) => sum + p.likeCount, 0);
  const since =
    posts.length > 0
      ? new Date(Math.min(...posts.map((p) => new Date(p.publishedAt).getTime())))
      : null;
  const sinceLabel = since
    ? since.toLocaleDateString(dateLocale, { year: "numeric", month: "long" })
    : "";

  // The about surface's at-a-glance numbers — derived purely from the post/series lists. Likes use the
  // brand's "공감" term to stay in the same vocabulary as the cards.
  const stats = [
    { value: posts.length, label: t("statPosts") },
    { value: series.length, label: t("statSeries") },
    { value: totalLikes, label: t("statLikes") },
  ];

  // Header lives in the persistent layout (ProfileChrome) — this page renders only its content.
  return (
      <ReadingShell
        className="mt-8"
        rail={
          posts.length > 0 ? (
            <AuthorRail username={author.username} locale={locale} posts={posts} series={series} />
          ) : undefined
        }
      >
        <AuthorContentTransition>
          {/* Intro — the bio leads, set larger than a post body so it reads as a personal statement. */}
          <section>
            <RailHeading className="mb-4">{t("aboutIntro")}</RailHeading>
            {author.bio ? (
              <p className="whitespace-pre-line text-[18px] leading-[1.85] text-slate-700 dark:text-slate-300">
                {author.bio}
              </p>
            ) : (
              <p className="text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
                {t("aboutEmpty")}
              </p>
            )}

            {/* Jump to the same person's link-in-bio (separate product, shared identity). */}
            {author.hasLinkInBio && (
              <a
                href={linksHref(`/${locale}/u/${author.username}`)}
                className="focus-ring mt-6 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-[14px] font-medium text-slate-700 transition-colors hover:border-accent-300 hover:text-accent-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-accent-500/50 dark:hover:text-accent-400"
              >
                <Link2 className="h-4 w-4" />
                {t("aboutViewProfile")}
              </a>
            )}
          </section>

          {posts.length > 0 && (
            <>
              {/* At-a-glance stats — big numerals, quiet labels; a sense of the body of work. */}
              <section className="mt-12 border-t border-slate-100 pt-8 dark:border-slate-800">
                <dl className="grid grid-cols-3 gap-6">
                  {stats.map((s) => (
                    <div key={s.label}>
                      <dd className="text-[28px] font-bold leading-none tracking-tight text-slate-900 tabular-nums dark:text-slate-100">
                        {s.value.toLocaleString(dateLocale)}
                      </dd>
                      <dt className="mt-1.5 text-[13px] text-slate-500 dark:text-slate-400">
                        {s.label}
                      </dt>
                    </div>
                  ))}
                </dl>
                {since && (
                  <p className="mt-5 text-[13px] text-slate-500 dark:text-slate-400">
                    {t("aboutSince", { date: sinceLabel })}
                  </p>
                )}
              </section>

              <div className="mt-10 flex justify-end">
                <BlogLink
                  href={authorHref(author.username, locale)}
                  className="group inline-flex items-center gap-1 rounded font-medium text-accent-700 transition-colors hover:text-accent-800 focus-ring dark:text-accent-400"
                >
                  {t("aboutViewPosts")}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
                </BlogLink>
              </div>
            </>
          )}
        </AuthorContentTransition>
      </ReadingShell>
  );
}
