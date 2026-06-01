import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, Link2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { linksHref } from "@/lib/host";
import { listPublicPosts, listPublicSeries } from "@/modules/blog/api/public-posts";
import { authorHref } from "@/modules/blog/components/feed-card";
import { AuthorRail } from "@/modules/blog/components/author-rail";
import { ContributionGraph } from "@/modules/blog/components/contribution-graph";
import { ReadingShell } from "@/modules/blog/components/reading-shell";
import { AuthorHeader } from "../_components/author-header";

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

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <AuthorHeader author={author} active="about" />
      </div>

      {/* Same centered column + author rail as the posts tab, so the author surface reads as one piece. */}
      <ReadingShell
        className="mt-8 author-tab-enter"
        rail={
          posts.length > 0 ? (
            <AuthorRail username={author.username} locale={locale} posts={posts} series={series} />
          ) : undefined
        }
      >
        {author.bio ? (
          <p className="whitespace-pre-line text-[17px] leading-[1.8] text-slate-700 dark:text-slate-300">
            {author.bio}
          </p>
        ) : (
          <p className="text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">{t("aboutEmpty")}</p>
        )}

        {/* Jump to the same person's link-in-bio (separate product, shared identity). The header
            carries this too, but it belongs here in the bio where a reader is learning who they are. */}
        {author.hasLinkInBio && (
          <a
            href={linksHref(`/${locale}/u/${author.username}`)}
            className="focus-ring mt-6 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-[14px] font-medium text-slate-700 transition-colors hover:border-accent-300 hover:text-accent-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-accent-500/50 dark:hover:text-accent-400"
          >
            <Link2 className="h-4 w-4" />
            {t("aboutViewProfile")}
          </a>
        )}

        {posts.length > 0 && (
          <div className="mt-10 border-t border-slate-100 pt-8 dark:border-slate-800">
            <ContributionGraph posts={posts} locale={locale} />
          </div>
        )}

        <div className="mt-8 flex items-center gap-4 border-t border-slate-100 pt-6 text-[13px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span>{t("postCount", { count: posts.length })}</span>
          {posts.length > 0 && (
            <a
              href={authorHref(author.username, locale)}
              className="group ml-auto inline-flex items-center gap-1 rounded font-medium text-accent-700 transition-colors hover:text-accent-800 focus-ring dark:text-accent-400"
            >
              {t("tabPosts")}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
            </a>
          )}
        </div>
      </ReadingShell>
    </main>
  );
}
