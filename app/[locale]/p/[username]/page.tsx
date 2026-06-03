import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { ReportButton } from "@/modules/blog/components/report-button";
import { FeedCard, FeedList, authorHref } from "@/modules/blog/components/feed-card";
import { AuthorRail } from "@/modules/blog/components/author-rail";
import { ReadingShell } from "@/modules/blog/components/reading-shell";
import { AuthorContentTransition } from "@/modules/blog/components/author-content-transition";
import { listPublicPosts, listPublicSeries } from "@/modules/blog/api/public-posts";
import { subdomainOrigin } from "@/modules/blog/lib/subdomain-origin";

// 30s ISR — author 발행 후 30 초 내 visitors 반영. Backend 가 어차피 매번 직접 조회.
export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const result = await listPublicPosts(username);
  if (!result.ok) return { title: `@${username}` };
  const { author } = result.data;
  const h = await headers();
  const origin = subdomainOrigin(h, username);
  return {
    title: `@${author.username}`,
    description: author.bio ?? undefined,
    alternates: {
      canonical: `${origin}/`,
      types: { "application/rss+xml": `${origin}/feed` },
    },
    openGraph: {
      title: `@${author.username}`,
      description: author.bio ?? undefined,
      url: `${origin}/`,
      images: author.avatarUrl ? [{ url: author.avatarUrl }] : undefined,
    },
  };
}

export default async function PublicProfileHomepage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; username: string }>;
  searchParams: Promise<{ tag?: string }>;
}) {
  const { locale, username } = await params;
  const { tag: rawTag } = await searchParams;
  const result = await listPublicPosts(username);
  if (!result.ok) notFound();

  const { author, posts } = result.data;
  const seriesResult = await listPublicSeries(username);
  const series = seriesResult.ok ? seriesResult.data.series : [];
  const t = await getTranslations({ locale, namespace: "publicPost" });

  // Tag filter is author-scoped: it narrows THIS author's posts (the rail links here with ?tag=),
  // never the cross-author topic feed. Keep the full list for the rail's tag/archive derivation.
  const activeTag = rawTag?.trim() || undefined;
  const visiblePosts = activeTag ? posts.filter((p) => p.tags.includes(activeTag)) : posts;

  // The author header (identity + tabs) is rendered once by the persistent layout (ProfileChrome) so
  // it never re-mounts on a tab switch; this page renders only its content column + rail.
  return (
      <ReadingShell
        className="mt-8"
        rail={
          posts.length > 0 ? (
            <AuthorRail
              username={author.username}
              locale={locale}
              posts={posts}
              series={series}
              activeTag={activeTag}
            />
          ) : undefined
        }
      >
        <AuthorContentTransition>
        {activeTag && (
          // Active tag filter banner — names the scope (this author's posts under #tag) and offers a
          // clear, never sending the reader off to the global topic feed.
          <div className="mb-5 flex items-center gap-2 text-[14px]">
            <span className="text-slate-500 dark:text-slate-400">{t("tagFilterLabel")}</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">#{activeTag}</span>
            <a
              href={authorHref(author.username, locale)}
              className="focus-ring ml-1 rounded text-[13px] font-medium text-accent-600 transition-colors hover:text-accent-700 dark:text-accent-400"
            >
              {t("tagFilterClear")}
            </a>
          </div>
        )}

        {posts.length === 0 ? (
          <p className="text-slate-500">{t("emptyPosts")}</p>
        ) : visiblePosts.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400">{t("tagFilterEmpty", { tag: activeTag ?? "" })}</p>
        ) : (
          // Same list card + wrapper as the feed; single-author surface so the author is hidden. The
          // first row gets flushTop (like the feed / following feed) so it sits tight under the tabs
          // instead of floating below an empty band. With a tag filter the banner leads, so don't flush.
          <FeedList>
            {visiblePosts.map((p, i) => (
              <FeedCard
                key={p.slug}
                hideAuthor
                flushTop={i === 0 && !activeTag}
                item={{ ...p, author, viewCount: 0 }}
                locale={locale}
              />
            ))}
          </FeedList>
        )}

        <footer className="mt-16 flex justify-end border-t border-slate-100 pt-8 dark:border-slate-800">
          <ReportButton subjectType="USER" subjectId={author.id} />
        </footer>
        </AuthorContentTransition>
      </ReadingShell>
  );
}
