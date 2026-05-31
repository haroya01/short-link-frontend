import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { listPublicPosts, listPublicSeries } from "@/modules/blog/api/public-posts";
import { authorHref } from "@/modules/blog/components/feed-card";
import { AuthorRail } from "@/modules/blog/components/author-rail";
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
        className="mt-8"
        rail={
          posts.length > 0 ? (
            <AuthorRail username={author.username} locale={locale} posts={posts} series={series} />
          ) : undefined
        }
      >
        {author.bio ? (
          <p className="whitespace-pre-line text-[17px] leading-[1.8] text-slate-700">{author.bio}</p>
        ) : (
          <p className="text-[15px] leading-relaxed text-slate-500">{t("aboutEmpty")}</p>
        )}

        <div className="mt-8 flex items-center gap-4 border-t border-slate-100 pt-6 text-[13px] text-slate-500">
          <span>{t("postCount", { count: posts.length })}</span>
          {posts.length > 0 && (
            <a
              href={authorHref(author.username, locale)}
              className="group ml-auto inline-flex items-center gap-1 rounded font-medium text-accent-700 transition-colors hover:text-accent-800 focus-ring"
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
