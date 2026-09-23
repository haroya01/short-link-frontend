import { DATE_LOCALE } from "@/lib/date";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ArrowRight, Link2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { linksHref } from "@/lib/host";
import { SwitchLink } from "@/components/common/switch-link";
import { listPublicPosts, listPublicSeries } from "@/modules/blog/api/public-posts";
import { authorHref } from "@/modules/blog/components/feed-card";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { AuthorRail } from "@/modules/blog/components/author-rail";
import { RailHeading } from "@/modules/blog/components/rail-heading";
import { ReadingShell } from "@/modules/blog/components/reading-shell";
import { AuthorContentTransition } from "@/modules/blog/components/author-content-transition";
import { authorSectionMetadata } from "@/modules/blog/lib/author-section-metadata";

export const revalidate = 30;


export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  // 존재하지 않는 작가는 여기서 404 를 확정한다 — 페이지의 notFound() 만으로는 레이아웃 스트리밍이
  // 먼저 커밋돼 HTTP 200 으로 나가는 soft-404 가 된다(같은 이유는 [slug]/page.tsx 참조).
  const result = await listPublicPosts(username);
  if (!result.ok && result.status === 404) notFound();
  return authorSectionMetadata(
    await headers(), username, "about", result.ok ? result.data.author.bio : null,
  );
}

export default async function PublicAuthorAboutPage({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { locale, username } = await params;
  const result = await listPublicPosts(username);
  // 순단("error")을 404 로 위장하지 않는다 — 진짜 404 만 notFound(), 나머지는 에러 경계로.
  if (!result.ok) {
    if (result.status !== 404) throw new Error(`public posts fetch failed: ${username}`);
    notFound();
  }
  const { author, posts } = result.data;
  const seriesResult = await listPublicSeries(username);
  const series = seriesResult.ok ? seriesResult.data.series : [];
  const t = await getTranslations({ locale, namespace: "publicPost" });

  const dateLocale = DATE_LOCALE[locale] ?? "ko-KR";
  const since =
    posts.length > 0
      ? new Date(Math.min(...posts.map((p) => new Date(p.publishedAt).getTime())))
      : null;
  const sinceLabel = since
    ? since.toLocaleDateString(dateLocale, { year: "numeric", month: "long", timeZone: "Asia/Seoul" })
    : "";


  // Header lives in the persistent layout (ProfileChrome) — this page renders only its content.
  return (
      <ReadingShell
        className="mt-4 sm:mt-8"
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
              <SwitchLink
                href={linksHref(`/${locale}/u/${author.username}`)}
                icon={Link2}
                size="md"
                className="mt-6"
              >
                {t("aboutViewProfile")}
              </SwitchLink>
            )}
          </section>

          {posts.length > 0 && (
            <>
              {since && (
                <p className="mt-10 border-t border-slate-100 pt-6 text-[13px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  {t("aboutSince", { date: sinceLabel })}
                </p>
              )}

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
